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
}: {
  context: VoiceContext;
  onTranscript: (message: {
    id: string;
    speaker: "Emma" | "在在";
    text: string;
  }) => void;
}) {
  const [selected, setSelected] = useState<ProviderId>(initialModel);
  const [base] = useState(initialBackend);
  const [providers, setProviders] = useState(defaultProviders);
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [phase, setPhase] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [message, setMessage] = useState("未连接 · 语音不会自动启动");
  const [muted, setMuted] = useState(false);
  const [liveSubtitle, setLiveSubtitle] = useState("");
  const token = useRef("");
  const expiresAt = useRef(0);
  const bootstrap = useRef<Promise<unknown> | null>(null);
  const adapter = useRef<RealtimeVoiceService | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const session = useRef(0);
  const current = useRef({ context, onTranscript });
  current.current = { context, onTranscript };
  const transcript = useRef(new Map<string, string>());
  const selectedProvider = providers.find((p) => p.id === selected)!;
  const locked = status === "connected" || status === "connecting";
  async function refresh() {
    const expected = generation.current;
    try {
      const result = await api(base, "/api/voice/config");
      if (expected !== generation.current) return;
      if (!Array.isArray(result.providers))
        throw new Error("后端配置格式不正确。");
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
  function disconnect(reason = "已断开 · 麦克风已释放") {
    session.current++;
    adapter.current?.disconnect();
    adapter.current = null;
    busy.current = false;
    setStatus("disconnected");
    setPhase("idle");
    setMuted(false);
    setMessage(reason);
    setLiveSubtitle("");
  }
  async function connect() {
    if (busy.current || locked) return;
    if (!selectedProvider.configured || !selectedProvider.implemented) {
      setStatus("error");
      setMessage("未配置：所选语音暂未开放，请选择其他模型。");
      return;
    }
    busy.current = true;
    const id = ++session.current;
    transcript.current.clear();
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
      if (e.type === "error") {
        service.disconnect();
        adapter.current = null;
        busy.current = false;
        setStatus("error");
        setPhase("idle");
        setMessage(e.message || "语音连接失败，请重试。");
        return;
      }
      if (e.type === "interrupted" || e.type === "playback-ended")
        setPhase("listening");
      if (e.type === "thinking" || e.type === "response-started")
        setPhase("thinking");
      if (e.type === "turn-ended")
        setPhase((p) => (p === "thinking" ? "listening" : p));
      if (e.type === "audio") setPhase("speaking");
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
  return {
    selected,
    select,
    providers,
    selectedProvider,
    base,
    status,
    phase,
    message,
    locked,
    muted,
    liveSubtitle,
    refresh,
    connect,
    disconnect,
    toggleMute,
    authHeaders: (): Record<string, string> =>
      token.current ? { Authorization: `Bearer ${token.current}` } : {},
  };
}
export type RealtimeVoice = ReturnType<typeof useRealtimeVoice>;
