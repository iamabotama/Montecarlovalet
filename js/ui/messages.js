'use strict';
/* Message dock: the ONE place on the game screen where pop-up text appears.
   It sits on empty scenery under the ticket board (right of the helipad), so messages never cover
   valets, guests, cars or the board. One message shows at a time, by priority:
     1. shout  - an event's big moment (S.shout, set with shout(); e.g. Marco: "JOY RIDE!!")
     2. toast  - a short warning (S.toasts, newest wins)
     3. banner - wave/jackpot/event news (S.banners, queued one at a time)
   Text wraps to the dock width, so translations of any length fit (up to DOCK.maxLines lines). */
const DOCK = { x: 211, y: 149, w: 108, h: 22, pad: 3, line: 7, maxLines: 3 };

function dockMessage() {
  if (S.shout) return { border: PAL.yellow, flash: true, speaker: S.shout.who, big: S.shout.text };
  const toastMsg = S.toasts.length && S.toasts[S.toasts.length - 1];
  if (toastMsg) return { border: PAL.red, lines: dockWrap([[toastMsg.msg, PAL.white]]) };
  const b = S.banners[0];
  if (b)
    return {
      border: PAL.yellow,
      lines: dockWrap([
        [b.text, PAL.yellow],
        [b.sub, PAL.white],
      ]),
    };
  return null;
}

// [[text, colour], ...] -> wrapped lines, capped at DOCK.maxLines
function dockWrap(parts) {
  const out = [];
  for (const [text, color] of parts) {
    if (!text) continue;
    for (const l of wrapText(text, DOCK.w - DOCK.pad * 2)) out.push({ text: l, color });
  }
  return out.slice(0, DOCK.maxLines);
}

function drawMessages() {
  const m = dockMessage();
  if (!m) return;
  const { x, y, w, h, pad, line } = DOCK,
    cx = x + w / 2;
  R(x, y, w, h, PAL.ink);
  if (!m.flash || Math.floor(UI.t * 6) % 3) RB(x, y, w, h, m.border);
  if (m.big !== undefined) {
    // speaker on a small line, the shout itself as big as fits
    drawText(ctx, t('msg.speaker', { name: m.speaker }), cx, y + 2, PAL.white, { align: 'center' });
    const scale = textW(m.big) * 2 <= w - pad * 2 ? 2 : 1;
    drawText(ctx, m.big, cx, y + (scale === 2 ? 9 : 11), PAL.yellow, {
      align: 'center',
      scale,
      shadow: PAL.crimson,
    });
    return;
  }
  const top = y + Math.round((h - m.lines.length * line) / 2) + 1; // centre the block vertically
  m.lines.forEach((l, i) => drawText(ctx, l.text, cx, top + i * line, l.color, { align: 'center' }));
}
