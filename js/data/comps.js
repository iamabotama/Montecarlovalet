'use strict';
/* Comps: what you can give an UPSET whale/ultra to calm them down (sim/comps.js, ui/comp_menu.js).
   Each comp can be used once per shift. Tune prices and effects here.
     refill      fraction of full patience given back (1 = completely calm)
     freezeSec   seconds of no patience drain at all
     forgiveHeat heat taken off the manager meter */
const COMPS = {
  order: ['champagne', 'showgirl', 'show', 'room'],
  minStage: 2, // the guest must be at least visibly annoyed (patience bubble stage)
  champagne: { cost: 100, name: tl('comp.champagne'), refill: 0.5, icon: 'glass' },
  showgirl: { cost: 200, name: tl('comp.showgirl'), freezeSec: 30, icon: 'showgirl' },
  show: { cost: 250, name: tl('comp.show'), freezeSec: 60, icon: 'tickets' },
  room: { cost: 300, name: tl('comp.room'), refill: 1, forgiveHeat: 15, icon: 'key' },
  fxSec: 3, // how long the glass / tickets / key icon shows next to the guest
  door: { x: 157, y: 34 }, // the showgirl walks out of (and back into) the hotel door
  walkSec: 1.2, // her walk from the door to the guest
};
