/* ==========================================================================
   gamepad.js — a game controller as moves
   --------------------------------------------------------------------------
   Chrome's Gamepad API read once a frame while a controller is connected,
   and told as moves: up, down, left and right from the d-pad or the left
   stick, and `a` and `b` from the face buttons as they are labelled: on a
   Nintendo layout, a Pro Controller or a controller in its mode, A is the
   right button and B the bottom one; on any other, A is the bottom one.
   Chrome names a controller by its maker's number, Nintendo's 057e. A held
   direction repeats after 400ms, then every 120ms; a face button counts once
   per press. Moves are told only while the page has focus. `R.onPad(fn)`
   hears them.
   ========================================================================== */
(() => {
  'use strict';

  const listeners = new Set();
  const held = {};
  let frame = 0;

  function read(now) {
    const pad = [...(navigator.getGamepads?.() ?? [])].find(Boolean);
    if (!pad) { frame = 0; return; }
    const button = i => Boolean(pad.buttons[i]?.pressed);
    const axis = i => pad.axes[i] ?? 0;
    const state = {
      up: button(12) || axis(1) < -0.5, down: button(13) || axis(1) > 0.5,
      left: button(14) || axis(0) < -0.5, right: button(15) || axis(0) > 0.5,
      a: button(nintendo(pad) ? 1 : 0), b: button(nintendo(pad) ? 0 : 1),
    };
    for (const [move, on] of Object.entries(state)) {
      if (!on) { delete held[move]; continue; }
      const repeats = move !== 'a' && move !== 'b';
      if (!held[move]) { held[move] = now + 400; tell(move); }
      else if (repeats && now >= held[move]) { held[move] = now + 120; tell(move); }
    }
    frame = requestAnimationFrame(read);
  }
  const nintendo = pad => /vendor: ?057e/i.test(pad.id);
  const tell = move => { if (document.hasFocus()) for (const fn of listeners) fn(move); };
  const listen = () => { if (!frame) frame = requestAnimationFrame(read); };
  window.addEventListener('gamepadconnected', listen);
  listen();

  window.Emu = Object.assign(window.Emu || {}, { onPad: fn => { listeners.add(fn); listen(); } });
})();
