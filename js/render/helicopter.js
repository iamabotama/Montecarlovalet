'use strict';
/* Helipad, helicopter and VIP drawing. */

/* ---- helipad + VIP helicopter (vector-drawn at 3x) ---- */
function ell(x, y, rx, ry, c, rot) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.fill();
}
function drawPad() {
  if (!PAD) return;
  const x = PAD.x,
    y = PAD.y;
  R(x - 18, y - 18, 36, 36, PAL.dgrey);
  RB(x - 18, y - 18, 36, 36, PAL.lgrey);
  ctx.strokeStyle = PAL.yellow;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.stroke();
  R(x - 5, y - 6, 2, 12, PAL.white);
  R(x + 3, y - 6, 2, 12, PAL.white);
  R(x - 3, y - 1, 6, 2, PAL.white);
  for (let i = 0; i < 4; i++) {
    const on = Math.floor(UI.t * 2 + i) % 2 === 0;
    R(x - 18 + (i % 2) * 34, y - 18 + (i > 1 ? 34 : 0), 2, 2, on ? PAL.red : PAL.rust);
  }
}
function drawHeli() {
  if (!heliVisible()) return;
  const H = S.heli;
  const a = heliAlt();
  const x = PAD.x,
    y = PAD.y;
  // shadow grows sharper as it descends
  ctx.globalAlpha = 0.25 + 0.35 * (1 - a);
  ell(x + a * 10, y + 2, 16 * (1 - a * 0.4), 7 * (1 - a * 0.4), PAL.ink);
  ctx.globalAlpha = 1;
  drawHeliBody(x + a * 40, y - a * 110, 1 + a * 0.5, UI.t * (H.phase === 'landed' ? (H.t < 1.5 ? 18 : 4) : 30));
  // countdown ring once landed
  if (H.phase === 'landed' && !H.greeting) {
    const f = 1 - H.t / CONFIG.helo.meetSec;
    ctx.strokeStyle = f > 0.5 ? PAL.lime : f > 0.25 ? PAL.yellow : PAL.red;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f);
    ctx.stroke();
    drawText(ctx, Math.ceil(CONFIG.helo.meetSec - H.t) + '', x, y - 26, f > 0.25 ? PAL.white : PAL.red, {
      align: 'center',
    });
  }
  if (H.phase === 'incoming' && !heliJob() && Math.floor(UI.t * 4) % 2)
    drawText(ctx, t('hud.tap'), x, y - 26, PAL.yellow, { align: 'center' });
}
// The airframe + spinning rotors centred at (hx, hy), scaled by s; ang = rotor angle. Also used by the vehicle guide.
function drawHeliBody(hx, hy, s, ang) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(s, s);
  R(-9, 5, 18, 1, PAL.lgrey);
  R(-9, -6, 18, 1, PAL.lgrey);
  R(-6, -6, 1, 11, PAL.lgrey);
  R(5, -6, 1, 11, PAL.lgrey); // skids
  R(6, -1, 18, 2, PAL.ink);
  R(22, -4, 2, 8, PAL.ink);
  R(22, -1, 4, 2, PAL.yellow); // tail boom + fin
  ell(0, 0, 11, 6, PAL.ink);
  ell(0, 0, 10, 5, '#1b1b2e');
  R(-8, -1, 16, 1, PAL.yellow); // body + gold pinstripe
  ell(-6, 0, 4.5, 4, '#7fd4ff');
  ell(-7, -1.2, 2, 1.4, PAL.white); // cockpit glass + glint
  ctx.strokeStyle = 'rgba(220,220,235,0.85)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const t = ang + (k * Math.PI) / 2;
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(t) * 17, Math.sin(t) * 17);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ell(0, 0, 17, 17, PAL.white);
  ctx.globalAlpha = 1;
  ell(0, 0, 1.5, 1.5, PAL.yellow);
  const tr = ang * 1.7;
  ctx.beginPath();
  ctx.moveTo(24 + Math.cos(tr) * 3, Math.sin(tr) * 3);
  ctx.lineTo(24 - Math.cos(tr) * 3, -Math.sin(tr) * 3);
  ctx.stroke();
  ctx.restore();
}
// The VIP's walk from the pad to the hotel door: sprite top-left, or null when not walking.
function vipPos() {
  const H = S.heli;
  if (!H || !(H.vipT > 0)) return null;
  const f = 1 - H.vipT / 2.5;
  const px = lerp(PAD_MEET[0], MAP.standX + 4, f),
    py = f < 0.5 ? lerp(PAD.y, MAP.streetY, f * 2) : lerp(MAP.streetY, 34, (f - 0.5) * 2);
  return { x: px, y: py - 8 };
}
function drawVip() {
  const v = vipPos();
  if (!v) return;
  const sp = S.heli.special, // a special VIP (events/vip_heli.js) brings its own look
    x = Math.round(v.x + crowdOff(S.heli)),
    y = Math.round(v.y),
    pose = Math.floor(UI.t * 8) % 2 ? 'walk' : 'idle';
  const look = (sp && sp.look) || { h: PAL.yellow, s: PAL.peach, c: PAL.ink, p: PAL.ink, k: PAL.ink, x: PAL.yellow };
  if (sp && sp.wide) drawPerson(ctx, x + 1, y, pose, look); // one pixel wider, not taller
  drawPerson(ctx, x, y, pose, look);
  if (sp && sp.tie) R(x + 2, y + 5, 1, 3, sp.tie);
}
