/* ==========================================================================
   helper.js — talking to Rux Emu Helper
   --------------------------------------------------------------------------
   The menu bar app on the Mac, emu/helper/main.swift, answers this site on
   127.0.0.1:47647: `status` is the collection it found and each system it
   can play, or null when no helper answers, and `play` opens one game. A
   game's file is the one its emulator opens: a multi-disc game's playlist, a
   disc's cue sheet, a Wii U game's own file, else its only file.
   `start` opens the helper through the rux-emu:// link it registers.
   ========================================================================== */
(() => {
  'use strict';

  const BASE = 'http://127.0.0.1:47647';

  async function status() {
    try {
      const r = await fetch(`${BASE}/status`, { signal: AbortSignal.timeout(1500) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  const fileOf = game => {
    const names = (game.files ?? []).map(f => f.name.replace(`${game.system}/`, ''));
    return names.find(n => /\.m3u$/i.test(n)) ?? names.find(n => /\.cue$/i.test(n))
      ?? names.find(n => /\.(wua|rpx)$/i.test(n)) ?? names.sort()[0] ?? null;
  };

  async function play(game) {
    const r = await fetch(`${BASE}/play`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: game.system, file: fileOf(game) }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(out.error ?? 'The helper did not start the game.');
    return out;
  }

  // A Mac at a desk, where the helper can be: an iPad also says Mac, but has touch.
  const onMac = /Mac/.test(navigator.platform) && navigator.maxTouchPoints < 2;
  const start = () => { location.href = 'rux-emu://open'; };

  window.Emu = Object.assign(window.Emu || {}, { helper: { status, play, fileOf, onMac, start } });
})();
