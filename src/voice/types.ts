export type ProviderId = "qwen" | "doubao" | "openai";
export type Provider = {
  id: ProviderId;
  name: string;
  configured: boolean;
  implemented: boolean;
  status: string;
  model?: string;
  region?: string;
  missing: string[];
};
export const defaultProviders: Provider[] = [
  {
    id: "qwen",
    name: "通义千问",
    configured: false,
    implemented: true,
    status: "未配置",
    missing: ["后端尚未连接，无法读取配置"],
  },
  {
    id: "doubao",
    name: "豆包实时语音",
    configured: false,
    implemented: false,
    status: "未配置",
    missing: ["适配器尚未接入"],
  },
  {
    id: "openai",
    name: "OpenAI Realtime",
    configured: false,
    implemented: false,
    status: "未配置",
    missing: ["实时语音适配器尚未接入"],
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
};
export type ConnectOptions = {
  base: string;
  token: string;
  context: VoiceContext;
  onEvent: (event: VoiceEvent) => void;
};
export interface RealtimeVoiceService {
  connect(options: ConnectOptions): Promise<void>;
  disconnect(): void;
  setMuted(muted: boolean): void;
  updateContext(context: VoiceContext): void;
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
    throw new Error(
      "后端地址须为 HTTPS 根地址；本机开发可使用 http://127.0.0.1:8787。请勿填写密钥。",
    );
  return url.origin;
}
export function backendUrl(base: string, path: string) {
  return `${base}${path}`;
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
    signal: AbortSignal.timeout(20000),
    credentials: "omit",
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      "语音后端未部署或地址不正确；GitHub Pages 不能运行语音后端。",
    );
  }
  if (!response.ok)
    throw new Error(result.error || "语音服务请求失败，请检查配置。");
  return result;
}
