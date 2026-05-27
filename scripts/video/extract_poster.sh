#!/usr/bin/env bash
# Extract first-frame poster (JPG + WebP) from section_experts primary video.
# Usage: bash scripts/video/extract_poster.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FFMPEG=$(command -v ffmpeg || true)
if [[ -z "$FFMPEG" ]]; then
  echo "ERROR: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

SRC="$ROOT/public/assets/section_experts/vid_section_experts1.mp4"
JPG="$ROOT/public/assets/section_experts/vid_section_experts1-firstframe.jpg"
WEBP="${JPG%.jpg}.webp"
TMP="$(mktemp /tmp/vid_section_experts1-firstframe.XXXXXX.jpg)"

if [[ ! -f "$SRC" ]]; then
  echo "ERROR: missing source video: $SRC" >&2
  exit 1
fi

"$FFMPEG" -y -ss 00:00:00.001 -i "$SRC" -frames:v 1 -update 1 -q:v 2 "$TMP"
python3 -c "
from PIL import Image
from pathlib import Path
src = Path('$TMP')
Image.open(src).save('$JPG', quality=95)
Image.open(src).save('$WEBP', 'WEBP', quality=85, method=6)
"
rm -f "$TMP"
echo "Wrote $JPG and $WEBP"
