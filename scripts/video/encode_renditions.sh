#!/usr/bin/env bash
# =============================================================================
# encode_renditions.sh
#
# Produces optimized, multi-rendition MP4s for hero and executive-role section
# background videos. Run this whenever source video files change.
#
# Prerequisites: ffmpeg ≥ 6.0 (brew install ffmpeg on macOS)
#
# Renditions created per source:
#   *_hq.mp4   — high quality  (CRF 22, 1920×1080 max, ~2–4 Mbps)
#   *_mq.mp4   — medium quality (CRF 28, 1280×720 max,  ~0.8–1.5 Mbps)
#   *_lq.mp4   — low quality   (CRF 34, 854×480 max,   ~0.3–0.6 Mbps)
#
# All outputs:
#   • H.264/AAC (maximum browser compat — no plugin required)
#   • moov atom at front (faststart) for progressive streaming
#   • yuv420p pixel format (wide device decode support)
#   • -movflags +faststart applied by ffmpeg directly
#
# First-frame posters:
#   *-firstframe.jpg — extracted from first video frame at 100% quality
#
# Usage:
#   bash scripts/video/encode_renditions.sh
#
# Output directory: public/assets/<section>/ (in-place alongside originals)
# =============================================================================

set -euo pipefail

FFMPEG=$(command -v ffmpeg || true)
if [[ -z "$FFMPEG" ]]; then
  echo "ERROR: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 1
fi

PUBLIC_DIR="$(cd "$(dirname "$0")/../.." && pwd)/public"
HERO_DIR="$PUBLIC_DIR/assets/hero"
EXEC_DIR="$PUBLIC_DIR/assets/section_experts"

# ── Encoding helper ──────────────────────────────────────────────────────────

encode() {
  local input="$1"
  local output="$2"
  local crf="$3"
  local maxw="$4"
  local maxh="$5"

  echo "→ Encoding: $(basename "$input") → $(basename "$output") [crf=$crf, max ${maxw}×${maxh}]"

  "$FFMPEG" -y \
    -i "$input" \
    -vf "scale='min($maxw,iw)':'min($maxh,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2" \
    -c:v libx264 \
    -crf "$crf" \
    -preset slow \
    -profile:v high \
    -level:v 4.1 \
    -pix_fmt yuv420p \
    -c:a aac \
    -b:a 64k \
    -movflags +faststart \
    -an \
    "$output"
  echo "   ✓ $(du -h "$output" | cut -f1)"
}

# ── Poster extractor ─────────────────────────────────────────────────────────

extract_poster() {
  local input="$1"
  local output="$2"

  echo "→ Poster: $(basename "$input") → $(basename "$output")"

  "$FFMPEG" -y \
    -ss 00:00:00.001 \
    -i "$input" \
    -frames:v 1 \
    -q:v 2 \
    "$output"
  echo "   ✓ $(du -h "$output" | cut -f1)"
}

# ── Faststart check ───────────────────────────────────────────────────────────
# Validates that an existing file already has moov before mdat.
# Run the faststart_mp4.py script on source files before this script if needed.

# ── Hero videos ───────────────────────────────────────────────────────────────

echo ""
echo "=== HERO SECTION ==="

for i in 1 2 3; do
  SRC="$HERO_DIR/h_h_${i}.mp4"
  if [[ ! -f "$SRC" ]]; then
    echo "WARN: $SRC not found — skipping" >&2
    continue
  fi

  # High quality (existing production file; re-encode to enforce faststart + settings)
  encode "$SRC" "$HERO_DIR/h_h_${i}_hq.mp4" 22 1920 1080

  # Medium quality (3G target)
  encode "$SRC" "$HERO_DIR/h_h_${i}_mq.mp4" 28 1280 720

  # Low quality (slow 3G / coverage edge)
  encode "$SRC" "$HERO_DIR/h_h_${i}_lq.mp4" 34 854 480

  # First-frame poster (only needed for video 1 — used as above-the-fold poster)
  if [[ "$i" -eq 1 ]]; then
    extract_poster "$SRC" "$HERO_DIR/h_h_1-firstframe.jpg"
  fi
done

# ── Executive role section videos ─────────────────────────────────────────────

echo ""
echo "=== EXECUTIVE ROLE SECTION ==="

# Video 1 (primary source)
SRC1="$EXEC_DIR/vid_section_experts1.mp4"
if [[ -f "$SRC1" ]]; then
  encode "$SRC1" "$EXEC_DIR/vid_section_experts1_hq.mp4" 22 1920 1080
  encode "$SRC1" "$EXEC_DIR/vid_section_experts1_mq.mp4" 28 1280 720
  encode "$SRC1" "$EXEC_DIR/vid_section_experts1_lq.mp4" 34 854 480
  # First-frame poster for freeze-frame UX
  extract_poster "$SRC1" "$EXEC_DIR/vid_section_experts1-firstframe.jpg"
else
  echo "WARN: $SRC1 not found — skipping" >&2
fi

# Video 2
SRC2="$EXEC_DIR/vid_section_experts_2.mp4"
if [[ -f "$SRC2" ]]; then
  encode "$SRC2" "$EXEC_DIR/vid_section_experts_2_hq.mp4" 22 1920 1080
  encode "$SRC2" "$EXEC_DIR/vid_section_experts_2_mq.mp4" 28 1280 720
  encode "$SRC2" "$EXEC_DIR/vid_section_experts_2_lq.mp4" 34 854 480
else
  echo "WARN: $SRC2 not found — skipping" >&2
fi

echo ""
echo "=== Done. ==="
echo "Next steps:"
echo "  1. Replace source references in ExecutiveRoleVideoBackground.tsx"
echo "     and HeroVideoBackground.tsx to use *_hq.mp4 / *_mq.mp4 / *_lq.mp4"
echo "     based on getConnectionHints() effectiveType."
echo "  2. Add <link rel='preload'> for executive firstframe poster in index.html"
echo "     once vid_section_experts1-firstframe.jpg is generated."
echo "  3. Verify faststart on all outputs:"
echo "     python3 scripts/video/faststart_mp4.py <file> (already-faststart files exit early)"
echo ""
