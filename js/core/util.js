'use strict';
/* Generic helpers: random, math, formatting, path utils. No game knowledge. */

const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
function weightedIndex(ws) {
  let s = 0;
  for (const w of ws) s += w;
  let r = Math.random() * s;
  for (let i = 0; i < ws.length; i++) {
    r -= ws[i];
    if (r < 0) return i;
  }
  return ws.length - 1;
}
function fmtMoney(n) {
  n = Math.round(n);
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtClock(h) {
  const hh = Math.floor(h) % 24,
    mm = Math.floor((h % 1) * 60);
  const ap = hh >= 12 ? 'PM' : 'AM';
  let d = hh % 12;
  if (d === 0) d = 12;
  return d + ':' + (mm < 10 ? '0' : '') + mm + ap;
}
function pathLen(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
  return l;
}
function dedupe(pts) {
  const o = [];
  for (const p of pts) {
    const q = o[o.length - 1];
    if (!q || q[0] !== p[0] || q[1] !== p[1]) o.push([p[0], p[1]]);
  }
  return o;
}
