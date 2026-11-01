import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

// Configuration is read by this local supervisor/backend, never imported into React.
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
try {
  process.loadEnvFile(".env.local");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 24 || (major === 24 && minor < 5))
  throw Error("请安装 Node.js 24 LTS（24.5 或更新）。");
function port(value, fallback) {
  const n = Number(value || fallback);
  if (!Number.isInteger(n) || n < 1024 || n > 65535)
    throw Error("本机端口必须为1024—65535整数。");
  return String(n);
}
const frontPort = port(process.env.ZAIZAI_PORT, 5173),
  apiPort = port(
    process.env.ZAIZAI_API_PORT || process.env.CLASSROOM_API_PORT,
    8787,
  );
if (frontPort === apiPort) throw Error("前端与后端端口不能相同。");
for (const name of Object.keys(process.env))
  if (/^VITE_.*(?:KEY|TOKEN|SECRET|PASSWORD)/i.test(name) && process.env[name])
    throw Error("不要在VITE_变量中填写密钥，请使用后端DASHSCOPE_API_KEY。");
const origin = `http://127.0.0.1:${frontPort}`,
  base = `http://127.0.0.1:${apiPort}`;
const admin =
  process.env.CLASSROOM_ACCESS_CODE || randomBytes(32).toString("base64url");
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const p of children) if (p.exitCode === null) p.kill("SIGTERM");
  process.exitCode = code;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
function launch(args, env) {
  const child = spawn(process.execPath, args, {
    env,
    stdio: ["ignore", "inherit", "inherit"],
  });
  children.push(child);
  child.on("error", () => {
    console.error("本机进程启动失败，请检查 Node 和依赖。");
    stop(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stop(code || 1);
  });
  return child;
}
const backendEnv = {
  ...process.env,
  PORT: apiPort,
  CLASSROOM_API_PORT: apiPort,
  CLASSROOM_HOST: "127.0.0.1",
  NODE_ENV: "development",
  ALLOWED_ORIGINS: `${origin},http://localhost:${frontPort}`,
  CLASSROOM_ACCESS_CODE: admin,
  CLASSROOM_FRONTEND_URL: origin + "/",
};
const frontendEnv = {
  ...process.env,
  NODE_ENV: "development",
  PAGES_BASE_PATH: "/",
  VITE_CLASSROOM_API_URL: "",
  ZAIZAI_API_PORT: apiPort,
};
for (const name of Object.keys(frontendEnv))
  if (/^(DASHSCOPE_|OPENAI_|CLASSROOM_)/.test(name)) delete frontendEnv[name];
launch(["--use-env-proxy", "--use-system-ca", "server/start.mjs"], backendEnv);
launch(
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    frontPort,
    "--strictPort",
  ],
  frontendEnv,
);
async function ready(url, kind) {
  for (let i = 0; i < 100 && !stopping; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(800) });
      if (r.ok) {
        if (kind === "api") {
          const d = await r.json();
          if (d.capabilities?.unit1Teaching !== true)
            throw Error("old backend");
        }
        return;
      }
    } catch {}
    await delay(200);
  }
  throw Error("启动超时或端口被其他程序占用，请检查上方日志。");
}
try {
  await Promise.all([
    ready(base + "/api/voice/config", "api"),
    ready(origin, "front"),
  ]);
  if (stopping) throw Error("本机服务已停止。");
  const r = await fetch(base + "/api/admin/classroom-invites", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${admin}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(3000),
  });
  if (!r.ok) throw Error("本机设备授权未完成，请检查后端日志。");
  const { url } = await r.json();
  console.log(
    `\n本机课堂：${origin}\n已启动最新第一单元和本机后端，不依赖Render。按 Control+C 一起停止。`,
  );
  if (!process.env.DASHSCOPE_API_KEY || !process.env.DASHSCOPE_WORKSPACE_ID)
    console.log(
      "真实语音尚未配置：请在本机.env.local填写百炼Key和业务空间ID后重启，勿把Key发到聊天或提交Git。",
    );
  if (process.env.ZAIZAI_NO_OPEN !== "1") {
    if (process.platform === "darwin")
      execFile("open", [url], (error) => {
        if (error)
          console.log(
            `浏览器未自动打开，请使用这条仅本机一次有效的授权链接：${url}`,
          );
      });
    else console.log(`本机一次性授权链接：${url}`);
  }
} catch (e) {
  console.error(e.message);
  stop(1);
}
