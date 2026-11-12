/* ==========================================================================
   helper.js — talking to Rux Emu Helper
   --------------------------------------------------------------------------
   The menu bar app on the Mac, emu/helper/main.swift, answers this site on
   127.0.0.1:47647: `status` is the collection it found and each system it
   can play, or null when no helper answers; `mac` is how this Mac stands,
   read now, or null; `macSaves` each save this Mac keeps itself and
   `macSave` one's bytes; `newest` each emulator's newest version out, or
   null from a helper that cannot ask; and `play` opens one game. `call` is any of its
   calls, drive.js's too: a missing thing is null, and any other refusal,
   or one where `must` is set, an error saying why. A game's file is the one
   its emulator opens: a multi-disc game's playlist, a disc's cue sheet, a
   Wii U game's own file, else its only file. `start` opens the helper
   through the rux-emu:// link it registers. `download` asks the helper to
   fetch a game's files from the home server into this Mac's library with
   the signed-in account's token, `downloads` is how far each has come, and
   `library` each game file this Mac holds; each is null from a helper too
   old to download.
   ========================================================================== */
(() => {
  'use strict';

  const BASE = 'http://127.0.0.1:47647';

  async function call(path, init = {}, must = false) {
    const r = await fetch(`${BASE}${path}`, init);
    if (r.ok) return r;
    if (r.status === 404 && !must) return null;
    const out = await r.json().catch(() => ({}));
    throw new Error(out.error ?? 'Rux Emu Helper refused.');
  }

  async function status() {
    try {
      const r = await fetch(`${BASE}/status`, { signal: AbortSignal.timeout(1500) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  // Counting each save folder's files takes the helper a moment.
  async function mac() {
    try {
      const r = await fetch(`${BASE}/mac`, { signal: AbortSignal.timeout(15000) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  // Each feed has 15 seconds to answer the helper.
  async function newest() {
    try {
      const r = await fetch(`${BASE}/newest`, { signal: AbortSignal.timeout(40000) });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }

  const macSaves = async () => (await call('/mac/saves', {}, true)).json();
  const macSave = async stored => new Uint8Array(await (await call(`/mac/save?stored=${encodeURIComponent(stored)}`, {}, true)).arrayBuffer());

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

  // A game's files as the helper fetches them: each name within its system's
  // folder, its size and SHA-1 from the scan; a Switch game's update and
  // add-ons with it.
  const filesOf = game => [...(game.files ?? []), ...(game.extras ?? []).map(e => e.file ?? {})]
    .filter(f => f.name?.startsWith(`${game.system}/`))
    .map(f => ({ name: f.name.slice(game.system.length + 1), size: f.size, sha1: f.sha1 ?? null }));

  async function download(game) {
    const { data: { session } } = await window.Rux.account.client.auth.getSession();
    if (!session) throw new Error('Sign in to download.');
    const r = await call('/download', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: game.system, files: filesOf(game), token: session.access_token }),
    });
    return r ? r.json() : null;
  }
  const downloads = async () => { const r = await call('/downloads'); return r ? r.json() : null; };
  const library = async () => { const r = await call('/library'); return r ? r.json() : null; };

  // A Mac at a desk, where the helper can be: an iPad also says Mac, but has touch.
  const onMac = /Mac/.test(navigator.platform) && navigator.maxTouchPoints < 2;
  const start = () => { location.href = 'rux-emu://open'; };

  window.Emu = Object.assign(window.Emu || {}, { helper: { call, status, mac, newest, macSaves, macSave, play, fileOf, filesOf, download, downloads, library, onMac, start } });
})();
