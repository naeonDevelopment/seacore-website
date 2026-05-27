#!/usr/bin/env bash
# convert-images.sh — Convert PNG/JPEG images in public/assets/ to WebP (Pillow).
# Usage (from repo root):
#   bash scripts/convert-images.sh          # skip existing .webp
#   bash scripts/convert-images.sh --force  # regenerate all .webp files

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS_DIR="${ROOT}/public/assets"
FORCE=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
fi

export ASSETS_DIR FORCE

python3 << 'PYEOF'
import os
from pathlib import Path
from PIL import Image

assets_dir = Path(os.environ["ASSETS_DIR"])
force = os.environ.get("FORCE", "0") == "1"
extensions = {".png", ".jpg", ".jpeg"}

converted = 0
skipped = 0
errors = 0

def save_webp(src: Path, dst: Path) -> None:
    with Image.open(src) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            img.save(dst, "WEBP", quality=85, method=6, lossless=False)
        else:
            img.convert("RGB").save(dst, "WEBP", quality=85, method=6)

for src in sorted(assets_dir.rglob("*")):
    if not src.is_file() or src.suffix.lower() not in extensions:
        continue

    webp = src.with_suffix(".webp")
    rel = src.relative_to(assets_dir)

    if webp.exists() and not force:
        if webp.stat().st_mtime >= src.stat().st_mtime:
            print(f"  SKIP: {rel}")
            skipped += 1
            continue

    try:
        save_webp(src, webp)
        src_kb = src.stat().st_size // 1024
        webp_kb = webp.stat().st_size // 1024
        savings = (1 - webp.stat().st_size / src.stat().st_size) * 100 if src.stat().st_size else 0
        print(f"  DONE: {rel} ({src_kb}KB -> {webp_kb}KB, {savings:.0f}% smaller)")
        converted += 1
    except Exception as exc:
        print(f"  ERROR: {rel}: {exc}")
        errors += 1

print("")
print(f"Complete: {converted} converted, {skipped} skipped, {errors} errors")
PYEOF
