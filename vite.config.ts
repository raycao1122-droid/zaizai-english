import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || "/",
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  plugins: [react(), tailwindcss()],
});
