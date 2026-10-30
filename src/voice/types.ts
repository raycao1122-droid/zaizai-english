export type ProviderId = "qwen" | "doubao" | "openai";
export type Provider = {
  id: ProviderId;
  name: string;
  configured: boolean;
  implemented: boolean;
  status: string;
};
export const defaultProviders: Provider[] = [
  {
    id: "qwen",
    name: "通义千问",
    configured: false,
    implemented: true,
    status: "未配置",
  },
  {
    id: "doubao",
    name: "豆包实时语音",
    configured: false,
    implemented: false,
    status: "未配置",
  },
  {
    id: "openai",
    name: "OpenAI Realtime",
    configured: false,
    implemented: false,
    status: "未配置",
  },
];
export type VoiceContext = {
  stage: string;
  prompt: string;
  target: string;
  material: string;
  choices: number;
  hints: number;
  history: { speaker: string; text: string }[];
};
export type VoiceEvent = {
  type: string;
  message?: string;
  speaker?: "Emma" | "在在";
  id?: string;
  text?: string;
  final?: boolean;
  audio?: string;
  clip?: Blob;
  duration?: number;
  level?: number;
};
export type ConnectOptions = {
  base: string;
  token: string;
  authorize?: (refresh?: boolean) => Promise<string>;
  context: VoiceContext;
  openingText?: string;
  onEvent: (event: VoiceEvent) => void;
};
export interface RealtimeVoiceService {
  connect(options: ConnectOptions): Promise<void>;
  disconnect(): void;
  setMuted(muted: boolean): void;
  setReplay?(active: boolean): void;
  updateContext(context: VoiceContext): void;
  speakLesson?(text: string): void;
  recentRecording?(): { blob: Blob; duration: number } | null;
  resumeAudio?(): Promise<void>;
}
export function validateBackend(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value);
  if (
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("语音服务地址无效。");
  return url.origin;
}
export function backendUrl(base: string, path: string) {
  return `${base}${path}`;
}
export class ClassroomApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api(
  base: string,
  path: string,
  token = "",
  data?: unknown,
) {
  const response = await fetch(backendUrl(base, path), {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    // Free hosting can take longer to wake; don't misreport that as a missing key.
    signal: AbortSignal.timeout(
      path === "/api/voice/config" || path === "/api/voice/session"
        ? 60000
        : 20000,
    ),
    credentials: "include",
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("语音服务暂时无法连接，请稍后重试。");
  }
  if (!response.ok)
    throw new ClassroomApiError(
      result.error || "语音服务暂不可用，请稍后重试。",
      response.status,
    );
  return result;
}
