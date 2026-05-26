#!/usr/bin/env bash
# convert-images.sh
# Convert all PNG images in public/assets/ to WebP format using Python Pillow.
# Run from the project root: bash scripts/convert-images.sh
#
# Requirements: Python 3 with Pillow (pip install pillow)
# After running, update component references to use <picture> elements.

set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/assets"

echo "Converting PNG images to WebP in: $ASSETS_DIR"
echo ""

python3 << 'PYEOF'
import os
import sys
from pathlib import Path
from PIL import Image

assets_dir = Path(os.environ.get('ASSETS_DIR', 'public/assets'))
if not assets_dir.exists():
    assets_dir = Path('public/assets')

converted = 0
skipped = 0
errors = 0

for png_path in sorted(assets_dir.rglob('*.png')):
    webp_path = png_path.with_suffix('.webp')
    
    if webp_path.exists():
        print(f"  SKIP (exists): {png_path.relative_to(assets_dir.parent.parent)}")
        skipped += 1
        continue
    
    try:
        with Image.open(png_path) as img:
            # Preserve RGBA for images with transparency
            if img.mode in ('RGBA', 'LA'):
                img.save(webp_path, 'WEBP', quality=85, method=6, lossless=False)
            else:
                img = img.convert('RGB')
                img.save(webp_path, 'WEBP', quality=85, method=6)
        
        png_size = os.path.getsize(png_path)
        webp_size = os.path.getsize(webp_path)
        savings = (1 - webp_size / png_size) * 100
        print(f"  DONE: {png_path.name} -> {webp_path.name} ({png_size//1024}KB -> {webp_size//1024}KB, {savings:.0f}% smaller)")
        converted += 1
    except Exception as e:
        print(f"  ERROR: {png_path.name}: {e}")
        errors += 1

print("")
print(f"Conversion complete: {converted} converted, {skipped} skipped, {errors} errors")
print("")
print("Next steps:")
print("  1. Update component <img src='*.png'> to use <picture> elements:")
print("     <picture>")
print("       <source srcSet='/assets/path/image.webp' type='image/webp' />")
print("       <img src='/assets/path/image.png' alt='...' />")
print("     </picture>")
print("  2. Update og:image meta tags to use .webp versions where applicable")
PYEOF

echo ""
echo "Script complete. Remember to update component references to serve WebP with PNG fallback."
