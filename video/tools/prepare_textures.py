"""Cuts the real-photo food textures for the 3D bowl out of the proof cutouts.

Reads public/proof/*.png (made by tools/prepare_proof_assets.py) and writes
public/textures/: the patty crust, one image per smashed potato, and a romaine leaf.

Usage: .venv/bin/python tools/prepare_textures.py
"""
from pathlib import Path

import heapq

import numpy as np
from PIL import Image, ImageFilter

root = Path(__file__).parent.parent
src = root / "public" / "proof"
out = root / "public" / "textures"
out.mkdir(parents=True, exist_ok=True)


def fill_alpha(img):
    """Fills transparent pixels with the mean opaque color, for a texture with no holes."""
    a = np.asarray(img).astype(np.float32)
    solid = a[..., 3] > 200
    rgb = a[..., :3].copy()
    rgb[~solid] = a[solid][:, :3].mean(axis=0)
    return Image.fromarray(rgb.astype(np.uint8), "RGB")


def split(img, seeds, scale=4, gap_cost=40):
    """Splits touching pieces of food apart, and returns one cutout per seed. Each pixel goes
    to the seed with the cheapest path to it, and crossing the dark gaps between pieces is
    expensive, so the cuts follow the gaps."""
    small = img.resize((img.width // scale, img.height // scale), Image.BILINEAR)
    a = np.asarray(small).astype(np.float32)
    inside = a[..., 3] > 127
    lum = Image.fromarray((a[..., :3] @ np.array([0.299, 0.587, 0.114])).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    dark = 1 - np.asarray(lum) / 255.0
    h, w = inside.shape
    label = np.zeros((h, w), np.int32)
    heap = [(0.0, sy // scale, sx // scale, i) for i, (sx, sy) in enumerate(seeds, 1)]
    heapq.heapify(heap)
    while heap:
        cost, y, x, i = heapq.heappop(heap)
        if label[y, x]:
            continue
        label[y, x] = i
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and inside[ny, nx] and not label[ny, nx]:
                heapq.heappush(heap, (cost + 1 + gap_cost * dark[ny, nx] ** 3, ny, nx, i))
    big = np.asarray(Image.fromarray(label.astype(np.uint8)).resize(img.size, Image.NEAREST))
    cuts = []
    for i in range(1, len(seeds) + 1):
        # An opening drops thin strands that belong to a neighbor, then the edge is softened.
        piece = Image.fromarray(((big == i) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(21)).filter(ImageFilter.MaxFilter(15))
        piece = piece.filter(ImageFilter.GaussianBlur(2))
        piece = Image.fromarray(np.minimum(np.asarray(piece), np.asarray(img.getchannel("A"))))
        cut = img.copy()
        cut.putalpha(piece)
        cuts.append(cut.crop(piece.getbbox()))
    return cuts


def square(img, size=512, pad=0.06):
    img.thumbnail((int(size * (1 - 2 * pad)),) * 2, Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2))
    return canvas


# Patty: a crust texture quilted from feathered patches of the browned crust band,
# so it has no visible repeat or mirror line.
crust = fill_alpha(Image.open(src / "patties.png").convert("RGBA").crop((60, 180, 420, 320)))
rand = np.random.default_rng(7)
quilt = Image.new("RGB", (512, 512))
feather = Image.radial_gradient("L").resize((128, 128)).point(lambda v: max(0, min(255, (200 - v) * 3)))
for _ in range(260):
    x, y = int(rand.integers(0, crust.width - 96)), int(rand.integers(0, crust.height - 96))
    patch = crust.crop((x, y, x + 96, y + 96)).resize((128, 128)).rotate(90 * int(rand.integers(0, 4)))
    quilt.paste(patch, (int(rand.integers(-64, 512 - 64)), int(rand.integers(-64, 512 - 64))), feather)
quilt.save(out / "patty.jpg", quality=92)

# Potatoes: one seed point per potato in the photo. Every potato needs a seed so its
# neighbors cannot swallow it, and the four that sit whole in the frame are kept.
potatoes = Image.open(src / "potatoes.png").convert("RGBA")
seeds = [(200, 140), (330, 380), (680, 530), (960, 540), (1250, 620), (680, 850), (250, 720)]
cuts = split(potatoes, seeds)
for i, keep in enumerate((2, 3, 4, 5)):
    square(cuts[keep]).save(out / f"potato_{i}.png")

# Romaine: the separate top leaf, for chopped pieces.
leaf = Image.open(src / "romaine.png").convert("RGBA").crop((560, 0, 1400, 320))
leaf = leaf.crop(leaf.getbbox())
leaf.thumbnail((1024, 1024), Image.LANCZOS)
leaf.save(out / "leaf.png")

for f in sorted(out.iterdir()):
    print(f.name, Image.open(f).size)
