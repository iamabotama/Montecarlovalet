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
function startGame(hotelId) {
  loadHotel(hotelId || (HOTEL && HOTEL.id) || HOTEL_ORDER[0]);
  newRun();
  UI.screen = 'game';
  UI.paused = false;
  Sound.startMusic();
}
