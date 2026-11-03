"""Palette test: three recipe parts drawn as 3D isometric objects, in blue and in cream."""
import math
import random
import sys

K = 0.5  # isometric flattening for horizontal discs
PALETTES = {
    "blue": dict(bg="#1B4A86", grid="#235390", ink="#EEF4FB", ink2="#A9C4E6", top="#25579A",
                 side="#123A6C", shade="#0F3460", accent="#FFA08A", title="Blueprint blue"),
    "cream": dict(bg="#F3ECDD", grid="#E4D8C1", ink="#1D3557", ink2="#6E819B", top="#DDE7F1",
                  side="#B7C8DC", shade="#C9BFA9", accent="#D4553A", title="Cream drafting paper"),
}
MONO = "'IBM Plex Mono', Menlo, monospace"
SERIF = "'Instrument Serif', Georgia, serif"
HAND = "'Caveat', 'Marker Felt', cursive"


def f(v):
    return f"{v:.1f}"


def path_closed(pts):
    k = len(pts)
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    for i in range(k):
        p0, p1, p2, p3 = pts[(i - 1) % k], pts[i], pts[(i + 1) % k], pts[(i + 2) % k]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    return d + "Z"


def poly(pts):
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts) + "Z"


def radii(rng, n, amp, spikes=0.0, smooth=2):
    rs = [1 + amp * (rng.random() * 2 - 1) for _ in range(n)]
    for _ in range(smooth):
        rs = [(rs[i - 1] + 2 * rs[i] + rs[(i + 1) % n]) / 4 for i in range(n)]
    if spikes:
        rs = [v + (spikes * rng.random() if rng.random() < 0.28 else 0) for v in rs]
    return rs


def disc(out, P, rng, cx, cy, r, h, amp, spikes, n=140, smooth=2):
    """An irregular disc with thickness h, viewed from above at an angle. Returns top outline."""
    rs = radii(rng, n, amp, spikes, smooth)
    top = [(cx + r * rs[i] * math.cos(2 * math.pi * i / n), cy + K * r * rs[i] * math.sin(2 * math.pi * i / n)) for i in range(n)]
    bottom = [(x, y + h) for x, y in top]
    front = [i for i in range(n) if math.sin(2 * math.pi * i / n) >= -0.05]
    # soft hatched shadow
    out.append(f'<ellipse cx="{f(cx + r * 0.08)}" cy="{f(cy + h + K * r * 0.25)}" rx="{f(r * 1.08)}" ry="{f(K * r * 0.9)}" fill="url(#shadow-{P["key"]})"/>')
    out.append(f'<path d="{path_closed(bottom)}" fill="{P["side"]}" stroke="{P["ink"]}" stroke-width="1.6"/>')
    band = [top[i] for i in front] + [bottom[i] for i in reversed(front)]
    out.append(f'<path d="{poly(band)}" fill="{P["side"]}"/>')
    for i in front[::5]:
        x, y = top[i]
        out.append(f'<path d="M{f(x)},{f(y + 2)} v{f(h - 3)}" stroke="{P["ink2"]}" stroke-width="0.7"/>')
    out.append(f'<path d="{path_closed(top)}" fill="{P["top"]}" stroke="{P["ink"]}" stroke-width="1.8" stroke-linejoin="round"/>')
    return top


def patty(out, P, rng, cx, cy, r):
    top = disc(out, P, rng, cx, cy, r, 12, 0.05, 0.035, n=170, smooth=1)
    # lace: small holes just inside the rim, where the thin edge fried through
    for _ in range(26):
        a = rng.uniform(0, 2 * math.pi)
        rr = r * rng.uniform(0.86, 0.95)
        out.append(f'<ellipse cx="{f(cx + rr * math.cos(a))}" cy="{f(cy + K * rr * math.sin(a))}" rx="{f(rng.uniform(2.5, 5))}" ry="{f(rng.uniform(1.4, 2.6))}" fill="{P["side"]}" stroke="{P["ink"]}" stroke-width="0.8"/>')
    # seared crust: dense short strokes near the rim, sparse toward the middle
    for _ in range(260):
        a = rng.uniform(0, 2 * math.pi)
        rr = r * (0.97 - 0.75 * rng.random() ** 1.8)
        x, y = cx + rr * math.cos(a), cy + K * rr * math.sin(a)
        L = rng.uniform(3, 7)
        b = a + math.pi / 2 + rng.uniform(-0.5, 0.5)
        out.append(f'<path d="M{f(x)},{f(y)} q{f(L * math.cos(b) / 2 + 1)},{f(K * L * math.sin(b) / 2 - 1)} {f(L * math.cos(b))},{f(K * L * math.sin(b))}" fill="none" stroke="{P["ink"]}" stroke-width="0.8" opacity="{f(0.35 + 0.6 * rr / r)}"/>')
    # half slice of cheese, cut corner to corner, melting over the edge
    s, rot = r * 0.6, 0.95
    tri = [(-s, -s), (s, -s), (-s, s)]
    edge = []
    for i in range(3):
        (ax, ay), (bx, by) = tri[i], tri[(i + 1) % 3]
        steps = 40
        for k in range(steps):
            t = k / steps
            edge.append((ax + (bx - ax) * t, ay + (by - ay) * t))
    pts = []
    drips = []
    for u, v in edge:
        px = u * math.cos(rot) - v * math.sin(rot)
        py = u * math.sin(rot) + v * math.cos(rot)
        rho = math.hypot(px, py)
        lim = r * 0.98
        droop = 0.0
        if rho > lim:
            droop = min((rho - lim) * 0.6, 16)
            px, py = px * lim / rho, py * lim / rho
            if math.sin(math.atan2(py, px)) > 0.2 and rng.random() < 0.05:
                drips.append((cx + px, cy + K * py + droop - 3))
        pts.append((cx + px, cy + K * py - 3 + droop + rng.uniform(-0.6, 0.6)))
    out.append(f'<path d="{path_closed(pts[::2])}" fill="{P["bg"]}" stroke="{P["ink"]}" stroke-width="1.6" stroke-linejoin="round"/>')
    out.append(f'<path d="{path_closed(pts[::2])}" fill="url(#cheese-{P["key"]})"/>')
    for x, y in drips[:3]:
        L = rng.uniform(10, 18)
        out.append(f'<path d="M{f(x - 5)},{f(y)} C{f(x - 5)},{f(y + L)} {f(x + 5)},{f(y + L)} {f(x + 5)},{f(y)}" fill="{P["bg"]}" stroke="{P["ink"]}" stroke-width="1.4"/>')
    # shine on the melted cheese


def potato(out, P, rng, cx, cy, r):
    top = disc(out, P, rng, cx, cy, r, 15, 0.13, 0.04, n=70, smooth=1)
    # crisp rim: an inner contour that follows the crags
    inner = [(cx + (x - cx) * 0.8, cy + (y - cy) * 0.8) for x, y in top]
    out.append(f'<path d="{path_closed(inner)}" fill="none" stroke="{P["ink2"]}" stroke-width="1" stroke-dasharray="3 3"/>')
    # cracks from smashing, radiating out from the middle
    for _ in range(6):
        a = rng.uniform(0, 2 * math.pi)
        p = [(cx + 6 * math.cos(a), cy + K * 6 * math.sin(a))]
        rr = 6
        while rr < r * 0.75:
            rr += rng.uniform(7, 12)
            a += rng.uniform(-0.35, 0.35)
            p.append((cx + rr * math.cos(a), cy + K * rr * math.sin(a)))
        out.append(f'<path d="M' + " L".join(f"{f(x)},{f(y)}" for x, y in p) + f'" fill="none" stroke="{P["ink"]}" stroke-width="1.1" stroke-linejoin="round"/>')
    for _ in range(70):
        a, rr = rng.uniform(0, 2 * math.pi), r * 0.9 * math.sqrt(rng.random())
        out.append(f'<circle cx="{f(cx + rr * math.cos(a))}" cy="{f(cy + K * rr * math.sin(a))}" r="{f(rng.uniform(0.6, 1.3))}" fill="{P["ink"]}" opacity="0.7"/>')
    # a fleck of skin
    out.append(f'<path d="M{f(cx - r * 0.5)},{f(cy + K * r * 0.3)} q8,-6 16,-1 q-6,6 -16,1z" fill="{P["side"]}" stroke="{P["ink"]}" stroke-width="0.9"/>')


def mushroom(out, P, rng, cx, cy, s):
    """A mushroom slice standing on edge, with depth: cap, gills, and stem."""
    prof = []
    for i in range(41):
        t = math.pi * i / 40
        prof.append((-math.cos(t) * 1.0, -math.sin(t) * 0.92))
    prof += [(0.34, 0.0), (0.3, 0.85), (-0.3, 0.85), (-0.34, 0.0)]
    dx, dy = 10, -7
    front = [(cx + u * s, cy + v * s) for u, v in prof]
    back = [(x + dx, y + dy) for x, y in front]
    out.append(f'<ellipse cx="{f(cx + 8)}" cy="{f(cy + s * 0.9)}" rx="{f(s * 0.9)}" ry="{f(s * 0.16)}" fill="url(#shadow-{P["key"]})"/>')
    out.append(f'<path d="{poly(back)}" fill="{P["side"]}" stroke="{P["ink"]}" stroke-width="1.4" stroke-linejoin="round"/>')
    for i in range(0, 41, 4):
        (x1, y1), (x2, y2) = front[i], back[i]
        out.append(f'<path d="M{f(x1)},{f(y1)} L{f(x2)},{f(y2)}" stroke="{P["ink"]}" stroke-width="1"/>')
    out.append(f'<path d="{poly(front)}" fill="{P["top"]}" stroke="{P["ink"]}" stroke-width="1.8" stroke-linejoin="round"/>')
    gill = [(cx - math.cos(math.pi * i / 30) * 0.8 * s, cy - math.sin(math.pi * i / 30) * 0.62 * s) for i in range(31)]
    out.append(f'<path d="M' + " L".join(f"{f(x)},{f(y)}" for x, y in gill) + f'" fill="none" stroke="{P["ink"]}" stroke-width="1.2"/>')
    for i in range(2, 29, 2):
        t = math.pi * i / 30
        a = (cx - math.cos(t) * 0.8 * s, cy - math.sin(t) * 0.62 * s)
        b = (cx - math.cos(t) * 0.36 * s, cy - math.sin(t) * 0.08 * s)
        out.append(f'<path d="M{f(a[0])},{f(a[1])} L{f(b[0])},{f(b[1])}" stroke="{P["ink2"]}" stroke-width="0.9"/>')
    for v in (0.3, 0.5, 0.7):
        out.append(f'<path d="M{f(cx - 0.22 * s)},{f(cy + v * s)} q{f(0.22 * s)},{f(0.04 * s)} {f(0.44 * s)},0" fill="none" stroke="{P["ink2"]}" stroke-width="0.8"/>')


def label(out, P, x, y, tx, ty, num, name, anchor="start"):
    out.append(f'<path d="M{f(tx)},{f(ty)} L{f(x)},{f(y)}" stroke="{P["ink2"]}" stroke-width="1"/>')
    out.append(f'<circle cx="{f(tx)}" cy="{f(ty)}" r="2.5" fill="{P["ink"]}"/>')
    out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="15" fill="{P["bg"]}" stroke="{P["ink"]}" stroke-width="1.3"/>')
    out.append(f'<text x="{f(x)}" y="{f(y + 4.5)}" text-anchor="middle" font-family="{MONO}" font-size="13" fill="{P["ink"]}">{num}</text>')
    dx = 24 if anchor == "start" else -24
    out.append(f'<text x="{f(x + dx)}" y="{f(y + 5)}" text-anchor="{anchor}" font-family="{MONO}" font-size="14" fill="{P["ink"]}">{name}</text>')


def panel(out, key, ox):
    P = dict(PALETTES[key], key=key)
    rng = random.Random(5)
    out.append(f'<g transform="translate({ox},0)">')
    out.append(f'<rect width="800" height="760" fill="{P["bg"]}"/>')
    out.append(f'<rect width="800" height="760" fill="url(#grid-{key})"/>')
    out.append(f'<rect x="18" y="18" width="764" height="724" fill="none" stroke="{P["ink"]}" stroke-width="1.4"/>')
    out.append(f'<text x="44" y="70" font-family="{SERIF}" font-size="36" fill="{P["ink"]}">{P["title"]}</text>')
    out.append(f'<text x="44" y="96" font-family="{MONO}" font-size="13" fill="{P["ink2"]}">PARTS 6, 7, 8, 9. NOT TO SCALE.</text>')
    patty(out, P, rng, 270, 330, 165)
    potato(out, P, rng, 600, 300, 95)
    mushroom(out, P, rng, 590, 540, 70)
    label(out, P, 140, 175, 210, 290, 7, "Smash patty, 3 oz")
    label(out, P, 120, 520, 205, 395, 8, "American cheese, half slice")
    label(out, P, 690, 175, 640, 270, 6, "Smashed potato", "end")
    label(out, P, 700, 660, 600, 555, 9, "Mushroom slice", "end")
    out.append(f'<text x="330" y="560" font-family="{HAND}" font-size="26" fill="{P["accent"]}" transform="rotate(-4 330 560)">lacy edges = crunch</text>')
    out.append(f'<path d="M385,540 C410,500 430,450 420,405" fill="none" stroke="{P["accent"]}" stroke-width="1.8" marker-end="url(#arr-{key})"/>')
    out.append("</g>")


out = []
out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 760" width="1600" height="760">')
out.append("<defs><style>@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Instrument+Serif&amp;display=block');</style>")
for key, P in PALETTES.items():
    out.append(f'<pattern id="grid-{key}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="{P["grid"]}" stroke-width="0.7"/></pattern>')
    out.append(f'<pattern id="shadow-{key}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="{P["shade"]}" stroke-width="1.6"/></pattern>')
    out.append(f'<pattern id="cheese-{key}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><line x1="0" y1="0" x2="0" y2="9" stroke="{P["ink2"]}" stroke-width="0.8"/></pattern>')
    out.append(f'<marker id="arr-{key}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="{P["accent"]}"/></marker>')
out.append("</defs>")
panel(out, "blue", 0)
panel(out, "cream", 800)
out.append("</svg>")
sys.stdout.write("\n".join(out))
