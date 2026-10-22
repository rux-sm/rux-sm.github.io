/* ==========================================================================
   Rux Scheduler — HOW A CARRIED FIGURE MOVES
   --------------------------------------------------------------------------
   The figure a dispatcher carries from Drivers to a trip hangs
   from the pointer by the back of its shirt. This works out its pose for one
   frame from where its pinch is and when: at the pointer while it is carried,
   and wherever its fall has taken it once it is let go. data.js feeds it
   that and writes the pose to the figure, and app.css turns the pose into
   rotations.

   IT IS A PENDULUM HUNG FROM THE PINCH. The pointer speeding up one way
   swings the figure the other, a steady drag trails it behind, and when the
   pointer rests the figure swings on past upright and settles.

   A SPRING FOLLOWS THE POINTER'S RISE AND FALL. Lifted, the figure stretches
   and its limbs are pulled down; lowered, it gathers and its limbs float up,
   as anything dropped does.

   THE LIMBS FLAIL WHILE THE POINTER TRAVELS AND HANG LIMP ONCE IT RESTS,
   swaying a little, and they trail the swing as it turns.

   A FIGURE PULLED OUT OF A BAR IS HELD BY IT UNTIL IT IS CLEAR. Until then
   it is limp and stretches the further it has come; free, it swings from the
   angle it was pulled at and springs back to its length.

   A FIGURE DROPPED ON A BAR LANDS ON ITS FEET AND SITS DOWN HARD, goes over
   on its back and lies there a moment, sits up, and pushes itself to its
   feet, where it stands swaying, its arms hanging, while it waits to hear
   whether it has the seat. For that it bends at the hip: its body leans
   from there apart from its legs, and its hip moves from where it stands.
   Its swing is then about its feet, where app.css turns it.

   A FIGURE GOING INTO A BAR AT ITS SEAT bobs, and its arms work at getting
   the rest of it in.

   Angles are degrees as CSS turns them: clockwise, which carries the figure's
   feet to the left. Each limb's angle is from the way it is drawn.
   ========================================================================== */
(() => {
  'use strict';

  const PULL = 77;          // gravity over the pendulum's length, per second squared: about 1.4 swings a second
  const REACH = 250;        // pixels of pointer for each radian of figure, so a quick drag swings high and never whips round
  const TRAIL = 6;          // how much of the pointer's speed drags the figure behind it, per second
  const DAMPING = 2.6;      // how fast a swing dies, per second
  const LIMIT = 1.4;        // the furthest it swings, in radians: about 80 degrees
  const SPRING = 144;       // the rise-and-fall spring's pull, per second squared
  const SPRING_DAMPING = 8.4;
  const BUSY_SPEED = 500;   // pixels a second at which the limbs flail in full
  const FRAME = .034;       // the longest step worked out at once, in seconds, so a stalled frame does not fling the figure

  const DEG = 180 / Math.PI;
  // Unbent and where it stands, as every pose is but a dropped figure's.
  const WHOLE = { torso: 0, 'hip-x': 0, 'hip-y': 0 };
  const clamp = (value, most) => Math.max(-most, Math.min(most, value));

  function motion() {
    // The swing and how fast it turns, in radians; the rise-and-fall spring,
    // from -1 lifted to 1 lowered, and how fast it moves; how busy the limbs
    // are, from 0 limp to 1 flailing; and the pointer as last seen.
    let swing = 0, turn = 0, lift = 0, rise = 0, busy = 0, seen = null;

    const pose = (seconds, up) => {
      const wave = (hz, phase = 0) => Math.sin((seconds * hz + phase) * 2 * Math.PI);
      const calm = 1 - busy;
      const lag = clamp(turn * 3, 25);
      return {
        ...WHOLE,
        swing: swing * DEG + 5 * busy * wave(1.6) + 3 * calm * wave(.35),
        stretch: 1 - (up > 0 ? .12 : .22) * up,
        arm: 62 * calm + 28 * busy * wave(2.2) + 6 * calm * wave(.5, .2) - (up > 0 ? 110 : 15) * up - lag,
        'arm-back': 28 * calm - 28 * busy * wave(1.85) + 6 * calm * wave(.5, .45) - (up > 0 ? 120 : 8) * up - lag,
        leg: 17 * calm + 24 * busy * wave(1.7) + 4 * calm * wave(.5, .6) - (up > 0 ? 40 : 5) * up - lag,
        'leg-back': -5 * calm - 24 * busy * wave(1.5) + 4 * calm * wave(.5, .8) + (up > 0 ? 40 : 6) * up - lag,
      };
    };

    /* One frame: `now` in milliseconds, and the pointer in pixels. The first
       call only notes the pointer, and answers the figure at rest. */
    function step(now, x, y) {
      const real = seen ? (now - seen.now) / 1000 : 0;
      if (!seen) seen = { now, x, y, vx: 0, vy: 0 };
      if (real > 0) {
        // The pointer's speed, smoothed, and how that changed since the last frame.
        const vx = seen.vx + ((x - seen.x) / real - seen.vx) * .5;
        const vy = seen.vy + ((y - seen.y) / real - seen.vy) * .5;
        const ax = clamp((vx - seen.vx) / real, 30000);
        const ay = clamp((vy - seen.vy) / real, 30000);
        seen = { now, x, y, vx, vy };
        const dt = Math.min(FRAME, real);

        turn += (-PULL * Math.sin(swing) + (ax + TRAIL * vx) * Math.cos(swing) / REACH - DAMPING * turn) * dt;
        swing += turn * dt;
        // At its limit it bounces back softly instead of going over the top.
        if (Math.abs(swing) > LIMIT) { swing = Math.sign(swing) * LIMIT; turn *= -.3; }

        rise += (-SPRING * lift - SPRING_DAMPING * rise + ay * .008 + vy * .09) * dt;
        lift += rise * dt;
        if (Math.abs(lift) > 1) { lift = Math.sign(lift); rise = 0; }

        // Quick to start flailing and slow to give it up.
        const speed = Math.min(1, Math.hypot(vx, vy) / BUSY_SPEED);
        busy += (speed - busy) * Math.min(1, dt * (speed > busy ? 12 : 3));
      }
      return pose(now / 1000, lift);
    }

    /* A dropped figure's poses by the milliseconds since its feet touched,
       eased from each to the next: where its hip is from where it stands, in
       the drawing's pixels, how far its body leans back from the hip, and
       its limbs. A leg at about -61 and -104 lies flat along the ground in
       front of it; an arm at 62 and 28 hangs. */
    const LANDED = [
      // ms  hip-x  hip-y  torso   leg  leg-back  arm  arm-back
      [0,       0,    0,     0,     0,      0,    35,    15],   // on its feet
      [110,    -7,  10.2,  -25,   -55,   -102,     5,   -15],   // sat down hard, its legs out in front
      [250,    -8,  10.2,  -88,   -61,   -104,   -85,  -115],   // over on its back, its arms above its head
      [500,    -8,  10.2,  -88,   -61,   -104,   -75,  -105],   // lying there
      [820,    -8,  10.2,    6,   -61,   -104,    20,    -5],   // sat up, and a little past upright
      [960,    -8,  10.2,   -4,   -61,   -104,    45,    15],   // settled, sitting
      [1180,   -4,   4.7,   28,   -33,    -66,   105,    55],   // leaning forward and pushing up, its feet coming under it
      [1400,    0,    0,     0,     0,      0,    62,    28],   // on its feet
    ];
    const STOOD = LANDED[LANDED.length - 1][0];

    // Dropped on a bar, `since` milliseconds after its feet touched.
    function landed(now, since) {
      if (since >= STOOD) {
        // On its feet and waiting: a slow sway, arms hanging.
        const sway = Math.sin(now / 1000 * .5 * 2 * Math.PI);
        return { ...WHOLE, swing: 2.5 * sway, stretch: 1, arm: 62 + 5 * sway, 'arm-back': 28 + 5 * sway, leg: 0, 'leg-back': 0 };
      }
      const next = LANDED.findIndex(key => since < key[0]);
      const from = LANDED[next - 1] ?? LANDED[0], to = LANDED[next];
      const part = Math.max(0, (since - from[0]) / (to[0] - from[0]));
      const ease = part * part * (3 - 2 * part);
      const at = i => from[i] + (to[i] - from[i]) * ease;
      return {
        swing: 0, stretch: 1, 'hip-x': at(1), 'hip-y': at(2), torso: at(3),
        leg: at(4), 'leg-back': at(5), arm: at(6), 'arm-back': at(7),
      };
    }

    // Going into a bar at its seat: upright in its own frame, bobbing, one
    // arm and then the other pushing down.
    function planted(now) {
      const beat = Math.sin(now / 1000 * 1.3 * 2 * Math.PI);
      return {
        ...WHOLE,
        swing: 0, stretch: 1 + .04 * Math.sin(now / 1000 * 2.6 * 2 * Math.PI),
        arm: -25 + 40 * beat, 'arm-back': -5 - 40 * beat, leg: 0, 'leg-back': 0,
      };
    }

    // How fast the pointer was last going, in pixels a second: the throw a
    // figure let go mid-travel leaves with.
    const speed = () => ({ vx: seen?.vx ?? 0, vy: seen?.vy ?? 0 });

    // Still held by the bar it is being pulled from, `progress` of the way
    // out from 0 to 1: limp, upright in its own frame, and stretched.
    const pulled = (now, progress) => pose(now / 1000, -Math.max(0, Math.min(1, progress)));

    // Come free at `degrees` from upright: it swings from there, flailing,
    // and the stretch it was pulled to springs back. The pointer is noted
    // afresh, so the pull's own travel is not taken for a throw.
    function release(degrees) {
      swing = clamp(degrees / DEG, LIMIT);
      turn = 0;
      lift = -1;
      rise = 0;
      busy = 1;
      seen = null;
    }

    return { step, speed, pulled, release, landed, stoodAfter: STOOD, planted };
  }

  window.SchedulerCarried = { motion };
})();
