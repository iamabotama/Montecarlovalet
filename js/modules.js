'use strict';
/* THE load order, in one place. index.html loads these in sequence; sw.js precaches the same list.
   Rule of thumb: data before the systems that read it, systems before the UI that draws them,
   screens after the UI helpers they use, main.js last. Function calls across files are fine in any
   order (they run after everything has loaded); only top-level constants care about order. */
const MCV_MODULES = [
  // core + data (no game state)
  'core/util.js',
  'art/palette.js',
  'art/font.js',
  'data/config.js',
  'data/vehicles.js',
  'data/powerups.js',
  // art + audio
  'art/sprites.js',
  'art/cars.js',
  'audio/sound.js',
  // world: geometry, routing, lot model, jobs (plan + run)
  'world/geometry.js',
  'world/routing.js',
  'world/lot.js',
  'world/workers.js',
  'world/jobs.js',
  'world/planner.js',
  'world/runner.js',
  // career (persistent)
  'career/save.js',
  // simulation rules (one shift)
  'sim/state.js',
  'sim/fx.js',
  'sim/ramp.js',
  'sim/economy.js',
  'sim/heat.js',
  'sim/powerups.js',
  'sim/arrivals.js',
  'sim/guests.js',
  'sim/movers.js',
  'sim/helicopter.js',
  'sim/crew.js',
  'sim/shift.js',
  'sim/commands.js',
  'sim/step.js',
  'tutorial/tutorial.js',
  // rendering + in-game UI
  'ui/canvas.js',
  'ui/widgets.js',
  'render/background.js',
  'render/helicopter.js',
  'render/people.js',
  'render/game.js',
  'ui/hud.js',
  'ui/board.js',
  'ui/crew_panel.js',
  'ui/selection.js',
  'ui/input.js',
  'ui/debug.js',
  // screens + app
  'screens/registry.js',
  'screens/title.js',
  'screens/settings.js',
  'screens/howto.js',
  'screens/summary.js',
  'screens/game.js',
  'app/flow.js',
  'main.js',
];
if (typeof module !== 'undefined') module.exports = MCV_MODULES; // lets node tooling read the list
