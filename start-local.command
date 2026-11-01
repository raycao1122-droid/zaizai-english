#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo '请先安装 Node.js 24 LTS：https://nodejs.org/'
  echo '安装后重新打开这个启动文件。'
  exit 1
fi

node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if (major < 24 || (major === 24 && minor < 5)) { console.error("请安装 Node.js 24 LTS（24.5 或更新）。"); process.exit(1); }'

lesson_port="${ZAIZAI_PORT:-5173}"
if [[ ! "$lesson_port" =~ ^[0-9]+$ ]]; then
  echo 'ZAIZAI_PORT 必须为端口数字。'
  exit 1
fi
lesson_lock_hash="$(node -e 'const fs=require("node:fs"), crypto=require("node:crypto"); console.log(crypto.createHash("sha256").update(fs.readFileSync("package-lock.json")).digest("hex"))')"
lesson_installed_hash=''
if [[ -f node_modules/.zaizai-lock-hash ]]; then
  lesson_installed_hash="$(cat node_modules/.zaizai-lock-hash)"
fi
if [[ ! -x node_modules/.bin/vite || "$lesson_installed_hash" != "$lesson_lock_hash" ]]; then
  echo '首次启动或依赖已更新，正在安装锁定依赖……'
  npm ci --cache "${npm_config_cache:-.local-cache/npm}"
  printf '%s\n' "$lesson_lock_hash" > node_modules/.zaizai-lock-hash
fi

echo "项目目录：$PWD"
echo '将启动当前第一单元课堂和本机语音后端；按 Control+C 一起停止。'
exec npm run dev:local
