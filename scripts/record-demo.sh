#!/usr/bin/env bash
set -euo pipefail
cd /workspace/zaizai-english

# Use the existing trusted system ffmpeg instead of downloading another binary.
python3 - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('node_modules/playwright-core/browsers.json').read_text())
revision = next(x['revision'] for x in manifest['browsers'] if x['name'] == 'ffmpeg')
folder = Path('/workspace/.cache/ms-playwright') / f'ffmpeg-{revision}'
folder.mkdir(parents=True, exist_ok=True)
executable = folder / 'ffmpeg-linux'
if not executable.exists():
    executable.symlink_to('/usr/bin/ffmpeg')
PY

PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node scripts/record-demo.mjs
ffmpeg -hide_banner -loglevel warning -y -i demo/classroom-demo.webm \
  -an -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p \
  -movflags +faststart demo/classroom-demo.mp4
