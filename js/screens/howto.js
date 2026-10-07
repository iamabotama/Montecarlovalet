'use strict';
/* How-to-play pages (text reference; the tutorial is the main teaching tool). */
const HOWTO = [
  [
    'PARKING',
    [
      'TAP A CAR AT THE CURB, THEN TAP A LANE END.',
      'CARS SLIDE IN AS DEEP AS THEY CAN GO.',
      'EACH LANE IS TWO STACKS: WEST AND EAST.',
      'D# = HOW DEEP. DEEPER = SLOWER TO DIG OUT.',
    ],
  ],
  [
    'FETCHING',
    [
      'GUESTS HAND THEIR TICKET IN AT THE PODIUM.',
      'TAP A TICKET ON THE BOARD TO FETCH THE CAR.',
      'BLOCKERS GO TO TEMP SLOTS T1-T4, THEN A',
      'RESTOW JOB PUTS THEM BACK.',
    ],
  ],
  [
    'MONEY & HEAT',
    [
      'WHALES TIP BIG ON ARRIVAL AND COOL THE HEAT.',
      'THEY NEVER LEAVE - THEY ESCALATE. RIVALS',
      'STEAL UNCLAIMED WHALES AFTER 6S.',
      'HEAT 100 = FIRED. 4 WAVES, A BREAK AFTER EACH.',
      'SURVIVE TO MIDNIGHT, OR CLOCK OUT ON A BREAK.',
    ],
  ],
];
defineScreen('howto', {
  enter() {
    UI.howPage = 0;
  },
  buttons: () => [
    button(220, 160, 90, UI.howPage < HOWTO.length - 1 ? 'NEXT >' : 'DONE', () => {
      if (UI.howPage < HOWTO.length - 1) UI.howPage++;
      else goScreen('title');
    }),
  ],
  render() {
    renderText(HOWTO[UI.howPage][0], HOWTO[UI.howPage][1]);
    drawButtons(this.buttons());
  },
});
