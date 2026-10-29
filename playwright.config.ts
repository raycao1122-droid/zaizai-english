import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1536, height: 1024 },
    reducedMotion: "reduce",
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_PATH ||
        (process.platform === "linux" && existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : undefined),
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
});
