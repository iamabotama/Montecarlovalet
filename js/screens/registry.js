'use strict';
/* Screen registry. Each screen file calls defineScreen(name, def) with:
     render()   - draw the whole screen (required)
     buttons()  - list of menu buttons (optional; tapped via the shared button dispatcher)
     targets()  - custom hit targets when there are no buttons (optional; the game uses this)
     enter()    - called by goScreen() when the screen becomes active (optional)
   The main loop only ever talks to the active screen through this table. */
const SCREENS = {};
function defineScreen(name, def) {
  SCREENS[name] = def;
}
function goScreen(name) {
  UI.screen = name;
  const s = SCREENS[name];
  if (s && s.enter) s.enter();
}
