import { useEffect, useRef, useState } from "react";
import {
  api,
  defaultProviders,
  validateBackend,
  type ProviderId,
  type VoiceContext,
  type VoiceEvent,
  type RealtimeVoiceService,
} from "../voice/types";
import {
  QwenRealtimeAdapter,
  DoubaoRealtimeAdapter,
  OpenAIRealtimeAdapter,
} from "../voice/adapters";
type LocalClip = { url: string; duration: number; bytes: number };
const MODEL_KEY = "zaizai.voice.provider.v1";

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing still works in memory */
  }
}
function initialModel(): ProviderId {
  const value = stored(MODEL_KEY);
  return value === "doubao" || value === "openai" ? value : "qwen";
}
function initialBackend() {
  try {
    return validateBackend(import.meta.env.VITE_CLASSROOM_API_URL || "");
  } catch {
    return "";
  }
}
export function useRealtimeVoice({
  context,
  onTranscript,
  onUtterance,
}: {
  context: VoiceContext;
  onUtterance?: (event: VoiceEvent) => void;
  onTranscript: (message: {
    id: string;
    speaker: "Emma" | "在在";
    text: string;
  }) => void;
}) {
  const [selected, setSelected] = useState<ProviderId>(initialModel);
  const [base] = useState(initialBackend);
  const [providers, setProviders] = useState(defaultProviders);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [lessonSpeech, setLessonSpeech] = useState(false);
  const [unit1Teaching, setUnit1Teaching] = useState(false);
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [phase, setPhase] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [message, setMessage] = useState("未连接 · 语音不会自动启动");
  const [muted, setMuted] = useState(false);
  const [liveSubtitle, setLiveSubtitle] = useState("");
  const [inputLevel, setInputLevel] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [soundPaused, setSoundPaused] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [clips, setClips] = useState<Record<string, LocalClip>>({});
  const [preview, setPreview] = useState<LocalClip | null>(null);
  const clipStore = useRef(new Map<string, LocalClip>());
  const previewRef = useRef<LocalClip | null>(null);
  const replayElement = useRef<HTMLAudioElement | null>(null);
  const token = useRef("");
  const expiresAt = useRef(0);
  const bootstrap = useRef<Promise<unknown> | null>(null);
  const adapter = useRef<RealtimeVoiceService | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const session = useRef(0);
  const current = useRef({ context, onTranscript, onUtterance });
  current.current = { context, onTranscript, onUtterance };
  const transcript = useRef(new Map<string, string>());
  const selectedProvider = providers.find((p) => p.id === selected)!;
  const locked = status === "connected" || status === "connecting";
  async function refresh() {
    setLoading(true);
    const expected = generation.current;
    try {
      const result = await api(base, "/api/voice/config");
      if (expected !== generation.current) return;
      if (!Array.isArray(result.providers))
        throw new Error("后端配置格式不正确。");
      setCatalogError(false);
      setLessonSpeech(result.capabilities?.lessonSpeech === true);
      setUnit1Teaching(result.capabilities?.unit1Teaching === true);
      setMessage((previous) =>
        previous.startsWith("语音服务暂未响应")
          ? "语音服务已就绪 · 点击开始语音"
          : previous,
      );
      setProviders(
        defaultProviders.map((p) => {
          const remote = result.providers.find(
            (r: { id: string }) => r.id === p.id,
          );
          return p.id === "qwen" && remote
            ? {
                ...p,
                configured: remote.configured === true,
                status: remote.configured ? "可连接" : "未配置",
              }
            : p;
        }),
      );
    } catch {
      if (expected !== generation.current) return;
      setProviders(defaultProviders);
      setCatalogError(true);
      setMessage("语音服务暂未响应，请点击重试语音服务。");
    } finally {
      if (expected === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [base]);
  useEffect(
    () => () => {
      session.current++;

      adapter.current?.disconnect();
      replayElement.current?.pause();
      for (const clip of clipStore.current.values())
        URL.revokeObjectURL(clip.url);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    },
    [],
  );
  useEffect(() => {
    if (status === "connected") adapter.current?.updateContext(context);
  }, [
    context.stage,
    context.prompt,
    context.target,
    context.material,
    context.choices,
    context.hints,
    context.curriculum?.lessonId,
    context.curriculum?.stageId,
    context.curriculum?.scenarioId,
    context.curriculum?.hintLevel,
  ]);
  function select(id: ProviderId) {
    if (busy.current || locked) return;
    setSelected(id);
    save(MODEL_KEY, id);
  }
  function acceptAccess(result: unknown) {
    const value = result as { token?: unknown };
    if (typeof value?.token !== "string" || value.token.length < 16)
      throw new Error("课堂授权未完成。");
    token.current = value.token;
    expiresAt.current = Date.now() + 29 * 60000;
  }
  async function ensureAccess() {
    if (token.current && expiresAt.current > Date.now()) return;
    acceptAccess(await api(base, "/api/voice/session"));
  }
  useEffect(() => {
    let active = true;
    if (!bootstrap.current) {
      const grant = new URLSearchParams(location.hash.slice(1)).get(
        "classroom-access",
      );
      if (grant)
        history.replaceState(null, "", location.pathname + location.search);
      // Retire the old browser-side deployment setting; operators manage it at build time.
      try {
        localStorage.removeItem("zaizai.voice.backend.v1");
      } catch {
        /* unavailable storage */
      }
      bootstrap.current = grant
        ? api(base, "/api/voice/authorize", "", { grant })
        : api(base, "/api/voice/session");
    }
    bootstrap.current
      .then((result) => {
        if (!active) return;
        acceptAccess(result);
        setMessage((previous) =>
          previous.startsWith("未连接")
            ? "语音已就绪 · 点击开始语音"
            : previous,
        );
      })
      .catch(() => {
        /* Ordinary classroom use never displays an admin setup form. */
      });
    return () => {
      active = false;
    };
  }, [base]);
  function saveClip(id: string, blob: Blob, duration: number) {
    const old = clipStore.current.get(id);
    if (old) URL.revokeObjectURL(old.url);
    clipStore.current.delete(id);
    clipStore.current.set(id, {
      url: URL.createObjectURL(blob),
      duration,
      bytes: blob.size,
    });
    while (
      clipStore.current.size > 20 ||
      [...clipStore.current.values()].reduce((n, c) => n + c.bytes, 0) >
        12 * 1024 * 1024
    ) {
      const first = clipStore.current.keys().next().value!;
      URL.revokeObjectURL(clipStore.current.get(first)!.url);
      clipStore.current.delete(first);
    }
    setClips(Object.fromEntries(clipStore.current));
  }
  function clearRecordings() {
    replayElement.current?.pause();
    replayElement.current = null;
    setReplaying(false);
    for (const clip of clipStore.current.values())
      URL.revokeObjectURL(clip.url);
    clipStore.current.clear();
    setClips({});
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = null;
    setPreview(null);
    setHasRecording(false);
    setInputLevel(0);
  }
  function previewRecording() {
    const clip = adapter.current?.recentRecording?.();
    if (!clip || clip.duration < 0.1) {
      setMessage("还没有可回听的录音，请先说一句话。");
      return;
    }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current.url);
    const value = {
      url: URL.createObjectURL(clip.blob),
      duration: clip.duration,
      bytes: clip.blob.size,
    };
    previewRef.current = value;
    setPreview(value);
  }
  function startReplay(element: HTMLAudioElement) {
    const previous = replayElement.current;
    replayElement.current = element;
    if (previous && previous !== element) previous.pause();
    setReplaying(true);
    setPhase("idle");
    adapter.current?.setReplay?.(true);
    setInputLevel(0);
    if (adapter.current) setMessage("正在回听 · 麦克风暂停收音");
  }
  function finishReplay(element: HTMLAudioElement) {
    if (replayElement.current !== element) return;
    replayElement.current = null;
    setReplaying(false);
    if (adapter.current) setPhase(muted ? "idle" : "listening");
    if (adapter.current)
      setMessage(
        muted ? "已静音 · 不发送麦克风音频" : "已连接 · Emma 正在聆听",
      );
    adapter.current?.setReplay?.(false);
  }
  function playLatestEmma() {
    const clip = [...clipStore.current.entries()]
      .reverse()
      .find(([id]) => id.includes("-Emma-"))?.[1];
    if (!clip) {
      setMessage("请先开始语音，Emma 回复后即可回放。");
      return;
    }
    const element = new Audio(clip.url);
    element.onplay = () => startReplay(element);
    element.onpause = () => finishReplay(element);
    element.onended = () => finishReplay(element);
    element.onerror = () => {
      finishReplay(element);
      playbackError();
    };
    void element.play().catch(playbackError);
  }
  function playbackError() {
    setMessage("这段录音暂时无法播放，请重新录一段再试。");
  }
  async function resumeAudio() {
    try {
      await adapter.current?.resumeAudio?.();
      setSoundPaused(false);
    } catch {
      setMessage("声音暂时无法恢复，请重新连接。");
    }
  }
  function disconnect(reason = "已断开 · 麦克风已释放") {
    adapter.current?.disconnect();
    session.current++;
    adapter.current = null;
    replayElement.current?.pause();
    replayElement.current = null;
    setReplaying(false);
    busy.current = false;
    setStatus("disconnected");
    setPhase("idle");
    setMuted(false);
    setInputLevel(0);
    setHasRecording(false);
    setSoundPaused(false);
    setMessage(reason);
    setLiveSubtitle("");
  }
  async function connect(openingText?: string) {
    if (busy.current || locked || loading) return;
    if (catalogError) {
      await refresh();
      return;
    }
    if (!selectedProvider.configured || !selectedProvider.implemented) {
      setStatus("error");
      setMessage("未配置：所选语音暂未开放，请选择其他模型。");
      return;
    }
    if (current.current.context.curriculum && !unit1Teaching) {
      setStatus("error");
      setMessage(
        "当前语音服务尚未更新第一单元教学，暂不能开始该教材的语音课。",
      );
      return;
    }
    busy.current = true;
    const id = ++session.current;
    transcript.current.clear();
    replayElement.current?.pause();
    replayElement.current = null;
    setReplaying(false);
    setInputLevel(0);
    setHasRecording(false);
    setSoundPaused(false);
    setLiveSubtitle("");
    setMuted(false);
    setStatus("connecting");
    setPhase("idle");
    setMessage("正在准备语音 · 请按提示允许麦克风");
    const service =
      selected === "qwen"
        ? new QwenRealtimeAdapter()
        : selected === "doubao"
          ? new DoubaoRealtimeAdapter()
          : new OpenAIRealtimeAdapter();
    adapter.current = service;
    function onEvent(e: VoiceEvent) {
      if (session.current !== id) return;
      if (e.type === "input-level") {
        setInputLevel(e.level || 0);
        setHasRecording(true);
      }
      if (e.type === "audio-paused") {
        setSoundPaused(true);
        setMessage("声音已暂停，请点击恢复声音。");
      }
      if (e.type === "audio-resumed") {
        setSoundPaused(false);
        setMessage((previous) =>
          previous.includes("声音已暂停") ? "已连接 · Emma 正在聆听" : previous,
        );
      }
      if (e.type === "clip" && e.clip && e.speaker) {
        const key = `${e.speaker}-${e.id || "current"}`,
          messageId = `voice-${id}-${key}`;
        saveClip(messageId, e.clip, e.duration || 0);
        if (!transcript.current.has(key))
          current.current.onTranscript({
            id: messageId,
            speaker: e.speaker,
            text:
              e.speaker === "在在"
                ? "我的录音（暂无识别文字）"
                : "Emma 的语音回复（暂无字幕）",
          });
      }
      if (e.type === "error") {
        service.disconnect();
        adapter.current = null;
        busy.current = false;
        setStatus("error");
        setPhase("idle");
        setMessage(e.message || "语音连接失败，请重试。");
        return;
      }
      if (e.type === "subtitle" && e.speaker === "在在" && e.final && e.text)
        current.current.onUtterance?.(e);
      if (e.type === "notice") {
        setMessage(e.message || "请稍后再试。");
        return;
      }
      if (e.type === "interrupted" || e.type === "playback-ended") {
        setPhase("listening");
        if (!replayElement.current)
          setMessage(
            e.type === "interrupted"
              ? "正在听你说话…"
              : "已连接 · Emma 正在聆听",
          );
      }
      if (e.type === "thinking" || e.type === "response-started") {
        setPhase("thinking");
        if (!replayElement.current) setMessage("Emma 正在准备语音回答…");
      }
      if (e.type === "turn-ended")
        setPhase((p) => (p === "thinking" ? "listening" : p));
      if (e.type === "playback-started") {
        setPhase("speaking");
        if (!replayElement.current)
          setMessage("Emma 正在说话 · 你可以直接打断她");
      }
      if (
        (e.type === "subtitle" || e.type === "subtitle-delta") &&
        e.speaker &&
        e.text
      ) {
        const key = `${e.speaker}-${e.id || "current"}`;
        const text =
          e.type === "subtitle-delta"
            ? (transcript.current.get(key) || "") + e.text
            : e.text;
        transcript.current.set(key, text.slice(0, 4000));
        setLiveSubtitle(`${e.speaker}：${text.slice(0, 4000)}`);
        current.current.onTranscript({
          id: `voice-${id}-${key}`,
          speaker: e.speaker,
          text: text.slice(0, 4000),
        });
      }
    }
    try {
      await service.connect({
        base,
        token: token.current,
        authorize: async (refresh) => {
          if (refresh) {
            token.current = "";
            expiresAt.current = 0;
          }
          await ensureAccess();
          return token.current;
        },
        context: current.current.context,
        openingText,
        onEvent,
      });
      if (session.current !== id || adapter.current !== service) return;
      service.updateContext(current.current.context);
      setStatus("connected");
      setPhase("listening");
      setMessage("已连接 · Emma 正在聆听");
    } catch (error) {
      if (session.current !== id) return;
      service.disconnect();
      adapter.current = null;
      busy.current = false;
      setStatus("error");
      setPhase("idle");
      setMessage(error instanceof Error ? error.message : "语音连接失败。");
    }
  }
  function toggleMute() {
    if (status !== "connected") return;
    const next = !muted;
    adapter.current?.setMuted(next);
    setMuted(next);
    setPhase(next ? "idle" : "listening");
    setMessage(
      next ? "已静音 · 不发送麦克风音频，Emma 播放已停止" : "已连接 · 正在聆听",
    );
  }
  function teachStage() {
    if (status !== "connected") {
      void connect();
      return;
    }
    if (!unit1Teaching || muted || replayElement.current) {
      setMessage("请先停止回听、取消静音，并确认教材语音已就绪。");
      return;
    }
    adapter.current?.updateContext(current.current.context);
    adapter.current?.teachStage?.();
  }
  function speakLesson(text = current.current.context.prompt) {
    if (loading) return;
    if (!lessonSpeech) {
      setMessage(
        "当前语音版本暂不支持课件朗读；可以开始语音后直接和 Emma 说话。",
      );
      return;
    }
    if (status !== "connected") {
      void connect(text);
      return;
    }
    if (muted || replayElement.current) {
      setMessage("请先取消静音或停止回听，再请 Emma 朗读。");
      return;
    }
    adapter.current?.updateContext(current.current.context);
    adapter.current?.speakLesson?.(text.slice(0, 300));
  }
  return {
    selected,
    select,
    providers,
    loading,
    catalogError,
    lessonSpeech,
    unit1Teaching,
    teachStage,
    selectedProvider,
    base,
    status,
    phase,
    message,
    locked,
    muted,
    liveSubtitle,
    inputLevel,
    hasRecording,
    soundPaused,
    replaying,
    clips,
    preview,
    previewRecording,
    startReplay,
    finishReplay,
    playbackError,
    playLatestEmma,
    resumeAudio,
    clearRecordings,
    refresh,
    connect,
    speakLesson,
    disconnect,
    toggleMute,
    authHeaders: (): Record<string, string> =>
      token.current ? { Authorization: `Bearer ${token.current}` } : {},
  };
}
export type RealtimeVoice = ReturnType<typeof useRealtimeVoice>;
