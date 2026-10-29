"""Keep original PNG bytes intact; expose permitted cropped viewports as SVGs.

No generated artwork, raster repainting, replacement characters or UI screenshots.
Each SVG is independently replaceable by a future production asset.
"""
from base64 import b64encode
from hashlib import sha256
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'assets'
REGIONS = {
    'emma': ('01_emma_character_reference.png', (0, 0, 579, 643)),
    'emma-avatar': ('01_emma_character_reference.png', (177, 50, 245, 245)),
    'student': ('02_classroom_layout_reference.png', (1366, 14, 55, 55)),
    'dog': ('02_classroom_layout_reference.png', (535, 356, 242, 148)),
    'cat': ('02_classroom_layout_reference.png', (848, 356, 241, 148)),
    'bird': ('02_classroom_layout_reference.png', (538, 580, 240, 148)),
    'rabbit': ('02_classroom_layout_reference.png', (850, 580, 238, 148)),
    'garden-left': ('02_classroom_layout_reference.png', (464, 323, 43, 481)),
    'garden-right': ('02_classroom_layout_reference.png', (1118, 323, 49, 481)),
    'garden-canopy': ('02_classroom_layout_reference.png', (875, 164, 290, 48)),
    'garden-grass': ('02_classroom_layout_reference.png', (465, 790, 702, 18)),
    'fish': ('03_lesson_storyboard_reference.png', (1239, 506, 69, 47)),
    'pet-dog': ('03_lesson_storyboard_reference.png', (873, 560, 102, 65)),
    'pet-cat': ('03_lesson_storyboard_reference.png', (984, 560, 103, 65)),
    'pet-none': ('03_lesson_storyboard_reference.png', (1098, 560, 88, 65)),
}


def main():
    manifest = []
    for name, (source, box) in REGIONS.items():
        raw = (ROOT / source).read_bytes()
        encoded = b64encode(raw).decode()
        x, y, width, height = box
        svg = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
            f'viewBox="{x} {y} {width} {height}"><title>Original design crop: {name}</title>'
            f'<defs><clipPath id="source-crop"><rect x="{x}" y="{y}" '
            f'width="{width}" height="{height}"/></clipPath></defs>'
            f'<image clip-path="url(#source-crop)" width="1536" height="1024" '
            f'href="data:image/png;base64,{encoded}"/></svg>'
        )
        (ROOT / f'{name}.svg').write_text(svg)
        manifest.append({
            'file': f'{name}.svg', 'source': source, 'viewBox': box,
            'source_sha256': sha256(raw).hexdigest(),
            'method': 'SVG viewport with explicit clip; unmodified original PNG embedded verbatim',
        })
    (ROOT / 'provenance.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
