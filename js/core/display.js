'use strict';
/* Display resolution. The game world and all layout use a 320x180 grid of "game pixels".
   Art is drawn at HI detail pixels per game pixel (640x360 - the 16-bit grid), and the canvas runs at
   SCALE device pixels per game pixel (1920x1080), so detail pixels and the 3x car sprites both land on
   whole device pixels. Change these together with the canvas size in index.html. */
const DISPLAY = {
  w: 320,
  h: 180,
  hi: 2, // 16-bit detail pixels per game pixel
  scale: 6, // device pixels per game pixel
};
const HI_PX = 1 / DISPLAY.hi; // one detail pixel, in game units
const snapHi = v => Math.round(v * DISPLAY.hi) / DISPLAY.hi;
