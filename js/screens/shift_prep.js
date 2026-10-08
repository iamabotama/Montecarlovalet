'use strict';
/* Shift prep: tonight's goals, power-up loadout, uniform. START SHIFT hands the choices to app/flow.js. */
defineScreen('prep', {
  enter() {
    const h = hotelById(UI.hotelSel || SAVE.lastHotel);
    const owned = unlockedPowerups();
    const keep = SAVE.loadout.filter(p => owned.includes(p)).slice(0, loadoutPicks());
    UI.prep = { hotel: h, goals: drawGoals(h), loadout: keep };
  },
  buttons() {
    const P = UI.prep;
    const owned = unlockedPowerups();
    const tiles = owned.map((p, i) => {
      const on = P.loadout.includes(p);
      return button(
        8 + (i % 4) * 77,
        84 + Math.floor(i / 4) * 15,
        74,
        POWER_INFO[p].name,
        () => toggleLoadout(p),
        on ? PAL.yellow : PAL.dgrey,
      );
    });
    const uniforms = unlockedCosmetics('uniform'),
      tags = unlockedCosmetics('nametag');
    const cos = [
      button(
        8,
        122,
        150,
        t('prep.uniform', { name: UNIFORMS[SAVE.cosmetic.uniform].name }),
        () => cycleCosmetic('uniform', uniforms),
        uniforms.length > 1 ? PAL.lav : PAL.dgrey,
      ),
    ];
    if (tags.length > 1)
      cos.push(
        button(176, 132, 136, NAMETAGS[SAVE.cosmetic.nametag].name, () => cycleCosmetic('nametag', tags), PAL.lav),
      );
    return [
      ...tiles,
      ...cos,
      button(6, 160, 70, t('btn.back'), () => goScreen('hotels'), PAL.lgrey),
      button(
        214,
        160,
        100,
        t('prep.start'),
        () => startGame(P.hotel.id, { loadout: P.loadout, goals: P.goals }),
        PAL.lime,
      ),
    ];
  },
  render() {
    const P = UI.prep;
    R(0, 0, 320, 180, PAL.night);
    drawText(ctx, P.hotel.city, 160, 4, P.hotel.theme.sign, { align: 'center', scale: 2, shadow: PAL.ink });
    drawText(ctx, t('prep.tonight', { hotel: P.hotel.name, event: P.hotel.event.name }), 160, 19, PAL.lgrey, {
      align: 'center',
    });
    drawText(ctx, t('prep.goals'), 8, 30, PAL.yellow);
    P.goals.forEach((g, i) => {
      drawText(ctx, '- ' + goalTextFor(g, P.hotel), 8, 39 + i * 8, PAL.white);
      drawText(ctx, t('prep.xp', { n: goalDef(g.id).xp }), 312, 39 + i * 8, PAL.lime, { align: 'right' });
    });
    drawText(ctx, t('prep.powerups', { n: P.loadout.length, max: loadoutPicks() }), 8, 74, PAL.yellow);
    drawText(ctx, t('prep.moreUnlock'), 312, 74, PAL.dgrey, { align: 'right' });
    drawText(ctx, t('prep.look'), 8, 134, PAL.yellow);
    drawPerson(ctx, 30, 130, 'idle', valetColors(), false);
    drawButtons(this.buttons());
  },
});
function toggleLoadout(p) {
  const L = UI.prep.loadout;
  if (L.includes(p)) L.splice(L.indexOf(p), 1);
  else if (L.length < loadoutPicks()) L.push(p);
  else return Sound.sfx('deny');
  SAVE.loadout = L.slice();
  writeSave();
  Sound.sfx('click');
}
function cycleCosmetic(kind, ids) {
  if (ids.length < 2) return Sound.sfx('deny');
  SAVE.cosmetic[kind] = ids[(ids.indexOf(SAVE.cosmetic[kind]) + 1) % ids.length];
  writeSave();
  Sound.sfx('click');
}
