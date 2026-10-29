import {
  api,
  ClassroomApiError,
  backendUrl,
  type ConnectOptions,
  type RealtimeVoiceService,
  type VoiceContext,
  type VoiceEvent,
} from "./types";

export class QwenRealtimeAdapter implements RealtimeVoiceService {
  private ws?: WebSocket;
  private stream?: MediaStream;
  private audio?: AudioContext;
  private capture?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private silent?: GainNode;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private muted = false;
  private closed = false;
  private rejectPending?: (e: Error) => void;
  private timer?: ReturnType<typeof setTimeout>;
  private onEvent?: (event: VoiceEvent) => void;
  private acceptingAudio = true;
  private sending = false;
  async connect(options: ConnectOptions) {
    this.onEvent = options.onEvent;
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      !window.AudioWorkletNode
    )
      throw new Error(
        "当前浏览器不支持安全麦克风或 AudioWorklet，请使用 HTTPS 下的新版 Chrome/Edge/Safari。",
      );
    try {
      // Resume synchronously within the user's button gesture, before awaiting network/permission.
      this.audio = new AudioContext({ sampleRate: 16000 });
      await this.audio.resume();
      if (this.closed) return;
      const accessToken = options.authorize
        ? await options.authorize()
        : options.token;
      if (this.closed) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (this.closed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      stream.getAudioTracks().forEach((t) => {
        t.onended = () => this.fail("麦克风已断开，请检查设备后重新连接。");
      });
      await this.audio!.audioWorklet.addModule(
        new URL("./capture.worklet.js", import.meta.url).href,
      );
      if (this.closed) return;
      this.capture = new AudioWorkletNode(this.audio!, "pcm-capture");
      this.capture.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
        if (
          this.closed ||
          this.muted ||
          !this.sending ||
          this.ws?.readyState !== WebSocket.OPEN
        )
          return;
        if (this.ws!.bufferedAmount > 128000)
          return this.fail("音频网络拥塞，已停止录音，请重新连接。");
        let binary = "";
        for (const b of new Uint8Array(data)) binary += String.fromCharCode(b);
        this.send({ type: "audio", audio: btoa(binary) });
      };
      this.source = this.audio!.createMediaStreamSource(stream);
      this.silent = this.audio!.createGain();
      this.silent.gain.value = 0;
      this.source.connect(this.capture);
      this.capture.connect(this.silent);
      this.silent.connect(this.audio!.destination);
      let ticket;
      try {
        ticket = await api(options.base, "/api/voice/ticket", accessToken, {
          provider: "qwen",
          context: options.context,
        });
      } catch (error) {
        if (
          !(error instanceof ClassroomApiError) ||
          error.status !== 401 ||
          !options.authorize
        )
          throw error;
        const renewed = await options.authorize(true);
        ticket = await api(options.base, "/api/voice/ticket", renewed, {
          provider: "qwen",
          context: options.context,
        });
      }
      if (this.closed) return;
      const url = new URL(
        backendUrl(options.base, "/api/voice/socket"),
        window.location.origin,
      );
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.searchParams.set("ticket", ticket.ticket);
      const ws = new WebSocket(url);
      this.ws = ws;
      await new Promise<void>((resolve, reject) => {
        this.rejectPending = reject;
        this.timer = setTimeout(
          () => this.fail("语音会话连接超时，请重试。"),
          18000,
        );
        ws.onmessage = ({ data }) => {
          if (this.closed) return;
          let e: VoiceEvent;
          try {
            e = JSON.parse(data);
          } catch {
            this.fail("语音服务返回格式错误。");
            return;
          }
          if (e.type === "error") {
            this.fail(e.message || "语音连接失败。");
            return;
          }
          if (e.type === "ready") {
            clearTimeout(this.timer);
            this.rejectPending = undefined;
            this.sending = true;
            resolve();
          }
          if (e.type === "interrupted") {
            this.stopPlayback();
            this.acceptingAudio = false;
          }
          if (e.type === "response-started") this.acceptingAudio = true;
          if (
            e.type === "audio" &&
            e.audio &&
            !this.muted &&
            this.acceptingAudio
          )
            this.play(e.audio);
          this.onEvent?.(e);
        };
        ws.onerror = () => this.fail("语音网络连接失败，请稍后重试。");
        ws.onclose = () => {
          if (!this.closed) this.fail("语音连接已断开，请点击重新连接。");
        };
      });
      if (this.closed) return;
    } catch (e) {
      this.disconnect();
      if (
        e instanceof DOMException &&
        ["NotAllowedError", "PermissionDeniedError"].includes(e.name)
      )
        throw new Error("麦克风权限被拒绝，请在浏览器网站权限中允许后重试。");
      if (e instanceof DOMException && e.name === "NotFoundError")
        throw new Error("未找到麦克风，请连接设备后重试。");
      throw e;
    }
  }
  private fail(message: string) {
    if (this.closed) return;
    const reject = this.rejectPending;
    this.rejectPending = undefined;
    this.disconnect();
    reject?.(new Error(message));
    this.onEvent?.({ type: "error", message });
  }
  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify(data));
  }
  private play(base64: string) {
    const audio = this.audio;
    if (!audio || audio.state !== "running")
      return this.fail("音频播放已暂停，请重新连接以恢复声音。");
    try {
      const raw = atob(base64);
      if (!raw.length || raw.length % 2 || raw.length > 480000)
        return this.fail("语音音频格式无效。");
      const buffer = audio.createBuffer(1, raw.length / 2, 24000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        let value = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
        if (value >= 32768) value -= 65536;
        channel[i] = value / 32768;
      }
      if (this.nextTime - audio.currentTime > 8)
        return this.fail("语音播放积压，已停止会话，请重试。");
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(audio.destination);
      this.sources.add(source);
      source.onended = () => {
        this.sources.delete(source);
        if (!this.sources.size && !this.closed)
          this.onEvent?.({ type: "playback-ended" });
      };
      const start = Math.max(audio.currentTime + 0.02, this.nextTime);
      source.start(start);
      this.nextTime = start + buffer.duration;
    } catch {
      this.fail("语音播放失败，请检查浏览器音频设置。");
    }
  }
  private stopPlayback() {
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    if (muted) this.stopPlayback();
    this.send({ type: "mute", muted });
  }
  updateContext(context: VoiceContext) {
    this.send({ type: "context", context });
  }
  disconnect() {
    if (this.closed) return;
    this.closed = true;
    this.sending = false;
    clearTimeout(this.timer);
    const reject = this.rejectPending;
    this.rejectPending = undefined;
    reject?.(new Error("语音连接已取消。"));
    this.capture?.disconnect();
    this.source?.disconnect();
    this.silent?.disconnect();
    this.stream?.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    this.stopPlayback();
    if (this.audio && this.audio.state !== "closed") void this.audio.close();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
    }
  }
}
export class DoubaoRealtimeAdapter implements RealtimeVoiceService {
  async connect() {
    throw new Error("未配置：豆包实时语音尚未接入。");
  }
  disconnect() {}
  setMuted() {}
  updateContext() {}
}
export class OpenAIRealtimeAdapter implements RealtimeVoiceService {
  async connect() {
    throw new Error("未配置：OpenAI Realtime 尚未接入。");
  }
  disconnect() {}
  setMuted() {}
  updateContext() {}
}
