"""Create bounded WebP assets and thumbnail variants; preserve source originals."""
from pathlib import Path
from PIL import Image, ImageOps
import json

root = Path(__file__).resolve().parents[1]
folder = root / 'assets/images'
manifest = {}
before = after = 0
for source in sorted(folder.iterdir()):
    if source.suffix.lower() not in ('.jpg', '.jpeg', '.png') or source.stem == 'og-cover':
        continue
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        dest = source.with_suffix('.webp')
        image.save(dest, 'WEBP', quality=82, method=6)
        thumb = image.copy()
        thumb.thumbnail((320, 320), Image.Resampling.LANCZOS)
        small = source.with_name(source.stem + '-320.webp')
        thumb.save(small, 'WEBP', quality=78, method=6)
        manifest[source.name] = {'src': dest.name, 'width': image.width, 'height': image.height,
                                 'small': small.name, 'smallWidth': thumb.width}
        before += source.stat().st_size
        after += dest.stat().st_size
(folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Full-size images: {before:,} -> {after:,} bytes ({(1-after/before)*100:.1f}% reduction)')
