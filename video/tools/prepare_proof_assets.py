"""Turns the proof's cutouts into clean, trimmed assets in public/proof/.

Usage: .venv/bin/python tools/prepare_proof_assets.py <cutouts folder> <photos folder>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

cut, src = Path(sys.argv[1]), Path(sys.argv[2])
out = Path(__file__).parent.parent / "public" / "proof"
out.mkdir(parents=True, exist_ok=True)


def trim(img, max_side=1400):
    img = img.crop(img.getbbox())
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


for name in ("bowl", "romaine", "potatoes", "patties"):
    trim(Image.open(cut / name / "all.png").convert("RGBA")).save(out / f"{name}.png")

# Mushrooms: keep the light slices, drop the dark board by brightness and saturation.
photo = Image.open(src / "mushrooms.jpg").convert("RGB")
arr = np.asarray(photo).astype(np.float32) / 255
lum = arr @ np.array([0.299, 0.587, 0.114])
sat = arr.max(axis=2) - arr.min(axis=2)
mask = ((lum > 0.42) & (sat < 0.32)).astype(np.uint8) * 255
m = Image.fromarray(mask).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
rgba = photo.copy()
rgba.putalpha(m)
w, h = rgba.size
pile = rgba.crop((int(w * 0.18), int(h * 0.30), int(w * 0.82), int(h * 0.75)))
trim(pile).save(out / "mushrooms.png")
for f in sorted(out.glob("*.png")):
    print(f.name, Image.open(f).size)
