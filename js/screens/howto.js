'use strict';
/* How-to-play pages (text reference; the tutorial is the main teaching tool). */
const HOWTO = [
  [tl('howto.parking'), [tl('howto.parking1'), tl('howto.parking2'), tl('howto.parking3'), tl('howto.parking4')]],
  [tl('howto.fetching'), [tl('howto.fetching1'), tl('howto.fetching2'), tl('howto.fetching3'), tl('howto.fetching4')]],
  [
    tl('howto.money'),
    [tl('howto.money1'), tl('howto.money2'), tl('howto.money3'), tl('howto.money4'), tl('howto.money5')],
  ],
];
defineScreen('howto', {
  enter() {
    UI.howPage = 0;
  },
  buttons: () => [
    button(220, 160, 90, UI.howPage < HOWTO.length - 1 ? t('btn.next') : t('btn.done'), () => {
      if (UI.howPage < HOWTO.length - 1) UI.howPage++;
      else goScreen('title');
    }),
  ],
  render() {
    renderText(HOWTO[UI.howPage][0], HOWTO[UI.howPage][1]);
    drawButtons(this.buttons());
  },
});
