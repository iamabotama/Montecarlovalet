'use strict';
/* App flow: choosing a hotel and starting shifts. Screens call these; they never build run state themselves. */

// Make `id` the active hotel: lot geometry, routing graph and the pre-rendered background.
function loadHotel(id) {
  const h = hotelById(id);
  if (HOTEL === h && BG) return h;
  setGeometry(h);
  buildGraph();
  buildBG();
  return h;
}
// opts: { loadout, goals } from the shift-prep screen; goals are drawn here when not supplied.
function startGame(hotelId, opts = {}) {
  const h = loadHotel(hotelId || (HOTEL && HOTEL.id) || HOTEL_ORDER[0]);
  newRun({ loadout: opts.loadout || activeChar().loadout, goals: opts.goals || drawGoals(h) });
  UI.screen = 'game';
  UI.paused = false;
  Sound.startMusic();
}
