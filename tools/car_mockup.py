"""Procedural top-down pixel cars (~40px long) for Monte Carlo Valet mockup.
Each car = body profile (half-width along length) + cabin + details. Faces right."""
from PIL import Image, ImageDraw, ImageFont
import math, random

def hexc(h): h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (255,)
def shade(c, f): return tuple(max(0, min(255, int(v * f))) for v in c[:3]) + (255,)
INK, GLASS, GLASS_HI = hexc('101018'), hexc('1d2b53'), hexc('5f8fd0')
HEAD, TAIL, CHROME, GOLD = hexc('fff1a8'), hexc('ff2244'), hexc('d8dde6'), hexc('ffcc33')
TIRE = hexc('22222a')

# Profiles: list of (x fraction from rear, half-width). Cabin: (start,end) fractions, windshield len, inset.
BODIES = {
  'hatch':  dict(L=30, prof=[(0,5),(0.05,7),(0.9,7),(1,5)], cab=(0.14,0.70), ws=4, inset=1),
  'van':    dict(L=36, prof=[(0,6),(0.04,8),(0.88,8),(1,6)], cab=(0.06,0.80), ws=4, inset=1),
  'sedan':  dict(L=38, prof=[(0,5),(0.06,7),(0.9,7),(1,5)], cab=(0.28,0.68), ws=5, inset=1),
  'suv':    dict(L=40, prof=[(0,6),(0.04,8),(0.92,8),(1,7)], cab=(0.18,0.80), ws=4, inset=1),
  'exec':   dict(L=44, prof=[(0,6),(0.06,8),(0.9,8),(1,6)], cab=(0.30,0.68), ws=6, inset=1),
  'sports': dict(L=40, prof=[(0,7),(0.08,9),(0.35,9),(0.6,8),(0.85,7),(1,4)], cab=(0.36,0.66), ws=6, inset=2),
  'super':  dict(L=42, prof=[(0,8),(0.06,9),(0.3,9),(0.55,8),(0.8,6),(1,3)], cab=(0.32,0.62), ws=7, inset=2),
  'luxury': dict(L=48, prof=[(0,7),(0.05,9),(0.94,9),(1,8)], cab=(0.26,0.62), ws=5, inset=1),
  'ferr':   dict(L=46, prof=[(0,8),(0.05,10),(0.3,11),(0.5,9),(0.72,10),(0.9,8),(1,4)], cab=(0.38,0.62), ws=6, inset=3),
  'lambo':  dict(L=46, prof=[(0,9),(0.04,11),(0.35,11),(0.55,9),(0.82,7),(1,3)], cab=(0.36,0.62), ws=8, inset=3),
  'mcl':    dict(L=46, prof=[(0,8),(0.06,10),(0.32,11),(0.6,9),(0.85,7),(1,4)], cab=(0.36,0.66), ws=7, inset=3),
  'bug':    dict(L=48, prof=[(0,9),(0.05,11),(0.3,11),(0.6,10),(0.88,8),(1,5)], cab=(0.36,0.64), ws=6, inset=3),
  'rolls':  dict(L=54, prof=[(0,8),(0.04,10),(0.96,10),(1,9)], cab=(0.18,0.52), ws=5, inset=1),
  'bent':   dict(L=52, prof=[(0,8),(0.05,10),(0.9,10),(1,8)], cab=(0.22,0.56), ws=5, inset=1),
  'limo':   dict(L=66, prof=[(0,6),(0.03,8),(0.95,8),(1,6)], cab=(0.14,0.84), ws=5, inset=1),
}
def halfw(b, x):
    t = x / (b['L'] - 1); P = b['prof']
    for (a, wa), (c, wc) in zip(P, P[1:]):
        if a <= t <= c: return wa + (wc - wa) * ((t - a) / (c - a) if c > a else 0)
    return P[-1][1]

def draw_car(kind, paint, extras=(), seed=1):
    b = BODIES[kind]; L = b['L']; W = max(w for _, w in b['prof']); H = W * 2 + 5
    img = Image.new('RGBA', (L + 6, H + 8), (0, 0, 0, 0)); px = img.load(); cy = (H + 8) // 2; ox = 3
    rnd = random.Random(seed); P = hexc(paint)
    hw = [int(round(halfw(b, x))) for x in range(L)]
    for x in range(L):
        for y in range(-hw[x] + 1, hw[x] + 2): px[ox + x + 2, cy + y + 1] = (0, 0, 0, 80)
    for e in extras:
        if e.startswith('glow:'):
            G = hexc(e[5:])
            for x in range(-1, L + 1):
                hh = hw[max(0, min(L - 1, x))]
                for y in range(-hh - 2, hh + 3):
                    if 0 <= ox + x < img.width and 0 <= cy + y < img.height: px[ox + x, cy + y] = G[:3] + (110,)
    axles = [int(L * 0.18), int(L * 0.8)] + ([int(L * 0.5)] if kind == 'limo' else [])
    for wx in axles:
        for dx in range(-3, 3):
            for s in (-1, 1): px[ox + wx + dx, cy + s * hw[wx]] = TIRE; px[ox + wx + dx, cy + s * (hw[wx] + 1)] = TIRE if abs(dx + 0.5) < 2.5 else (0,0,0,0)
    for x in range(L):
        h = hw[x]
        for y in range(-h, h + 1):
            if abs(y) == h or x == 0 or x == L - 1: c = INK
            elif abs(y) == h - 1 and any(abs(x - a) <= 3 for a in axles): c = shade(P, 0.6)   # wheel arches
            elif y <= -h + 2: c = shade(P, 1.22)
            elif y < 0: c = shade(P, 1.06)
            elif y < h - 2: c = shade(P, 0.9)
            else: c = shade(P, 0.72)
            px[ox + x, cy + y] = c
    # hood crease
    c0, c1 = int(L * b['cab'][0]), int(L * b['cab'][1]); ws = b['ws']; ins = b['inset']
    for x in range(c1 + 1, L - 2): px[ox + x, cy - 1] = shade(P, 1.12)
    # cabin: rear glass, roof, windshield (tapers toward the front)
    for x in range(c0, c1):
        h = hw[x] - ins - 1
        if x >= c1 - ws:  # windshield
            t = (x - (c1 - ws)) / ws; h2 = max(2, int(round(h - t * 1.5)))
            for y in range(-h2, h2 + 1): px[ox + x, cy + y] = GLASS_HI if (y == -h2 + 1 and x < c1 - 1) else GLASS
        elif x < c0 + 2:
            for y in range(-h + 1, h): px[ox + x, cy + y] = GLASS
        else:
            for y in range(-h, h + 1):
                if abs(y) == h: px[ox + x, cy + y] = GLASS
                elif y == -h + 1: px[ox + x, cy + y] = shade(P, 1.3)
                else: px[ox + x, cy + y] = shade(P, 0.96 if y < 0 else 0.84)
    if kind == 'limo':
        for x in range(c0 + 8, c1 - ws - 2, 8):
            for y in range(-hw[x] + 2, hw[x] - 1): px[ox + x, cy + y] = shade(P, 0.62)
    for s in (-1, 1):
        y = cy + s * (hw[L - 2] - 2); px[ox + L - 2, y] = HEAD; px[ox + L - 3, y] = HEAD
        y = cy + s * (hw[1] - 2); px[ox + 1, y] = TAIL; px[ox + 2, y] = TAIL
    def body(x, y): return px[ox + x, cy + y] not in (INK, GLASS, GLASS_HI, TIRE)
    if 'rust' in extras:
        for _ in range(8):
            x = rnd.randint(2, L - 3); y = rnd.randint(-hw[x] + 1, hw[x] - 1)
            if body(x, y): px[ox + x, cy + y] = hexc('8a4b2a')
    if 'dent' in extras:
        for x in range(int(L * 0.86), int(L * 0.86) + 3): px[ox + x, cy + hw[x] - 1] = shade(P, 0.5)
    if 'mismatch' in extras:
        for x in range(c1 + 1, L - 1):
            for y in range(-hw[x] + 1, 0):
                if body(x, y): px[ox + x, cy + y] = hexc('9a9a8a')
    if 'chrome' in extras or 'gold' in extras:
        T = GOLD if 'gold' in extras else CHROME
        for x in range(3, L - 3):
            for s in (-1, 1):
                if body(x, s * (hw[x] - 1)) and not any(abs(x - a) <= 3 for a in axles): px[ox + x, cy + s * (hw[x] - 1)] = T
        for y in range(-3, 4): px[ox + L - 1, cy + y] = CHROME
    if 'stripes' in extras:
        for x in range(1, L - 1):
            for y in (-2, 2):
                if body(x, y): px[ox + x, cy + y] = hexc('fff1e8')
    if 'gold' in extras: px[ox + L - 4, cy] = GOLD
    if 'wing' in extras:
        for y in range(-hw[0] - 1, hw[0] + 2): px[ox, cy + y] = INK; px[ox + 1, cy + y] = shade(P, 0.55)
    if 'twotone' in extras:
        for x in range(1, L - 1):
            for y in range(1, hw[x]):
                if body(x, y): px[ox + x, cy + y] = shade(hexc('1a1a22'), 1.1 if y < hw[x] - 2 else 0.8)
    if 'sparkle' in extras:
        for sx, sy in ((int(L * 0.2), -hw[int(L*0.2)] + 2), (int(L * 0.88), -2)):
            px[ox + sx, cy + sy] = (255, 255, 255, 255)
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                if body(sx+dx, sy+dy): px[ox + sx + dx, cy + sy + dy] = shade(P, 1.45)

    # ---------- exotic details ----------
    if 'intakes' in extras:   # dark side scoops behind the cabin
        for i in range(5):
            x = c0 - 2 - i
            for s_ in (-1, 1):
                for d in range(0, 3 - i // 2):
                    y = s_ * (hw[x] - 1 - d)
                    if body(x, y): px[ox + x, cy + y] = INK
    if 'vents' in extras:     # engine-cover louvres behind the cabin
        for x in range(4, c0 - 1, 2):
            for y in range(-3, 4): px[ox + x, cy + y] = shade(P, 0.55)
    if 'bigwing' in extras:   # wide rear wing overhanging the body
        for y in range(-hw[2] - 2, hw[2] + 3):
            px[ox + 1, cy + y] = INK; px[ox + 2, cy + y] = shade(P, 0.5); px[ox + 3, cy + y] = INK
    if 'quad' in extras:      # quad exhaust tips
        for y in (-3, -1, 1, 3): px[ox, cy + y] = CHROME
    if 'canopy' in extras:    # smoked teardrop canopy glass
        for x in range(c0, c1):
            h = hw[x] - b['inset'] - 1
            for y in range(-h, h + 1):
                if px[ox + x, cy + y] not in (GLASS_HI,): px[ox + x, cy + y] = hexc('0c1430') if abs(y) < h else GLASS
    if 'hexlights' in extras: # angular Y headlights
        for s_ in (-1, 1):
            for d in range(4): px[ox + L - 2 - d, cy + s_ * (hw[L - 2 - d] - 1 - d // 2)] = HEAD
    if 'horseshoe' in extras: # horseshoe grille + C-curve
        for y in range(-2, 3): px[ox + L - 1, cy + y] = CHROME
        px[ox + L - 2, cy - 2] = CHROME; px[ox + L - 2, cy + 2] = CHROME
        for x in range(c0 - 4, c1 + 2):
            t = (x - (c0 - 4)) / (c1 + 6 - c0); y = int(round(-hw[x] + 2 + 4 * math.sin(t * math.pi)))
            if body(x, y): px[ox + x, cy + y] = CHROME
    if 'grille' in extras:    # tall upright chrome grille + long hood lines
        for y in range(-4, 5): px[ox + L - 1, cy + y] = CHROME; px[ox + L - 2, cy + y] = shade(CHROME, 0.8)
        for x in range(c1 + 2, L - 3):
            for y in (-4, 4): px[ox + x, cy + y] = shade(P, 1.25)
    if 'ornament' in extras:  # hood mascot
        px[ox + L - 4, cy] = CHROME; px[ox + L - 5, cy] = (255, 255, 255, 255); px[ox + L - 4, cy - 1] = CHROME; px[ox + L - 4, cy + 1] = CHROME
    if 'roundlights' in extras:
        for s_ in (-1, 1):
            for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)): px[ox + L - 3 - dx, cy + s_ * (hw[L - 3] - 3 + dy)] = HEAD
    if 'coachline' in extras: # pinstripe
        for x in range(3, L - 3):
            for s_ in (-1, 1):
                y = s_ * (hw[x] - 2)
                if body(x, y): px[ox + x, cy + y] = GOLD
    if 'glint' in extras:     # big specular highlight along the top edge
        for x in range(int(L * 0.15), int(L * 0.3)):
            y = -hw[x] + 1
            if body(x, y): px[ox + x, cy + y] = (255, 255, 255, 255)
    return img

ROSTER = [
  ('BEATER', '$1-3', [('RUSTBUCKET', 'hatch', 'b8a77a', ('rust', 'dent')), ('HONDO CIVVY', 'hatch', '8f8a7a', ('rust', 'mismatch')), ('MOM VAN', 'van', '7d8a6a', ('rust',))]),
  ('STANDARD', '$5-10', [('CAMREE', 'sedan', 'c2c3c7', ()), ('FUSSION', 'sedan', '29adff', ()), ('SUBAROO', 'suv', '108a4a', ())]),
  ('PREMIUM', '$15-30', [('AUDEE A8', 'exec', '83769c', ('chrome',)), ('BIMMER 7', 'exec', 'f4efe8', ('chrome',)), ('MERC S', 'exec', '2a2a33', ('chrome',))]),
  ('WHALE', '$50-200', [('FERRUCCIO', 'ferr', 'ff1744', ('stripes', 'intakes', 'vents', 'quad', 'canopy', 'roundlights', 'glint', 'sparkle')),
                        ('LAMBORGOTTI', 'lambo', 'ffe11a', ('intakes', 'vents', 'bigwing', 'quad', 'canopy', 'hexlights', 'glint', 'sparkle')),
                        ('MCLARREN', 'mcl', 'ff9a00', ('intakes', 'bigwing', 'canopy', 'hexlights', 'glint', 'sparkle'))]),
  ('ULTRA', '$100-300', [('ROLLS-ROIZ', 'rolls', 'd9d9e0', ('twotone', 'grille', 'ornament', 'coachline', 'glint', 'sparkle', 'glow:ffcc33')),
                         ('BENTLEE', 'bent', '0e5c3a', ('grille', 'roundlights', 'coachline', 'ornament', 'glint', 'sparkle', 'glow:ffcc33')),
                         ('BUGATTO', 'bug', '1d6fe0', ('twotone', 'horseshoe', 'intakes', 'canopy', 'quad', 'glint', 'sparkle', 'glow:29adff'))]),
  ('LIMO', 'GREET', [('STRETCH (WHITE)', 'limo', 'f4f4f4', ('chrome',)), ('STRETCH (BLACK)', 'limo', '1a1a20', ('chrome',))]),
]

def font(sz):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(p, sz)
        except OSError: pass
    return ImageFont.load_default()

def sheet():
    S = 5; rowh = 175; W = 1500; H = 120 + rowh * len(ROSTER) + 330
    im = Image.new('RGBA', (W, H), hexc('121a3a')); d = ImageDraw.Draw(im)
    d.text((30, 25), 'VEHICLE ROSTER  -  HI-RES MOCKUP (40px cars, shown 5x)', fill=hexc('ffe11a'), font=font(34))
    y = 100; seed = 1
    for tier, pay, cars in ROSTER:
        d.line([(20, y - 8), (W - 20, y - 8)], fill=hexc('2a3566'), width=3)
        d.text((30, y + 20), tier, fill=hexc('fff1e8'), font=font(30)); d.text((30, y + 58), pay, fill=hexc('ffe11a'), font=font(26))
        x = 290
        for name, kind, paint, ex in cars:
            c = draw_car(kind, paint, ex, seed); seed += 1
            big = c.resize((c.width * S, c.height * S), Image.NEAREST); im.alpha_composite(big, (x, y + (rowh - 40 - big.height) // 2))
            d.text((x, y + rowh - 34), name, fill=hexc('c2c3c7'), font=font(20)); x += max(big.width + 60, 400)
        y += rowh
    # in-context: lot row at game scale (2x) with old-size comparison
    d.text((30, y + 5), 'IN CONTEXT: one lot lane at real game scale (shown 2x)', fill=hexc('ffe11a'), font=font(24))
    lane = Image.new('RGBA', (8 * 60 + 20, 32), hexc('3a3a48')); ld = ImageDraw.Draw(lane)
    for i in range(9): ld.line([(10 + i * 60, 0), (10 + i * 60, 4)], fill=hexc('8a8a96')); ld.line([(10 + i * 60, 27), (10 + i * 60, 31)], fill=hexc('8a8a96'))
    picks = [('hatch', 'b8a77a', ('rust', 'dent')), ('sedan', '29adff', ()), ('exec', '2a2a33', ('chrome',)), ('ferr', 'ff1744', ('stripes', 'intakes', 'vents', 'quad', 'canopy', 'roundlights', 'glint', 'sparkle')),
             ('suv', '108a4a', ()), ('rolls', 'd9d9e0', ('twotone', 'grille', 'ornament', 'coachline', 'glint', 'sparkle', 'glow:ffcc33')), ('van', '7d8a6a', ('rust',)), ('lambo', 'ffe11a', ('intakes', 'vents', 'bigwing', 'quad', 'canopy', 'hexlights', 'glint', 'sparkle'))]
    for i, (k, p, e) in enumerate(picks):
        c = draw_car(k, p, e, 50 + i); lane.alpha_composite(c, (10 + i * 60 + (60 - c.width) // 2, (32 - c.height) // 2))
    lane2 = lane.resize((lane.width * 2, lane.height * 2), Image.NEAREST); im.alpha_composite(lane2, (30, y + 45))
    d.text((30, y + 45 + lane2.height + 10), 'Beater / Standard / Premium / Whale / Standard / Ultra / Beater / Whale  -  class readable by size + shape + trim', fill=hexc('c2c3c7'), font=font(18))
    return im.convert('RGB')

if __name__ == '__main__':
    sheet().save('car_mockup.png')
    print('ok')
