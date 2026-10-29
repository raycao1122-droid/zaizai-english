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
const BACKEND_KEY = "zaizai.voice.backend.v1";
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
    return validateBackend(
      stored(BACKEND_KEY) || import.meta.env.VITE_CLASSROOM_API_URL || "",
    );
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
  const [base, setBase] = useState(initialBackend);
  const [providers, setProviders] = useState(defaultProviders);
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [phase, setPhase] = useState<
    "idle" | "listening" | "thinking" | "speaking"
  >("idle");
  const [message, setMessage] = useState("未连接 · 语音不会自动启动");
  const [testing, setTesting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [configMessage, setConfigMessage] = useState("");
  const [testResult, setTestResult] = useState("尚未测试真实连接");
  const [muted, setMuted] = useState(false);
  const [liveSubtitle, setLiveSubtitle] = useState("");
  const token = useRef("");
  const authTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const adapter = useRef<RealtimeVoiceService | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const session = useRef(0);
  const current = useRef({ context, onTranscript });
  current.current = { context, onTranscript };
  const transcript = useRef(new Map<string, string>());
  const selectedProvider = providers.find((p) => p.id === selected)!;
  const locked =
    status === "connected" || status === "connecting" || testing || authorizing;
  async function refresh() {
    const expected = generation.current;
    try {
      const result = await api(base, "/api/voice/config");
      if (expected !== generation.current) return;
      if (!Array.isArray(result.providers))
        throw new Error("后端配置格式不正确。");
      // Only known fields/providers; unimplemented adapters never become available from metadata.
      setProviders(
        defaultProviders.map((p) => {
          const remote = result.providers.find(
            (r: { id: string }) => r.id === p.id,
          );
          return p.id === "qwen" && remote
            ? {
                ...p,
                configured: remote.configured === true,
                status: remote.configured ? "待测试" : "未配置",
                model: String(remote.model || ""),
                region: String(remote.region || ""),
                missing: Array.isArray(remote.missing)
                  ? remote.missing.map(String)
                  : [],
              }
            : p;
        }),
      );
      setConfigMessage("已读取后端配置；配置存在不代表真实语音已验收。");
    } catch {
      if (expected !== generation.current) return;
      setProviders(defaultProviders);
      setConfigMessage(
        "语音后端尚未连接。GitHub Pages 只提供网页，请先配置 HTTPS 后端地址。",
      );
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
      clearTimeout(authTimer.current);
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
    setTestResult("尚未测试该模型的真实连接");
  }
  function setBackend(value: string) {
    if (locked || busy.current) return;
    try {
      const next = validateBackend(value);
      generation.current++;
      clearTimeout(authTimer.current);
      token.current = "";
      setAuthorized(false);
      setBase(next);
      save(BACKEND_KEY, next);
      setProviders(defaultProviders);
      setTestResult("后端地址已保存，请先验证课堂访问口令。");
      setStatus("disconnected");
      setMessage("未连接 · 后端地址已更新");
    } catch (error) {
      setConfigMessage(
        error instanceof Error ? error.message : "后端地址无效。",
      );
    }
  }
  async function authorize(code: string) {
    if (busy.current || locked) return;
    if (/^sk[-_]/i.test(code.trim())) {
      setTestResult(
        "这里是独立课堂访问口令，不能填写 API Key。请把厂商 Key 填到后端环境变量。",
      );
      return;
    }
    setAuthorizing(true);
    const expected = generation.current;
    try {
      const result = await api(base, "/api/voice/login", "", { code });
      if (expected !== generation.current) return;
      if (typeof result.token !== "string" || result.token.length < 16)
        throw new Error("后端未返回有效课堂访问授权。");
      token.current = result.token;
      setAuthorized(true);
      clearTimeout(authTimer.current);
      authTimer.current = setTimeout(() => {
        token.current = "";
        setAuthorized(false);
        disconnect("课堂访问授权已过期，请重新验证口令。");
      }, 1800000);
      setTestResult("课堂访问已授权（本页30分钟）；尚未测试百炼连接。");
    } catch (error) {
      token.current = "";
      setAuthorized(false);
      setTestResult(error instanceof Error ? error.message : "授权失败。");
    } finally {
      setAuthorizing(false);
    }
  }
  async function testConnection() {
    if (busy.current || locked) return;
    setTesting(true);
    setTestResult("正在验证百炼鉴权与会话配置…");
    try {
      const result = await api(base, "/api/voice/test", token.current, {
        provider: selected,
      });
      setTestResult(result.message);
    } catch (error) {
      setTestResult(error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setTesting(false);
    }
  }
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
      setMessage("未配置：请先打开 AI 服务配置。");
      return;
    }
    if (!token.current) {
      setStatus("error");
      setMessage("请先在 AI 服务配置中验证课堂访问口令。");
      return;
    }
    busy.current = true;
    const id = ++session.current;
    transcript.current.clear();
    setLiveSubtitle("");
    setMuted(false);
    setStatus("connecting");
    setPhase("idle");
    setMessage("正在连接 · 请按提示允许麦克风");
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
        context: current.current.context,
        onEvent,
      });
      if (session.current !== id || adapter.current !== service) return;
      service.updateContext(current.current.context);
      setStatus("connected");
      setPhase("listening");
      setMessage("已连接 · 真实语音（待设备验收）");
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
    setBackend,
    status,
    phase,
    message,
    locked,
    testing,
    authorizing,
    authorized,
    configMessage,
    testResult,
    muted,
    liveSubtitle,
    refresh,
    authorize,
    testConnection,
    connect,
    disconnect,
    toggleMute,
    authHeaders: (): Record<string, string> =>
      token.current ? { Authorization: `Bearer ${token.current}` } : {},
  };
}
export type RealtimeVoice = ReturnType<typeof useRealtimeVoice>;
