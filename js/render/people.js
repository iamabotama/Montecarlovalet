'use strict';
/* Guest poses and speech bubbles. */

/* ---- people & bubbles ---- */
function guestPose(g) {
  const s = g.stage,
    t = UI.t;
  let pose = 'idle',
    dx = 0,
    dy = 0,
    cols = { ...g.colors };
  if (g.state === 'pickWalk' || g.state === 'toSpot' || g.state === 'leavingIn' || g.state === 'pickBoard')
    pose = Math.floor(t * 6) % 2 ? 'walk' : 'idle';
  else if (s === 1) pose = 'idle';
  else if (s === 2) pose = Math.floor(t * 4) % 2 ? 'tap' : 'idle';
  else if (s === 3) {
    pose = 'cross';
    cols.s = PAL.salmon || PAL.pink;
  } else if (s >= 4) {
    pose = 'arms';
    cols.s = PAL.red;
    dy = -Math.abs(Math.round(Math.sin(t * 12) * 2));
    dx = Math.round(Math.sin(t * 40));
  }
  if (g.wobble) dx += Math.round(Math.sin(t * 3) * 1.5); // set by events (e.g. a tipsy guest)
  return { pose, dx, dy, cols, flip: s === 1 && Math.floor(t * 1.5) % 2 };
}
function bubbleFor(g) {
  if (!WAITING.has(g.state) && g.state !== 'greeting') return null;
  if (g.ignoreT > 0) return { text: t('bubble.onCall'), kind: 'phone' };
  const s = g.stage;
  if (s === 0) return null;
  if (s <= 2) return { text: g.line || '...', kind: 'w' };
  if (s === 3) {
    const f = (g.wait / g.patience - 0.7) / 0.2;
    return { text: tlist('lines.angry')[clamp(Math.floor(f * 3), 0, 2)], kind: 'r' };
  }
  const n = s === 5 ? 6 + Math.min(4, Math.floor(g.over / 5)) : 5;
  const ch = CONFIG.lines.grawlixChars;
  let txt = '';
  const seed = Math.floor(UI.t / 0.3);
  for (let i = 0; i < n; i++) txt += ch[(seed * 7 + i * 3 + g.id) % ch.length];
  return { text: txt + '!', kind: s === 5 ? 'm' : 'g' };
}
function drawBubbles(list) {
  // list of {x,y,b,order}; stack upward when overlapping, newest on top
  const placed = [];
  list.sort((a, b) => a.order - b.order);
  for (const it of list) {
    const lines = wrapText(it.b.text, 39);
    const w = Math.max(...lines.map(l => textW(l))) + 5,
      h = lines.length * 6 + 4;
    let x = clamp(Math.round(it.x - 3), 1, 319 - w),
      y = it.y - h - 3;
    for (let guard = 0; guard < 8; guard++) {
      const hit = placed.find(p => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y);
      if (!hit) break;
      y = hit.y - h - 1;
    }
    placed.push({ x, y, w, h });
    const k = it.b.kind;
    const flash = k === 'm' && Math.floor(UI.t * 6) % 2;
    const bg = k === 'g' || k === 'm' ? PAL.red : PAL.white,
      bd = k === 'g' || k === 'm' ? (flash ? PAL.white : PAL.yellow) : PAL.ink,
      fg = k === 'r' ? PAL.red : k === 'g' || k === 'm' ? PAL.white : PAL.ink;
    R(x, y, w, h, bg);
    RB(x, y, w, h, bd);
    R(it.x, y + h, 2, 1, bd);
    R(it.x, y + h + 1, 1, 1, bd);
    lines.forEach((l, i) => drawText(ctx, l, x + 3, y + 2 + i * 6, fg));
    if (k === 'phone') drawIcon(ctx, 'phone', x + w - 5, y + 1, PAL.ink);
  }
}
