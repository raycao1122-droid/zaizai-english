#!/usr/bin/env bash
# This launcher is copied to the root of the desktop transfer archive.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v git >/dev/null 2>&1; then
  echo '需要先安装 Git，再运行这个文件。'
  exit 1
fi
if [[ -e zaizai-english ]]; then
  echo '当前目录已经有 zaizai-english，为保护已有文件，本次不覆盖。'
  echo '如果已经还原过，请进入该文件夹，运行 start-local.command。'
  exit 1
fi
if [[ ! -f zaizai-english-history.bundle ]]; then
  echo '请先完整解压迁移 ZIP，确保脚本旁边有 zaizai-english-history.bundle。'
  exit 1
fi

git bundle verify zaizai-english-history.bundle
git clone ./zaizai-english-history.bundle zaizai-english
git -C zaizai-english remote remove origin
echo '现有项目与全部 Git 历史已还原，没有重新初始化项目。'
cd zaizai-english
exec bash start-local.command
