import { randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { QwenRealtimeAdapter, QWEN_MODEL, qwenConfig } from "./adapters.mjs";

export function safeContext(input) {
  if (!input || typeof input !== "object") return {};
  // Explicit fields only. No client prompt overrides, scores, tools or course mutations.
  return {
    course: "Lesson 01 · Animals (demo course)",
    stage: String(input.stage || "").slice(0, 80),
    prompt: String(input.prompt || "").slice(0, 300),
    target: String(input.target || "").slice(0, 30),
    material: String(input.material || "未选择；示例课堂").slice(0, 120),
    actualPageActions: {
      choices: Math.min(10000, Math.max(0, Number(input.choices) || 0)),
      hints: Math.min(10000, Math.max(0, Number(input.hints) || 0)),
    },
    history: Array.isArray(input.history)
      ? input.history
          .slice(-8)
          .map((m) => ({
            speaker: m?.speaker === "Emma" ? "Emma" : "在在",
            text: String(m?.text || "").slice(0, 500),
          }))
      : [],
    records:
      "Only page actions available. Historical reports, learning progress and pronunciation are DEMO DATA, not learning evidence.",
  };
}
export function createVoiceGateway(
  server,
  {
    env = process.env,
    adapterFactory = () => new QwenRealtimeAdapter(env),
  } = {},
) {
  const origins = new Set(
    (env.ALLOWED_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const tokens = new Map(),
    tickets = new Map(),
    rates = new Map(),
    active = new Set();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32768 });
  const publicMode =
    env.CLASSROOM_HOST === "0.0.0.0" || env.NODE_ENV === "production";
  const hasAccess = Boolean(
    env.CLASSROOM_ACCESS_CODE &&
      env.CLASSROOM_ACCESS_CODE.length >= 16 &&
      env.CLASSROOM_ACCESS_CODE.length <= 128,
  );
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const map of [tokens, tickets, rates])
      for (const [key, value] of map) if (value.expires < now) map.delete(key);
  }, 30000);
  cleanup.unref();
  server.on("close", () => {
    clearInterval(cleanup);
    for (const ws of wss.clients) ws.terminate();
  });
  const json = (res, status, data) =>
    res
      .writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .end(JSON.stringify(data));
  const allowed = (req) =>
    !req.headers.origin || origins.has(req.headers.origin);
  const identity = (req) => {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    return token && tokens.get(token)?.expires > Date.now() ? token : null;
  };
  function rate(key, max, window = 60000) {
    const old = rates.get(key);
    const r =
      old?.expires > Date.now()
        ? old
        : { expires: Date.now() + window, count: 0 };
    if (rates.size > 2000 && !rates.has(key)) return false;
    r.count++;
    rates.set(key, r);
    return r.count <= max;
  }
  async function body(req) {
    let size = 0;
    const chunks = [];
    if (!req.headers["content-type"]?.startsWith("application/json"))
      throw new Error("JSON required");
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16384) throw new Error("too large");
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
  function providers() {
    const q = qwenConfig(env),
      configured = q.configured && hasAccess;
    return {
      providers: [
        {
          id: "qwen",
          name: "通义千问",
          configured,
          status: configured ? "待测试" : "未配置",
          implemented: true,
          model: QWEN_MODEL,
          region: q.region,
          missing: [
            ...(!env.DASHSCOPE_API_KEY ? ["DASHSCOPE_API_KEY"] : []),
            ...(!q.url ? ["DASHSCOPE_WORKSPACE_ID / DASHSCOPE_REGION"] : []),
            ...(!hasAccess ? ["CLASSROOM_ACCESS_CODE（至少16位）"] : []),
          ],
        },
        {
          id: "doubao",
          name: "豆包实时语音",
          configured: false,
          status: "未配置",
          implemented: false,
          missing: ["适配器尚未接入"],
        },
        {
          id: "openai",
          name: "OpenAI Realtime",
          configured: false,
          status: "未配置",
          implemented: false,
          missing: ["实时语音适配器尚未接入"],
        },
      ],
      protocol: "WebSocket relay",
      audio: "PCM16 单声道：输入16kHz / 输出24kHz",
      maxSessionSeconds: 600,
    };
  }
  async function handle(req, res) {
    if (!allowed(req)) {
      json(res, 403, { error: "不允许的请求来源。" });
      return true;
    }
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res
        .writeHead(204, {
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Authorization,Content-Type",
          "Access-Control-Max-Age": "600",
        })
        .end();
      return true;
    }
    if (!req.url?.startsWith("/api/voice/")) {
      // Public deployments must not expose the older paid text API anonymously.
      if (publicMode && req.url === "/api/classroom/reply" && !identity(req)) {
        json(res, 401, { error: "请先在 AI 服务配置中验证课堂访问口令。" });
        return true;
      }
      if (
        publicMode &&
        req.url === "/api/classroom/reply" &&
        !rate("text:" + identity(req), 10)
      ) {
        json(res, 429, { error: "文字请求过于频繁。" });
        return true;
      }
      return false;
    }
    try {
      if (req.method === "GET" && req.url === "/api/voice/config") {
        json(res, 200, providers());
        return true;
      }
      if (req.method !== "POST") {
        json(res, 404, { error: "接口不存在。" });
        return true;
      }
      if (req.url === "/api/voice/login") {
        if (!rate("login:" + req.socket.remoteAddress, 5)) {
          json(res, 429, { error: "尝试过于频繁，请一分钟后重试。" });
          return true;
        }
        const input = await body(req);
        const digest = (value) => createHash("sha256").update(value).digest();
        if (
          !hasAccess ||
          typeof input.code !== "string" ||
          /^sk[-_]/i.test(input.code.trim()) ||
          !timingSafeEqual(
            digest(input.code),
            digest(env.CLASSROOM_ACCESS_CODE),
          )
        ) {
          json(res, 401, {
            error:
              "课堂访问口令无效，或服务器未配置至少16位口令。不要在这里填写 API Key。",
          });
          return true;
        }
        if (tokens.size >= 100) {
          json(res, 429, { error: "访问会话已满，请稍后重试。" });
          return true;
        }
        const token = randomBytes(32).toString("base64url");
        tokens.set(token, { expires: Date.now() + 30 * 60000 });
        json(res, 200, { token, expiresIn: 1800 });
        return true;
      }
      const token = identity(req);
      if (!token) {
        json(res, 401, {
          error: "请先验证课堂访问口令，授权只保留在本次页面内。",
        });
        return true;
      }
      const input = await body(req);
      if (input.provider !== "qwen" || !providers().providers[0].configured) {
        json(res, 503, {
          error:
            "未配置：请完成百炼 Key、地域、业务空间和课堂访问口令设置。其他厂商尚未接入。",
        });
        return true;
      }
      if (req.url === "/api/voice/test") {
        if (!rate("test:" + token, 1, 10000) || active.size >= 1) {
          json(res, 429, { error: "已有语音会话或测试，请断开后稍候重试。" });
          return true;
        }
        const adapter = adapterFactory();
        active.add(adapter);
        res.on("close", () => {
          if (!res.writableEnded) adapter.close();
        });
        try {
          await adapter.connect(safeContext({}));
          json(res, 200, {
            ok: true,
            message:
              "百炼鉴权及会话配置通过；麦克风、音频播放、字幕与打断仍需设备实测。",
          });
        } catch (error) {
          json(res, 502, { error: error.message });
        } finally {
          adapter.close();
          active.delete(adapter);
        }
        return true;
      }
      if (req.url === "/api/voice/ticket") {
        if (
          !rate("ticket:" + token, 6) ||
          active.size >= 1 ||
          tickets.size >= 100
        ) {
          json(res, 429, { error: "语音会话繁忙，请稍后重试。" });
          return true;
        }
        const ticket = randomBytes(32).toString("base64url");
        tickets.set(ticket, {
          expires: Date.now() + 30000,
          token,
          context: safeContext(input.context),
          origin: req.headers.origin,
        });
        json(res, 200, { ticket });
        return true;
      }
      json(res, 404, { error: "接口不存在。" });
    } catch {
      if (!res.writableEnded)
        json(res, 400, { error: "请求格式错误或内容过长。" });
    }
    return true;
  }
  server.on("upgrade", (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      socket.destroy();
      return;
    }
    const ticket = url.searchParams.get("ticket"),
      grant = tickets.get(ticket);
    // Browser-origin validation and single-use, short-lived tickets; never put API keys in URLs.
    if (
      url.pathname !== "/api/voice/socket" ||
      !req.headers.origin ||
      !origins.has(req.headers.origin) ||
      !grant ||
      grant.expires <= Date.now() ||
      (grant.origin && grant.origin !== req.headers.origin) ||
      !(tokens.get(grant.token)?.expires > Date.now()) ||
      active.size >= 1
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    tickets.delete(ticket);
    wss.handleUpgrade(req, socket, head, (ws) => {
      const adapter = adapterFactory();
      active.add(adapter);
      let live = false,
        muted = false,
        ended = false,
        frames = 0,
        bytes = 0;
      const send = (event) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
      };
      const end = (message) => {
        if (ended) return;
        ended = true;
        live = false;
        if (message) send({ type: "error", message });
        clearTimeout(duration);
        clearInterval(budget);
        clearInterval(heartbeat);
        adapter.close();
        active.delete(adapter);
        ws.close();
      };
      const duration = setTimeout(
        () => end("本次语音已到10分钟上限，请手动重新连接。"),
        600000,
      );
      const budget = setInterval(() => {
        frames = 0;
        bytes = 0;
      }, 1000);
      let alive = true;
      const heartbeat = setInterval(() => {
        if (!alive) return end("语音心跳超时，请重新连接。");
        alive = false;
        ws.ping();
      }, 15000);
      ws.on("pong", () => {
        alive = true;
      });
      ws.on("close", () => end());
      ws.on("error", () => end());
      adapter.on("failure", (message) => end(message));
      adapter.on("event", (event) => {
        if (muted || !live) return;
        if (ws.bufferedAmount > 1024 * 1024)
          return end("播放网络过慢，请重新连接。");
        send(event);
      });
      ws.on("message", (raw) => {
        try {
          frames++;
          bytes += raw.length;
          if (frames > 80 || bytes > 150000)
            return end("音频发送过快，已停止连接。");
          const e = JSON.parse(raw.toString());
          if (
            e.type === "audio" &&
            live &&
            !muted &&
            typeof e.audio === "string" &&
            e.audio.length <= 16000 &&
            /^[A-Za-z0-9+/]+={0,2}$/.test(e.audio)
          )
            adapter.appendAudio(e.audio);
          else if (e.type === "context" && live)
            adapter.updateContext(safeContext(e.context));
          else if (e.type === "mute" && typeof e.muted === "boolean") {
            muted = e.muted;
            adapter.mute();
          } else if (e.type === "disconnect") end();
          else if (!["audio", "context"].includes(e.type))
            end("不支持的语音控制请求。");
        } catch {
          end("语音数据格式错误。");
        }
      });
      adapter
        .connect(grant.context)
        .then(() => {
          if (ended) return;
          live = true;
          send({ type: "ready" });
        })
        .catch((error) => end(error.message));
    });
  });
  return { handle, identity };
}
