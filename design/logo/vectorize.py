"""Centerline-vectorize the hand-drawn Toby logo into stroked SVG paths."""
import sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.morphology import skeletonize

src, out_svg, out_png = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert("RGBA")
a = np.asarray(im).astype(float)
lum = a[..., :3].mean(-1)
ink = (a[..., 3] > 128) & (lum < 128)

dist = ndimage.distance_transform_edt(ink)
sk = skeletonize(ink)
H, W = ink.shape
radius = float(np.median(dist[sk]))
print("stroke radius", radius, "ink px", ink.sum())

pts = set(zip(*np.nonzero(sk)))
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
def nbrs(p):
    return [(p[0] + dy, p[1] + dx) for dy, dx in N8 if (p[0] + dy, p[1] + dx) in pts]

deg = {p: len(nbrs(p)) for p in pts}
nodes = {p for p in pts if deg[p] != 2}

# trace edges between nodes
visited_e = set()
edges = []
for n in nodes:
    for q in nbrs(n):
        if (n, q) in visited_e:
            continue
        path = [n, q]
        visited_e.add((n, q)); visited_e.add((q, n))
        prev, cur = n, q
        while cur not in nodes:
            nx = [r for r in nbrs(cur) if r != prev and (cur, r) not in visited_e]
            if not nx:
                break
            nxt = nx[0]
            visited_e.add((cur, nxt)); visited_e.add((nxt, cur))
            path.append(nxt)
            prev, cur = cur, nxt
        edges.append(path)

# closed loops without nodes (not expected) are ignored
def plen(p):
    return sum(np.hypot(p[i][0] - p[i + 1][0], p[i][1] - p[i + 1][1]) for i in range(len(p) - 1))

# prune short spurs (endpoint -> junction) and tiny edges inside junction clusters
def is_end(p):
    return deg[p] == 1
kept = []
for e in edges:
    L = plen(e)
    if L < 3:
        continue
    if (is_end(e[0]) != is_end(e[-1])) and L < radius * 2.2:
        continue
    kept.append(e)
print("edges", len(edges), "kept", len(kept))

# merge edges that meet at a junction and continue smoothly (so each pen stroke is one path)
def endpoint_dir(e, at_start, k=12):
    seg = e[:k] if at_start else e[::-1][:k]
    v = np.array(seg[-1], float) - np.array(seg[0], float)
    return v / (np.linalg.norm(v) + 1e-9)  # pointing away from the endpoint, into the edge

def close(p, q, tol):
    return np.hypot(p[0] - q[0], p[1] - q[1]) <= tol

merged = True
while merged:
    merged = False
    best = None
    for i in range(len(kept)):
        for j in range(len(kept)):
            if i == j:
                continue
            ei, ej = kept[i], kept[j]
            # try ei end -> ej start (with reversals)
            for ri in (False, True):
                for rj in (False, True):
                    A = ei[::-1] if ri else ei
                    B = ej[::-1] if rj else ej
                    if not close(A[-1], B[0], radius * 1.6):
                        continue
                    if is_end(A[-1]) or is_end(B[0]):
                        continue
                    da = -endpoint_dir(A, at_start=False)  # direction of travel at A's end
                    db = endpoint_dir(B, at_start=True)
                    c = float(da @ db)
                    if c > 0.8 and (best is None or c > best[0]):
                        best = (c, i, j, A, B)
    if best:
        c, i, j, A, B = best
        new = A + B[1:]
        kept = [e for k, e in enumerate(kept) if k not in (i, j)] + [new]
        merged = True
print("strokes after merge", len(kept))

def rdp(P, eps):
    P = np.asarray(P, float)
    if len(P) < 3:
        return P
    s, e = P[0], P[-1]
    d = e - s
    n = np.hypot(*d)
    if n == 0:
        dists = np.hypot(*(P - s).T)
    else:
        dists = np.abs(d[0] * (P[:, 1] - s[1]) - d[1] * (P[:, 0] - s[0])) / n
    k = int(np.argmax(dists))
    if dists[k] > eps:
        return np.vstack([rdp(P[: k + 1], eps)[:-1], rdp(P[k:], eps)])
    return np.vstack([s, e])

def catmull(P):
    # length-aware Catmull-Rom -> cubic beziers (no overshoot on unevenly spaced points)
    if len(P) == 2:
        return f"M{P[0][0]:.1f} {P[0][1]:.1f}L{P[1][0]:.1f} {P[1][1]:.1f}"
    def tan(i):
        a = P[max(i - 1, 0)]; b = P[min(i + 1, len(P) - 1)]
        v = b - a
        return v / (np.hypot(*v) + 1e-9)
    d = f"M{P[0][0]:.1f} {P[0][1]:.1f}"
    for i in range(len(P) - 1):
        p1, p2 = P[i], P[i + 1]
        L = np.hypot(*(p2 - p1)) / 3
        c1 = p1 + tan(i) * L
        c2 = p2 - tan(i + 1) * L
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d

# junction centres: clusters of skeleton pixels with degree >= 3
jmask = np.zeros_like(sk)
for p in pts:
    if deg[p] >= 3:
        jmask[p] = True
jl, nj = ndimage.label(ndimage.binary_dilation(jmask, iterations=int(radius)))
jcent = [np.array(ndimage.center_of_mass(jl == k))[::-1] for k in range(1, nj + 1)]  # (x, y)
print("junctions", len(jcent))

def trim(xy, r):
    """Drop points within r of any junction centre, but only from the two ends of the path."""
    def near(p):
        return any(np.hypot(*(p - c)) < r for c in jcent)
    i, j = 0, len(xy)
    while i < j - 2 and near(xy[i]):
        i += 1
    while j - 2 > i and near(xy[j - 1]):
        j -= 1
    return xy[i:j], i > 0, j < len(xy)

strokes = []
for e in kept:
    xy = np.array([(c, r) for r, c in e], float)
    # a merged stroke passes through a junction in its middle: cut the wobbly pixels out there too
    keep = np.ones(len(xy), bool)
    for c in jcent:
        d = np.hypot(*(xy - c).T)
        inside = d < radius * 1.4
        # only remove interior runs (ends are handled by trim)
        idx = np.nonzero(inside)[0]
        if len(idx) and idx[0] > 0 and idx[-1] < len(xy) - 1:
            keep[idx] = False
    xy = xy[keep]
    xy, cut_start, cut_end = trim(xy, radius * 1.6)
    s = rdp(xy, 1.6)
    # branch strokes that were cut at a junction reach back into the junction centre
    for at_start, cut in ((True, cut_start), (False, cut_end)):
        if not cut:
            continue
        p = s[0] if at_start else s[-1]
        c = min(jcent, key=lambda c: np.hypot(*(p - c)))
        # pull the end toward the junction but stop at the parent stroke's edge
        v = c - p
        end = p + v * max(0.0, 1 - radius * 0.2 / (np.hypot(*v) + 1e-9))
        s = np.vstack([end, s]) if at_start else np.vstack([s, end])
    strokes.append(s)

# isolated blobs (the period) become a zero-length round-capped dot if skeleton missed them
lab, nlab = ndimage.label(ink)
covered = np.zeros(nlab + 1, bool)
for s in strokes:
    for x, y in s:
        covered[lab[int(round(y)), int(round(x))]] = True
for k in range(1, nlab + 1):
    if not covered[k]:
        ys, xs = np.nonzero(lab == k)
        strokes.append(np.array([[xs.mean(), ys.mean() - 0.01], [xs.mean(), ys.mean() + 0.01]]))
        print("added dot for blob", k)

# pen order: horizontal-ish strokes start at the left end, others at the top end
def orient(s):
    a0, a1 = s[0], s[-1]
    if abs(a0[1] - a1[1]) < 40:
        return s if a0[0] <= a1[0] else s[::-1]
    return s if a0[1] <= a1[1] else s[::-1]
strokes = [orient(s) for s in strokes]
strokes.sort(key=lambda s: s[0][0])
# a stroke that starts on another stroke (a branch) is drawn after that stroke
def seg_dist(p, b):
    best = 1e9
    for k in range(len(b) - 1):
        u, v = b[k], b[k + 1]
        t = np.clip(np.dot(p - u, v - u) / (np.dot(v - u, v - u) + 1e-9), 0, 1)
        best = min(best, np.hypot(*(u + t * (v - u) - p)))
    return best
def starts_on(a, b):
    return seg_dist(a[0], b) < radius * 2.5
changed = True
while changed:
    changed = False
    for i in range(len(strokes)):
        for j in range(i + 1, len(strokes)):
            if starts_on(strokes[i], strokes[j]) and not starts_on(strokes[j], strokes[i]):
                strokes.insert(j, strokes.pop(i))
                changed = True
                break
        if changed:
            break

pad = radius + 6
allp = np.vstack(strokes)
x0, y0 = allp.min(0) - pad
x1, y1 = allp.max(0) + pad
w, h = x1 - x0, y1 - y0
sw = radius * 2
paths = "\n".join(
    f'  <path d="{catmull(s - [x0, y0])}"/>' for s in strokes
)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" fill="none" stroke="currentColor" stroke-width="{sw:.1f}" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Toby">
{paths}
</svg>
'''
open(out_svg, "w").write(svg)
print("viewBox", round(w), round(h), "stroke-width", round(sw, 1), "paths", len(strokes))

# raster check: redraw polylines and compare with original ink
chk = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(chk)
for s in strokes:
    pl = [tuple(p) for p in s]
    if len(pl) > 1:
        dr.line(pl, fill=255, width=int(round(sw)), joint="curve")
    for p in (pl[0], pl[-1]):
        dr.ellipse([p[0] - radius, p[1] - radius, p[0] + radius, p[1] + radius], fill=255)
re = np.asarray(chk) > 128
iou = (re & ink).sum() / (re | ink).sum()
print("IoU vs original", round(float(iou), 4))
viz = np.zeros((H, W, 3), np.uint8) + 255
viz[ink & ~re] = (220, 40, 40)
viz[re & ~ink] = (40, 90, 220)
viz[re & ink] = (0, 0, 0)
Image.fromarray(viz).save(out_png)
