import { decodePcm, pcmLevel, pcmClip } from "./audio";
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
  private responseHasAudio = false;
  private sending = false;
  private replaying = false;
  private heldAudio: string[] = [];
  private heldBytes = 0;
  private heldBuffers: { buffer: AudioBuffer; offset: number }[] = [];
  private sourceStarts = new Map<AudioBufferSourceNode, number>();
  private silence = btoa(String.fromCharCode(...new Uint8Array(1280)));
  private inputRing: Uint8Array[] = [];
  private inputSegment: {
    id: string;
    chunks: Uint8Array[];
    bytes: number;
  } | null = null;
  private outputSegments = new Map<
    string,
    { chunks: Uint8Array[]; bytes: number }
  >();
  private meterAt = 0;
  private pendingInput: { blob: Blob; duration: number } | null = null;
  private outputItemId: string | undefined;
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
      this.audio = new AudioContext();
      await this.audio.resume();
      if (this.closed) return;
      this.audio.onstatechange = () => {
        if (this.audio?.state === "running") this.drainHeld();
        if (!this.closed && this.sending)
          this.onEvent?.({
            type:
              this.audio?.state === "running"
                ? "audio-resumed"
                : "audio-paused",
          });
      };
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
      this.capture.onprocessorerror = () =>
        this.fail("麦克风处理已停止，请重新连接。");
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
        if (this.replaying) {
          this.send({ type: "audio", audio: this.silence });
          return;
        }
        const bytes = new Uint8Array(data);
        this.inputRing.push(bytes);
        if (this.inputRing.length > 250) this.inputRing.shift();
        if (
          this.inputSegment &&
          this.inputSegment.bytes + bytes.length <= 960000
        ) {
          this.inputSegment.chunks.push(bytes);
          this.inputSegment.bytes += bytes.length;
        }
        if (performance.now() - this.meterAt > 200) {
          this.meterAt = performance.now();
          this.onEvent?.({ type: "input-level", level: pcmLevel(bytes) });
        }
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
          openingText: options.openingText,
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
          openingText: options.openingText,
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
            if (this.audio?.state !== "running")
              this.onEvent?.({ type: "audio-paused" });
            resolve();
          }
          // Older deployed relays supply item IDs on captions but not on audio/VAD events.
          if ((e.type === "subtitle" || e.type === "subtitle-delta") && e.id) {
            if (e.speaker === "Emma") {
              this.outputItemId = e.id;
              const waiting = this.outputSegments.get("current");
              if (waiting) {
                this.outputSegments.delete("current");
                this.outputSegments.set(e.id, waiting);
              }
            } else if (e.speaker === "在在") {
              if (this.inputSegment?.id === "current")
                this.inputSegment.id = e.id;
              if (this.pendingInput) {
                const clip = this.pendingInput;
                this.pendingInput = null;
                this.onEvent?.({
                  type: "clip",
                  speaker: "在在",
                  id: e.id,
                  clip: clip.blob,
                  duration: clip.duration,
                });
              }
            }
          }
          if (e.type === "interrupted") {
            this.finishInput();
            this.finishOutput();
            const chunks = this.inputRing.slice(-50);
            this.inputSegment = {
              id: e.id || "current",
              chunks: [...chunks],
              bytes: chunks.reduce((n, b) => n + b.length, 0),
            };
            this.stopPlayback();
            this.acceptingAudio = false;
          }
          if (e.type === "thinking") this.finishInput(e.id);
          if (e.type === "audio-complete" || e.type === "turn-ended")
            this.finishOutput(e.id);
          if (e.type === "subtitle" && e.speaker === "在在" && e.final)
            this.finishInput(e.id);
          if (e.type === "response-started") {
            this.acceptingAudio = true;
            this.responseHasAudio = false;
            this.outputItemId = undefined;
          }
          if (
            e.type === "turn-ended" &&
            this.acceptingAudio &&
            !this.muted &&
            !this.responseHasAudio
          )
            this.onEvent?.({
              type: "notice",
              message: "这次未收到 Emma 的语音，请再说一句，或断开后重新连接。",
            });
          if (
            e.type === "audio" &&
            e.audio &&
            !this.muted &&
            this.acceptingAudio
          ) {
            try {
              this.responseHasAudio = true;
              const bytes = decodePcm(e.audio),
                id = e.id || this.outputItemId || "current";
              const segment = this.outputSegments.get(id) || {
                chunks: [],
                bytes: 0,
              };
              if (segment.bytes + bytes.length <= 2400000) {
                segment.chunks.push(bytes);
                segment.bytes += bytes.length;
                this.outputSegments.set(id, segment);
              }
              if (this.replaying || this.audio?.state !== "running") {
                this.heldBytes += bytes.length;
                if (this.heldBytes > 960000) {
                  this.fail("回复等待播放过久，请重新连接。");
                  return;
                }
                this.heldAudio.push(e.audio);
                if (!this.replaying) this.onEvent?.({ type: "audio-paused" });
              } else this.play(e.audio);
            } catch {
              this.fail("语音音频格式无效。");
              return;
            }
          }
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
  private finishInput(id?: string) {
    const segment = this.inputSegment;
    if (!segment || (id && id !== segment.id)) return;
    this.inputSegment = null;
    if (segment.bytes) {
      const clip = pcmClip(segment.chunks, 16000);
      if (segment.id === "current") {
        this.pendingInput = clip;
        return;
      }
      this.onEvent?.({
        type: "clip",
        speaker: "在在",
        id: segment.id,
        clip: clip.blob,
        duration: clip.duration,
      });
    }
  }
  private finishOutput(id?: string) {
    for (const [key, segment] of [...this.outputSegments]) {
      if (id && key !== id) continue;
      this.outputSegments.delete(key);
      if (segment.bytes) {
        const clip = pcmClip(segment.chunks, 24000);
        this.onEvent?.({
          type: "clip",
          speaker: "Emma",
          id: key,
          clip: clip.blob,
          duration: clip.duration,
        });
      }
    }
  }
  recentRecording() {
    return this.inputRing.length ? pcmClip(this.inputRing, 16000) : null;
  }
  async resumeAudio() {
    if (this.audio && this.audio.state !== "closed") {
      await this.audio.resume();
      this.drainHeld();
      this.onEvent?.({ type: "audio-resumed" });
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
    if (!audio || audio.state !== "running") {
      this.onEvent?.({ type: "audio-paused" });
      return;
    }
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
      if (this.nextTime - audio.currentTime > 20)
        return this.fail("语音播放积压，已停止会话，请重试。");
      this.schedule(buffer);
    } catch {
      this.fail("语音播放失败，请检查浏览器音频设置。");
    }
  }
  private schedule(buffer: AudioBuffer, offset = 0) {
    const audio = this.audio;
    if (!audio || audio.state !== "running") return;
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    const start = Math.max(audio.currentTime + 0.02, this.nextTime);
    this.sources.add(source);
    this.sourceStarts.set(source, start - offset);
    source.onended = () => {
      this.sources.delete(source);
      this.sourceStarts.delete(source);
      if (!this.sources.size && !this.closed)
        this.onEvent?.({ type: "playback-ended" });
    };
    source.start(start, offset);
    this.nextTime = start + buffer.duration - offset;
    this.onEvent?.({ type: "playback-started" });
  }
  private drainHeld() {
    if (
      this.replaying ||
      this.muted ||
      this.closed ||
      this.audio?.state !== "running"
    )
      return;
    const buffers = this.heldBuffers;
    this.heldBuffers = [];
    const audio = this.heldAudio;
    this.heldAudio = [];
    this.heldBytes = 0;
    for (const clip of buffers) this.schedule(clip.buffer, clip.offset);
    for (const chunk of audio) this.play(chunk);
  }
  setReplay(active: boolean) {
    if (this.replaying === active) return;
    this.replaying = active;
    this.stream?.getAudioTracks().forEach((track) => {
      track.enabled = !this.muted && !active;
    });
    if (active) {
      const now = this.audio?.currentTime || 0;
      for (const source of this.sources) {
        const offset = Math.max(0, now - (this.sourceStarts.get(source) || 0));
        if (source.buffer && offset < source.buffer.duration)
          this.heldBuffers.push({ buffer: source.buffer, offset });
        source.onended = null;
        try {
          source.stop();
        } catch {
          /* ended */
        }
      }
      this.sources.clear();
      this.sourceStarts.clear();
      this.nextTime = 0;
      // Send silence, not input_audio_buffer.clear: the preceding utterance must still reach VAD/AI.
    } else {
      this.drainHeld();
      void this.resumeAudio().catch(() =>
        this.onEvent?.({ type: "audio-paused" }),
      );
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
    this.sourceStarts.clear();
    this.heldBuffers = [];
    this.heldAudio = [];
    this.heldBytes = 0;
    this.nextTime = 0;
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted && !this.replaying;
    });
    if (muted) {
      this.finishInput();
      this.finishOutput();
      this.stopPlayback();
    }
    this.send({ type: "mute", muted });
  }
  updateContext(context: VoiceContext) {
    this.send({ type: "context", context });
  }
  speakLesson(text: string) {
    this.send({ type: "lesson-speech", text });
  }
  disconnect() {
    if (this.closed) return;
    this.finishInput();
    this.finishOutput();
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
    this.inputRing = [];
    this.pendingInput = null;
    this.outputSegments.clear();
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
