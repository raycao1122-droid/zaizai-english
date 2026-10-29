import { execFile } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = process.argv[2] || "5173";
if (!/^\d+$/.test(port)) throw new Error("Invalid local port");
const url = `http://127.0.0.1:${port}/`;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(800) });
    const html = await response.text();
    if (response.ok && html.includes("在在的英语课堂")) {
      if (process.platform === "darwin") {
        execFile("open", [url], (error) => {
          if (error) console.log(`请在浏览器打开：${url}`);
        });
      } else {
        console.log(`请在浏览器打开：${url}`);
      }
      process.exitCode = 0;
      break;
    }
  } catch {
    // Wait for Vite startup; do not request anything beyond the local server.
  }
  await delay(400);
  if (attempt === 39) console.log(`请检查启动日志，然后打开：${url}`);
}
