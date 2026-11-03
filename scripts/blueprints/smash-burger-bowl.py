"""Generates the Smash Burger Bowl blueprint sheet as SVG (1600 x 1100)."""
import math
import random
import sys

R = random.Random(11)
W, H = 1600, 1100
BG = "#1B4A86"
INK = "#EEF4FB"
INK2 = "#A9C4E6"
RED = "#FFA08A"
MONO = "'IBM Plex Mono', Menlo, monospace"
SERIF = "'Instrument Serif', Georgia, serif"
HAND = "'Caveat', 'Marker Felt', cursive"

out = []
add = out.append


def n(v):
    return f"{v:.1f}"


def closed_path(pts, smooth=True):
    if not smooth:
        return "M" + " L".join(f"{n(x)},{n(y)}" for x, y in pts) + "Z"
    k = len(pts)
    d = f"M{n(pts[0][0])},{n(pts[0][1])}"
    for i in range(k):
        p0, p1, p2, p3 = pts[(i - 1) % k], pts[i], pts[(i + 1) % k], pts[(i + 2) % k]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{n(c1[0])},{n(c1[1])} {n(c2[0])},{n(c2[1])} {n(p2[0])},{n(p2[1])}"
    return d + "Z"


def open_path(pts):
    d = f"M{n(pts[0][0])},{n(pts[0][1])}"
    k = len(pts)
    for i in range(k - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, k - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{n(c1[0])},{n(c1[1])} {n(c2[0])},{n(c2[1])} {n(p2[0])},{n(p2[1])}"
    return d


def ring(cx, cy, r, count, amp, smooth=1, rot=0.0, sx=1.0, sy=1.0, spikes=0.0, waves=None):
    rs = [1 + amp * (R.random() * 2 - 1) for _ in range(count)]
    for _ in range(smooth):
        rs = [(rs[i - 1] + 2 * rs[i] + rs[(i + 1) % count]) / 4 for i in range(count)]
    if spikes:
        rs = [v + (spikes * R.random() if R.random() < 0.3 else 0) for v in rs]
    if waves:
        k, a = waves
        ph = R.random() * 6.28
        rs = [rs[i] + a * math.sin(k * 2 * math.pi * i / count + ph) for i in range(count)]
    pts = []
    for i in range(count):
        t = 2 * math.pi * i / count
        x, y = r * rs[i] * math.cos(t) * sx, r * rs[i] * math.sin(t) * sy
        pts.append((cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)))
    return pts


def xf(points, cx, cy, rot, s=1.0):
    c, si = math.cos(rot), math.sin(rot)
    return [(cx + s * (x * c - y * si), cy + s * (x * si + y * c)) for x, y in points]


def text(x, y, s, size=13, fill=INK, anchor="start", family=MONO, weight=400, extra=""):
    add(f'<text x="{n(x)}" y="{n(y)}" font-family="{family}" font-size="{size}" fill="{fill}" '
        f'text-anchor="{anchor}" font-weight="{weight}" {extra}>{s}</text>')


def balloon(x, y, num, tx, ty):
    dx, dy = tx - x, ty - y
    d = math.hypot(dx, dy)
    sx, sy = x + dx / d * 15, y + dy / d * 15
    add(f'<path d="M{n(sx)},{n(sy)} L{n(tx)},{n(ty)}" stroke="{INK2}" stroke-width="0.9" fill="none"/>')
    add(f'<circle cx="{n(tx)}" cy="{n(ty)}" r="2.2" fill="{INK}"/>')
    add(f'<circle cx="{n(x)}" cy="{n(y)}" r="15" fill="{BG}" stroke="{INK}" stroke-width="1.2"/>')
    text(x, y + 4.5, str(num), 13, INK, "middle")


# ---------------------------------------------------------------- sheet
add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
add("<defs>")
add("<style>@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500&amp;family=IBM+Plex+Mono:wght@400;500&amp;family=Instrument+Serif&amp;display=block');</style>")
add(f'<pattern id="minor" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#235390" stroke-width="0.6"/></pattern>')
add(f'<pattern id="major" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#2C61A3" stroke-width="1"/></pattern>')
add(f'<pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="{INK}" stroke-width="0.9"/></pattern>')
add(f'<pattern id="cross" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6M0 0H6" stroke="{INK}" stroke-width="0.7"/></pattern>')
add(f'<pattern id="stip" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" fill="{INK}"/><circle cx="10" cy="2" r="0.8" fill="{INK}"/><circle cx="7" cy="9" r="1" fill="{INK}"/><circle cx="12" cy="12" r="0.8" fill="{INK}"/><circle cx="2" cy="12" r="0.7" fill="{INK}"/></pattern>')
add(f'<pattern id="wave" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 4 Q4 0 8 4 T16 4" fill="none" stroke="{INK}" stroke-width="0.8"/></pattern>')
add(f'<pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="{INK}"/></pattern>')
add(f'<pattern id="diag" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="5" stroke="{INK}" stroke-width="0.6"/></pattern>')
add('<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="context-stroke"/></marker>')
add("</defs>")
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#minor)"/>')
add(f'<rect width="{W}" height="{H}" fill="url(#major)"/>')

# frame with zone markers
add(f'<rect x="20" y="20" width="{W-40}" height="{H-40}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
add(f'<rect x="50" y="50" width="{W-100}" height="{H-100}" fill="none" stroke="{INK}" stroke-width="1"/>')
for i in range(8):
    x0 = 50 + i * (W - 100) / 8
    if i:
        add(f'<path d="M{n(x0)} 20V50M{n(x0)} {H-50}V{H-20}" stroke="{INK}" stroke-width="1"/>')
    text(x0 + (W - 100) / 16, 40, str(i + 1), 12, INK2, "middle")
    text(x0 + (W - 100) / 16, H - 30, str(i + 1), 12, INK2, "middle")
for i, L in enumerate("ABCDE"):
    y0 = 50 + i * (H - 100) / 5
    if i:
        add(f'<path d="M20 {n(y0)}H50M{W-50} {n(y0)}H{W-20}" stroke="{INK}" stroke-width="1"/>')
    text(35, y0 + (H - 100) / 10 + 4, L, 12, INK2, "middle")
    text(W - 35, y0 + (H - 100) / 10 + 4, L, 12, INK2, "middle")

LINE = f'stroke="{INK}" stroke-linejoin="round" stroke-linecap="round"'

# ---------------------------------------------------------------- view 1: plan
CX, CY, RB = 360, 430, 250
add(f'<circle cx="{CX}" cy="{CY}" r="{RB}" fill="{BG}" {LINE} stroke-width="2"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="{RB-16}" fill="none" {LINE} stroke-width="1"/>')
add(f'<circle cx="{CX}" cy="{CY}" r="150" fill="none" stroke="{INK2}" stroke-width="0.9" stroke-dasharray="7 5"/>')
add(f'<path d="M{CX} {CY-RB-22}V{CY+RB+22}" stroke="{INK2}" stroke-width="0.9" stroke-dasharray="22 5 3 5"/>')


def inside(x, y, r=RB - 24):
    return math.hypot(x - CX, y - CY) < r


# cold side: romaine
pieces = []
tries = 0
while len(pieces) < 34 and tries < 4000:
    tries += 1
    x, y = R.uniform(CX - 230, CX - 14), R.uniform(CY - 230, CY + 230)
    if inside(x, y, RB - 40) and all(math.hypot(x - a, y - b) > 30 for a, b, *_ in pieces):
        pieces.append((x, y, R.uniform(24, 36), R.uniform(11, 16), R.uniform(0, math.pi)))
for x, y, L, Wd, rot in sorted(pieces, key=lambda p: p[1]):
    pts = []
    m = 34
    ph = R.random() * 6
    for i in range(m):
        t = 2 * math.pi * i / m
        rr = 1 + 0.06 * math.sin(7 * t + ph) + 0.03 * (R.random() - 0.5)
        pts.append((L * math.cos(t) * rr, Wd * math.sin(t) * rr * (1 - 0.25 * math.cos(t))))
    add(f'<path d="{closed_path(xf(pts, x, y, rot))}" fill="{BG}" {LINE} stroke-width="1.2"/>')
    rib = xf([(-L * 0.85, 0), (0, Wd * 0.08), (L * 0.85, 0)], x, y, rot)
    add(f'<path d="{open_path(rib)}" fill="none" {LINE} stroke-width="0.9"/>')
    for k in (-0.45, 0, 0.45):
        for sgn in (-1, 1):
            v = xf([(L * k, 0), (L * k + L * 0.22, sgn * Wd * 0.62)], x, y, rot)
            add(f'<path d="M{n(v[0][0])},{n(v[0][1])}L{n(v[1][0])},{n(v[1][1])}" stroke="{INK2}" stroke-width="0.6"/>')

# tomato dice
placed = []
for _ in range(11):
    for _ in range(200):
        x, y = R.uniform(CX - 200, CX - 30), R.uniform(CY - 180, CY + 190)
        if inside(x, y, RB - 50) and all(math.hypot(x - a, y - b) > 26 for a, b in placed):
            placed.append((x, y))
            break
for x, y in placed:
    s = R.uniform(9, 12)
    rot = R.uniform(0, 1.5)
    sq = xf([(-s, -s), (s, -s * 0.9), (s * 0.95, s), (-s * 0.9, s * 0.95)], x, y, rot)
    add(f'<path d="{closed_path(sq, smooth=False)}" fill="{BG}" {LINE} stroke-width="1.3"/>')
    arc = xf([(-s * 0.55, s * 0.1), (0, -s * 0.5), (s * 0.55, s * 0.1)], x, y, rot)
    add(f'<path d="{open_path(arc)}" fill="none" stroke="{INK}" stroke-width="0.8"/>')
    for sx_, sy_ in ((-0.2, 0.25), (0.2, 0.2)):
        p = xf([(s * sx_, s * sy_)], x, y, rot)[0]
        add(f'<ellipse cx="{n(p[0])}" cy="{n(p[1])}" rx="1.4" ry="0.9" fill="{INK}"/>')

# diced raw onion
for _ in range(16):
    x, y = R.uniform(CX - 210, CX - 25), R.uniform(CY - 200, CY + 200)
    if not inside(x, y, RB - 45):
        continue
    s = R.uniform(4, 5.5)
    sq = xf([(-s, -s), (s, -s), (s, s), (-s, s)], x, y, R.uniform(0, 1.5))
    add(f'<path d="{closed_path(sq, smooth=False)}" fill="{BG}" stroke="{INK}" stroke-width="1"/>')

# pickle chips
chips = [(CX - 150, CY + 120), (CX - 95, CY - 150), (CX - 60, CY + 60), (CX - 175, CY - 40), (CX - 110, CY + 185)]
for x, y in chips:
    pts = ring(x, y, 14, 48, 0.02, smooth=1, waves=(16, 0.07))
    add(f'<path d="{closed_path(pts)}" fill="{BG}" {LINE} stroke-width="1.3"/>')
    add(f'<circle cx="{n(x)}" cy="{n(y)}" r="9.5" fill="none" stroke="{INK2}" stroke-width="0.8" stroke-dasharray="2 2"/>')
    for i in range(6):
        t = i * math.pi / 3 + 0.3
        add(f'<ellipse cx="{n(x + 5 * math.cos(t))}" cy="{n(y + 5 * math.sin(t))}" rx="1.6" ry="1" fill="{INK}" transform="rotate({n(math.degrees(t))} {n(x + 5 * math.cos(t))} {n(y + 5 * math.sin(t))})"/>')

# hot side: potatoes
potatoes = [(CX + 75, CY + 45, 40), (CX + 152, CY + 105, 38), (CX + 62, CY + 145, 38)]
for x, y, r in potatoes:
    pts = ring(x, y, r, 22, 0.15, smooth=0)
    add(f'<path d="{closed_path(pts, smooth=False)}" fill="{BG}" {LINE} stroke-width="1.6"/>')
    inner = ring(x, y, r * 0.78, 18, 0.12, smooth=1)
    add(f'<path d="{closed_path(inner)}" fill="none" stroke="{INK2}" stroke-width="0.8"/>')
    for _ in range(3):
        a = R.uniform(0, 6.28)
        p = [(x + r * 0.15 * math.cos(a), y + r * 0.15 * math.sin(a))]
        for j in range(3):
            a += R.uniform(-0.6, 0.6)
            p.append((p[-1][0] + r * 0.18 * math.cos(a), p[-1][1] + r * 0.18 * math.sin(a)))
        add(f'<path d="M' + " L".join(f"{n(a_)},{n(b_)}" for a_, b_ in p) + f'" fill="none" stroke="{INK}" stroke-width="0.9"/>')
    for _ in range(28):
        a, rr = R.uniform(0, 6.28), r * 0.72 * math.sqrt(R.random())
        add(f'<circle cx="{n(x + rr * math.cos(a))}" cy="{n(y + rr * math.sin(a))}" r="{n(R.uniform(0.5, 1.1))}" fill="{INK}"/>')

# patties with half slices of cheese
patties = [(CX + 80, CY - 135, 57), (CX + 160, CY - 30, 55)]
for idx, (x, y, r) in enumerate(patties):
    pts = ring(x, y, r, 80, 0.05, smooth=1, spikes=0.09)
    add(f'<path d="{closed_path(pts)}" fill="{BG}" {LINE} stroke-width="1.7"/>')
    for _ in range(70):
        a, rr = R.uniform(0, 6.28), r * (0.25 + 0.7 * math.sqrt(R.random()))
        px, py = x + rr * math.cos(a), y + rr * math.sin(a)
        b = R.uniform(0, 6.28)
        L = R.uniform(3, 6)
        add(f'<path d="M{n(px)},{n(py)} q{n(L * math.cos(b) / 2 + 1.5)},{n(L * math.sin(b) / 2 - 1.5)} {n(L * math.cos(b))},{n(L * math.sin(b))}" fill="none" stroke="{INK2}" stroke-width="0.8"/>')
    s = 44
    rot = 0.5 + idx * 1.4
    tri = [(-s * 0.6, -s * 0.55), (s * 0.75, -s * 0.5), (-s * 0.55, s * 0.8)]
    edge = []
    for i in range(3):
        a_, b_ = tri[i], tri[(i + 1) % 3]
        for k in range(6):
            t = k / 6
            edge.append((a_[0] + (b_[0] - a_[0]) * t + R.uniform(-1.2, 1.2), a_[1] + (b_[1] - a_[1]) * t + R.uniform(-1.2, 1.2)))
    add(f'<path d="{closed_path(xf(edge, x, y, rot))}" fill="{BG}" {LINE} stroke-width="1.3"/>')
    add(f'<path d="{closed_path(xf(edge, x, y, rot, 0.999))}" fill="url(#diag)" opacity="0.55"/>')
    drip = xf([(s * 0.1, s * 0.15), (s * 0.18, s * 0.42), (s * 0.3, s * 0.45), (s * 0.32, s * 0.12)], x, y, rot)
    add(f'<path d="{open_path(drip)}" fill="{BG}" {LINE} stroke-width="1.2"/>')

# mushrooms and onion strips in the gaps
avoid = [(x, y, r + 12) for x, y, r in potatoes] + [(x, y, r + 12) for x, y, r in patties]
mush = []
for _ in range(2000):
    if len(mush) >= 13:
        break
    x, y = R.uniform(CX + 20, CX + 230), R.uniform(CY - 220, CY + 220)
    if inside(x, y, RB - 40) and all(math.hypot(x - a, y - b) > r for a, b, r in avoid) and all(math.hypot(x - a, y - b) > 26 for a, b, _ in mush):
        mush.append((x, y, R.uniform(0, 6.28)))
for i, (x, y, rot) in enumerate(mush):
    if i % 3 == 2:
        arc_o = xf([(-15, 4), (-6, -6), (6, -6), (15, 4)], x, y, rot)
        arc_i = xf([(-11, 5), (-4, -1), (4, -1), (11, 5)], x, y, rot)
        add(f'<path d="{open_path(arc_o)}" fill="none" {LINE} stroke-width="1.4"/>')
        add(f'<path d="{open_path(arc_i)}" fill="none" stroke="{INK2}" stroke-width="1"/>')
        continue
    s = R.uniform(12, 15)
    cap = [(-1, 0), (-0.95, -0.55), (-0.5, -0.92), (0, -1), (0.5, -0.92), (0.95, -0.55), (1, 0),
           (0.34, 0.02), (0.3, 0.85), (-0.3, 0.85), (-0.34, 0.02)]
    shape = xf([(a * s, b * s) for a, b in cap], x, y, rot)
    add(f'<path d="{closed_path(shape, smooth=False)}" fill="{BG}" {LINE} stroke-width="1.3"/>')
    gill = xf([(-0.78 * s, -0.08 * s), (0, -0.7 * s), (0.78 * s, -0.08 * s)], x, y, rot)
    add(f'<path d="{open_path(gill)}" fill="none" stroke="{INK2}" stroke-width="0.8"/>')

# sauce drizzle across both sides
A, B = (CX - 175, CY - 150), (CX + 165, CY + 175)
L = math.hypot(B[0] - A[0], B[1] - A[1])
ux, uy = (B[0] - A[0]) / L, (B[1] - A[1]) / L
pts = []
for i in range(120):
    s = i / 119
    off = 15 * math.sin(2 * math.pi * s * 9) * (0.8 + 0.2 * math.sin(7 * s))
    pts.append((A[0] + ux * L * s - uy * off, A[1] + uy * L * s + ux * off))
add(f'<path d="{open_path(pts)}" fill="none" stroke="{BG}" stroke-width="6" stroke-linecap="round"/>')
add(f'<path d="{open_path(pts)}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>')

# ramekin of beans
RX, RY = 655, 735
add(f'<circle cx="{RX}" cy="{RY}" r="62" fill="{BG}" {LINE} stroke-width="1.8"/>')
add(f'<circle cx="{RX}" cy="{RY}" r="54" fill="none" stroke="{INK}" stroke-width="1"/>')
beans = []
for _ in range(600):
    if len(beans) >= 15:
        break
    a, rr = R.uniform(0, 6.28), 44 * math.sqrt(R.random())
    x, y = RX + rr * math.cos(a), RY + rr * math.sin(a)
    if all(math.hypot(x - p, y - q) > 15 for p, q in beans):
        beans.append((x, y))
for x, y in beans:
    rot = R.uniform(0, 180)
    add(f'<g transform="rotate({n(rot)} {n(x)} {n(y)})"><ellipse cx="{n(x)}" cy="{n(y)}" rx="8" ry="5" fill="{BG}" stroke="{INK}" stroke-width="1.1"/>'
        f'<path d="M{n(x - 2.5)},{n(y - 4.6)} q2.5,2 5,0" fill="none" stroke="{INK}" stroke-width="0.8"/></g>')
for _ in range(60):
    a, rr = R.uniform(0, 6.28), 50 * math.sqrt(R.random())
    add(f'<circle cx="{n(RX + rr * math.cos(a))}" cy="{n(RY + rr * math.sin(a))}" r="0.6" fill="{INK2}"/>')

# section line A-A and detail B marker
add(f'<path d="M{CX - RB - 40},{CY}H{CX + RB + 40}" stroke="{INK}" stroke-width="1.1" stroke-dasharray="26 6 4 6"/>')
for xa in (CX - RB - 40, CX + RB + 40):
    add(f'<path d="M{xa},{CY}V{CY - 26}" stroke="{INK}" stroke-width="1.6" marker-end="url(#arr)"/>')
    text(xa + 14, CY - 30, "A", 18, INK, "start", weight=500)
bx, by = patties[1][0] + 56, patties[1][1] + 6
add(f'<circle cx="{n(bx)}" cy="{n(by)}" r="20" fill="none" stroke="{INK}" stroke-width="1.1" stroke-dasharray="5 3"/>')
text(bx + 24, by - 18, "B", 16, INK, "start", weight=500)

# hot / cold brackets
for x0, x1, label in ((CX - 225, CX - 12, "Cold side, crisp"), (CX + 12, CX + 225, "Hot side, 160°F")):
    add(f'<path d="M{x0},{CY - RB - 30}V{CY - RB - 38}H{x1}V{CY - RB - 30}" fill="none" stroke="{INK}" stroke-width="1.1"/>')
    text((x0 + x1) / 2, CY - RB - 46, label, 14, INK, "middle", weight=500)

# balloons
balloon(CX - 268, CY - 150, 2, pieces[3][0], pieces[3][1])
balloon(CX - 300, CY + 85, 3, placed[2][0], placed[2][1])
balloon(CX - 265, CY + 170, 4, CX - 170, CY + 150)
balloon(CX - 200, CY + 250, 5, chips[4][0] - 10, chips[4][1] + 8)
balloon(CX - 238, CY - 238, 10, A[0] + 40, A[1] + 30)
balloon(CX + 205, CY - 250, 7, patties[0][0] + 30, patties[0][1] - 40)
balloon(CX + 282, CY - 135, 8, patties[1][0] + 5, patties[1][1] - 10)
balloon(CX + 300, CY + 70, 9, mush[0][0], mush[0][1])
balloon(CX + 280, CY + 175, 6, potatoes[1][0] + 25, potatoes[1][1] + 20)
balloon(CX - 40, CY + RB + 45, 1, CX - 30, CY + RB - 2)
balloon(RX + 95, RY - 40, 11, RX + 40, RY - 10)

# redlines
add(f'<text x="{CX + 172}" y="{CY - 200}" font-family="{HAND}" font-size="22" fill="{RED}">smash once, hard</text>')
add(f'<path d="M{CX + 205},{CY - 192} C{CX + 222},{CY - 160} {CX + 208},{CY - 120} {CX + 188},{CY - 98}" fill="none" stroke="{RED}" stroke-width="1.6" marker-end="url(#arr)"/>')
add(f'<text x="{CX + 110}" y="{CY + 275}" font-family="{HAND}" font-size="22" fill="{RED}">dry = crisp</text>')
add(f'<path d="M{CX + 130},{CY + 258} C{CX + 118},{CY + 235} {CX + 100},{CY + 215} {CX + 85},{CY + 188}" fill="none" stroke="{RED}" stroke-width="1.6" marker-end="url(#arr)"/>')

text(110, 805, "View 1, plan. The bowl from above.", 15, INK, weight=500)
add(f'<path d="M110 812H420" stroke="{INK}" stroke-width="1"/>')

# ---------------------------------------------------------------- section A-A
SX0, SX1, STOP, SBOT = 900, 1320, 150, 305
SC = (SX0 + SX1) / 2
outer = f"M{SX0},{STOP} C{SX0 + 4},{STOP + 95} {SC - 120},{SBOT} {SC},{SBOT} C{SC + 120},{SBOT} {SX1 - 4},{STOP + 95} {SX1},{STOP}"
inner_pts = (SX0 + 13, SX1 - 13, SBOT - 13)
inner = f"M{inner_pts[0]},{STOP} C{inner_pts[0] + 4},{STOP + 88} {SC - 112},{inner_pts[2]} {SC},{inner_pts[2]} C{SC + 112},{inner_pts[2]} {inner_pts[1] - 4},{STOP + 88} {inner_pts[1]},{STOP}"
add(f'<clipPath id="bowlIn"><path d="{inner} Z"/></clipPath>')
wall = outer + f" L{inner_pts[1]},{STOP} C{inner_pts[1] - 4},{STOP + 88} {SC + 112},{inner_pts[2]} {SC},{inner_pts[2]} C{SC - 112},{inner_pts[2]} {inner_pts[0] + 4},{STOP + 88} {inner_pts[0]},{STOP} Z"
add(f'<path d="{wall}" fill="{BG}"/>')
add(f'<path d="{wall}" fill="url(#hatch)" stroke="{INK}" stroke-width="1.6" stroke-linejoin="round"/>')
add(f'<path d="M{SC - 45},{SBOT - 2} V{SBOT + 13} H{SC + 45} V{SBOT - 2}" fill="url(#hatch)" stroke="{INK}" stroke-width="1.4"/>')
add('<g clip-path="url(#bowlIn)">')
# cold side romaine mass
top = [(SX0, 260)]
for i in range(13):
    x = SX0 + 20 + i * 16
    top.append((x, 196 + 10 * math.sin(i * 1.3) + (x - SC) ** 2 / 900 * 0.6))
top += [(SC, 214), (SC, 330), (SX0, 330)]
add(f'<path d="{closed_path(top, smooth=False)}" fill="url(#wave)" stroke="{INK}" stroke-width="1.2"/>')
for x in (930, 975, 1015, 1060, 1090):
    s = 8
    add(f'<rect x="{x - s}" y="{198 + (x % 3) * 4}" width="{2 * s}" height="{2 * s - 2}" fill="{BG}" stroke="{INK}" stroke-width="1.2"/>')
    add(f'<circle cx="{x - 2}" cy="{206 + (x % 3) * 4}" r="1.3" fill="{INK}"/>')
for x in (950, 1000, 1045):
    add(f'<ellipse cx="{x}" cy="{192 + (x % 2) * 3}" rx="12" ry="3" fill="{BG}" stroke="{INK}" stroke-width="1.1"/>')
# hot side
for x in (SC + 30, SC + 95, SC + 160):
    add(f'<path d="M{x - 30},{288 - (x - SC) / 6} q0,-18 8,-20 h44 q8,2 8,20 q-30,8 -60,0z" fill="url(#stip)" stroke="{INK}" stroke-width="1.3"/>')
for x0, x1, y in ((SC + 10, SC + 108, 240), (SC + 100, SC + 196, 232)):
    top_e = [(x0 + 4 + i * (x1 - x0 - 8) / 10, y + R.uniform(-1, 1)) for i in range(11)]
    bot_e = [(x1 - 4 - i * (x1 - x0 - 8) / 10, y + 11 + R.uniform(-1, 1)) for i in range(11)]
    lace_r = [(x1 + R.uniform(0, 5), y + 3), (x1 - 2, y + 6), (x1 + R.uniform(0, 5), y + 9)]
    lace_l = [(x0 - R.uniform(0, 5), y + 9), (x0 + 2, y + 6), (x0 - R.uniform(0, 5), y + 3)]
    slab = top_e + lace_r + bot_e + lace_l
    add(f'<path d="{closed_path(slab, smooth=False)}" fill="url(#cross)" stroke="{INK}" stroke-width="1.3"/>')
    add(f'<path d="M{x0 + 10},{y - 1} H{x1 - 14} v-4 H{x0 + 10}z" fill="{BG}" stroke="{INK}" stroke-width="1.1"/>')
    add(f'<path d="M{x1 - 18},{y - 1} q1,9 4,10 q3,-1 3,-10" fill="{BG}" stroke="{INK}" stroke-width="1.1"/>')
for x in (SC + 28, SC + 74, SC + 128, SC + 176):
    add(f'<path d="M{x - 13},{222} C{x - 13},{208} {x + 13},{208} {x + 13},{222} H{x + 4} V{229} H{x - 4} V{222} Z" fill="{BG}" stroke="{INK}" stroke-width="1.2"/>')
    add(f'<path d="M{x - 9},{219} C{x - 8},{212} {x + 8},{212} {x + 9},{219}" fill="none" stroke="{INK2}" stroke-width="0.8"/>')
for cx_, w_, y_ in ((SX0 + 70, 46, 186), (SX0 + 150, 40, 190), (SC + 40, 44, 202), (SC + 130, 50, 206)):
    add(f'<path d="M{cx_ - w_ / 2},{y_} C{cx_ - w_ / 3},{y_ - 9} {cx_ + w_ / 3},{y_ - 9} {cx_ + w_ / 2},{y_} C{cx_ + w_ / 4},{y_ + 4} {cx_ - w_ / 4},{y_ + 4} {cx_ - w_ / 2},{y_} Z" fill="url(#dots)" stroke="{INK}" stroke-width="1.2"/>')
add("</g>")
add(f'<path d="M{SC},{STOP - 25}V{SBOT + 30}" stroke="{INK2}" stroke-width="0.9" stroke-dasharray="22 5 3 5"/>')
text(SC - 105, STOP - 12, "cold", 13, INK2, "middle")
text(SC + 105, STOP - 12, "hot", 13, INK2, "middle")
text(SX0, 362, "Section A-A. The layers, side on.", 15, INK, weight=500)
add(f'<path d="M{SX0} 369H{SX0 + 288}" stroke="{INK}" stroke-width="1"/>')
legend = [("hatch", "Ceramic"), ("wave", "Romaine"), ("stip", "Potato"), ("cross", "Beef"), ("diag", "Cheese"), ("dots", "Sauce")]
for i, (pid, label) in enumerate(legend):
    y = 130 + i * 34
    add(f'<rect x="1365" y="{y}" width="34" height="20" fill="url(#{pid})" stroke="{INK}" stroke-width="1"/>')
    text(1410, y + 15, label, 13, INK)

# ---------------------------------------------------------------- detail B
DX, DY, DR = 985, 575, 105
add(f'<clipPath id="detail"><circle cx="{DX}" cy="{DY}" r="{DR}"/></clipPath>')
add(f'<circle cx="{DX}" cy="{DY}" r="{DR}" fill="{BG}"/>')
add('<g clip-path="url(#detail)">')
edge = []
for i in range(14):
    y = 548 + i * 3.7
    edge.append((1040 + R.uniform(-6, 12) + (8 if i in (4, 9) else 0), y))
slab = [(860, 548)] + edge + [(860, 600)]
add(f'<path d="{closed_path(slab, smooth=False)}" fill="url(#stip)" stroke="{INK}" stroke-width="1.6"/>')
add(f'<path d="M860,548 H{edge[0][0]} L{edge[2][0]},{edge[2][1]} H860z" fill="url(#cross)"/>')
add(f'<path d="M860,600 H{edge[-1][0]} L{edge[-3][0]},{edge[-3][1]} H860z" fill="url(#cross)"/>')
for hx, hy in ((1030, 566), (1022, 584), (1042, 578)):
    add(f'<ellipse cx="{hx}" cy="{hy}" rx="4" ry="2.4" fill="{BG}" stroke="{INK}" stroke-width="0.9"/>')
add(f'<path d="M860,541 H1012 q6,0 6,8 v18 q0,6 -5,6 q-5,0 -5,-6 v-12 H860z" fill="url(#diag)" stroke="{INK}" stroke-width="1.3"/>')
add("</g>")
add(f'<circle cx="{DX}" cy="{DY}" r="{DR}" fill="none" stroke="{INK}" stroke-width="1.6"/>')
add(f'<path d="M868,548H848M868,600H848M856,548V600" stroke="{INK}" stroke-width="1" fill="none"/>')
text(843, 570, "as thin as", 12, INK, "end")
text(843, 586, "you can", 12, INK, "end")
add(f'<text x="905" y="438" font-family="{HAND}" font-size="22" fill="{RED}">hands off for 2 min.</text>')
add(f'<text x="905" y="460" font-family="{HAND}" font-size="22" fill="{RED}">this crust is the flavor.</text>')
add(f'<path d="M1080,452 C1110,470 1080,520 1040,548" fill="none" stroke="{RED}" stroke-width="1.6" marker-end="url(#arr)"/>')
text(DX, 708, "Detail B, scale 4:1. The crust.", 15, INK, "middle", weight=500)

# ---------------------------------------------------------------- parts list
PX, PY, RH = 1150, 455, 22
cols = [PX, PX + 44, PX + 248, 1530]
rows = [("Item", "Part", "Qty")] + [
    ("1", "Bowl, wide", "1"),
    ("2", "Romaine, chopped", "2 cups"),
    ("3", "Tomato, diced", "1 small"),
    ("4", "Onion, diced, raw", "1/4"),
    ("5", "Dill pickle chips", "1/4 cup"),
    ("6", "Crispy potatoes", "8 oz"),
    ("7", "Smash patty, 90% lean", "2 (6 oz)"),
    ("8", "American cheese", "1 slice, halved"),
    ("9", "Mushrooms and onions", "1 cup"),
    ("10", "Special sauce", "1 batch"),
    ("11", "Smoky pinto beans", "1/2 cup"),
]
add(f'<rect x="{PX}" y="{PY}" width="{1530 - PX}" height="{RH * len(rows)}" fill="{BG}" stroke="{INK}" stroke-width="1.4"/>')
for i, row in enumerate(rows):
    y = PY + i * RH
    if i:
        add(f'<path d="M{PX},{y}H1530" stroke="{INK2}" stroke-width="{1.2 if i == 1 else 0.6}"/>')
    for j, cell in enumerate(row):
        text(cols[j] + 7, y + 15.5, cell, 12.5, INK if i else INK2, weight=500 if i == 0 else 400)
for c in cols[1:3]:
    add(f'<path d="M{c},{PY}V{PY + RH * len(rows)}" stroke="{INK2}" stroke-width="0.6"/>')
text(PX, PY - 12, "Parts list", 15, INK, weight=500)

# ---------------------------------------------------------------- schedule
GX0, GX1, GY = 250, 790, 862
sched = [
    ("Potatoes", [(0, 6, 1), (6, 11, 0), (11, 26, 1)]),
    ("Sauce", [(1, 3, 1), (3, 27, 0)]),
    ("Beans", [(6, 12, 1), (12, 28, 0)]),
    ("Mushrooms", [(12, 18, 1)]),
    ("Cold side", [(18, 20, 1)]),
    ("Burgers", [(21, 24, 0), (24, 27, 1)]),
    ("Build", [(27, 28, 1)]),
]
k = (GX1 - GX0) / 30
text(110, GY - 14, "Schedule, minutes. Solid is hands on, outline is waiting.", 15, INK, weight=500)
for i, (label, segs) in enumerate(sched):
    y = GY + i * 21
    text(110, y + 13, label, 12.5, INK)
    for a, b, active in segs:
        x0, x1 = GX0 + a * k, GX0 + b * k
        if active:
            add(f'<rect x="{n(x0)}" y="{y + 3}" width="{n(x1 - x0)}" height="12" fill="{INK}"/>')
        else:
            add(f'<rect x="{n(x0)}" y="{y + 3}" width="{n(x1 - x0)}" height="12" fill="none" stroke="{INK2}" stroke-width="1" stroke-dasharray="4 3"/>')
ay = GY + 7 * 21 + 6
add(f'<path d="M{GX0},{ay}H{GX1}" stroke="{INK}" stroke-width="1"/>')
for m in range(0, 31, 5):
    x = GX0 + m * k
    add(f'<path d="M{n(x)},{ay}V{ay + 5}" stroke="{INK}" stroke-width="1"/>')
    add(f'<path d="M{n(x)},{GY}V{ay}" stroke="{INK2}" stroke-width="0.4" stroke-dasharray="2 4"/>')
    text(x, ay + 19, str(m), 12, INK2, "middle")

# ---------------------------------------------------------------- notes
text(860, 790, "Notes", 15, INK, weight=500)
notes = [
    "1. Pan smoking hot for patties.",
    "2. Parchment on top to smash.",
    "3. Hands off 2 min for crust.",
    "4. Dry potatoes crisp. Wet steam.",
    "5. Salt lightly. The toppings",
    "   are already salty.",
    "6. Ground beef is done at 160°F.",
]
for i, line in enumerate(notes):
    indent = 26 if line.startswith(" ") else 0
    text(860 + indent, 820 + i * 25, line.strip(), 12.5, INK)

# ---------------------------------------------------------------- title block
TX0, TX1, TY0, TY1 = 1150, 1530, 760, 1035
add(f'<rect x="{TX0}" y="{TY0}" width="{TX1 - TX0}" height="{TY1 - TY0}" fill="{BG}" stroke="{INK}" stroke-width="1.6"/>')
for y in (840, 880, 920, 960):
    add(f'<path d="M{TX0},{y}H{TX1}" stroke="{INK}" stroke-width="0.9"/>')
add(f'<path d="M1345,840V960" stroke="{INK}" stroke-width="0.9"/>')
text(TX0 + 14, 784, "Liam's kitchen, recipe drawing", 12, INK2)
text(TX0 + 14, 826, "Smash Burger Bowl", 38, INK, family=SERIF)
cells = [("Dwg no. SBB-01", "Rev B"), ("Serves 1", "30 min total"), ("Drawn L. Davis", "2026-11-02")]
for i, (a, b) in enumerate(cells):
    y = 840 + i * 40 + 25
    text(TX0 + 14, y, a, 13, INK)
    text(1359, y, b, 13, INK)
text(TX0 + 14, 988, "Taste test", 13, INK2)
add(f'<rect x="{TX0 + 14}" y="998" width="18" height="18" fill="none" stroke="{INK}" stroke-width="1.3"/>')
text(TX0 + 42, 1012, "Grandma, pending", 14, INK)

add("</svg>")
sys.stdout.write("\n".join(out))
