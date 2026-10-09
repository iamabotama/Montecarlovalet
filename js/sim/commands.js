'use strict';
/* Player commands: what a tap on a guest/car/card means. No drawing. */

function waveOff(car, g) {
  const T = CONFIG.tiers[g.tier];
  S.stats.waved++;
  removeQueuedJobsFor(car.id);
  const heat =
    T.waveOffHeatChance !== undefined ? (Math.random() < T.waveOffHeatChance ? T.waveOffHeat : 0) : T.waveOffHeat;
  if (heat) addHeat(heat, t('heat.wavedOff', { car: carName(car) }));
  floater(t('float.generalParking'), g.x, g.y - 6, PAL.lime);
  departCar(car);
  guestGone(g);
  S.selected = null;
}
function armCard(i) {
  const c = S.cards[i];
  if (!c) return;
  if (POWER_INFO[c.type].target === 'self') {
    useCard(i);
    floater(POWER_INFO[c.type].name + '!', S.valet.x, S.valet.y - 14, PAL.yellow);
    return;
  }
  S.armed = S.armed === i ? null : i;
  Sound.sfx('click');
}
function tapGuest(g) {
  if (!g) return;
  if (S.armed !== null) {
    useCard(S.armed, g);
    return;
  }
  if (eventHook('tapGuest', g)) return;
  if (g.phase === 'pick' && !g.ticket) {
    toast(t('toast.waitTicket'));
    return;
  }
  if (g.phase === 'pick') {
    if (S.jobs.some(j => j.type === 'fetch' && j.carId === g.carId)) {
      toast(t('toast.alreadyFetching'));
      return;
    }
    const car = S.cars.get(g.carId);
    if (car.loc.t === 'stall') {
      const d = liveDepth(car.loc.lane, car.loc.idx);
      if (d.best > freeTemps().length) {
        toast(t('toast.noRoomDigOut'));
        Sound.sfx('deny');
        return;
      }
    }
    enqueue({ type: 'fetch', carId: g.carId });
  } else if (g.state === 'curbDrop') tapCar(S.cars.get(g.carId), g);
}
function tapCar(car, g) {
  if (S.armed !== null) {
    useCard(S.armed, g);
    return;
  }
  if (g.phase === 'pick' && WAITING.has(g.state)) return tapGuest(g);
  if (car.loc.t === 'curb' && g.state === 'curbDrop') {
    if (S.jobs.some(j => j.carId === car.id)) {
      toast(t('toast.alreadyQueued'));
      return;
    }
    S.selected = { carId: car.id, bags: false };
    Sound.sfx('click');
    return;
  }
  // a parked car: select it, then tap a new spot (the selected valet moves it)
  if (car.loc.t === 'temp' || car.loc.t === 'prem' || car.loc.t === 'stall') {
    if (S.jobs.some(j => j.carId === car.id && j.type !== 'restow')) return toast(t('toast.alreadyQueued'));
    if (!isMovable(car)) {
      toast(t('toast.moveBlocked'));
      Sound.sfx('deny');
      return;
    }
    S.selected = { carId: car.id };
    Sound.sfx('click');
  }
}
