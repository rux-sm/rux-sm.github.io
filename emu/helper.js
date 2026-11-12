/* ==========================================================================
   helper.js — talking to Rux Emu Helper
   --------------------------------------------------------------------------
   The menu bar app on the Mac, emu/helper/main.swift, answers this site on
   127.0.0.1:47647: `status` is the collection it found, this Mac's library
   folder and each system it can play, or null when no helper answers; a
   helper that names no library plays only from a drive. `mac` is how this Mac stands,
   read now, or null; `install` has it put an emulator's installer from
   Supabase in Applications, by a link signed here, or is null from a helper
   too old to; `settings` is each settings file an emulator keeps here, as
   it is stored, `setting` one's bytes, `putSetting` one written, and
   `manage` the settings Emu manages written over them, `settings` null from
   a helper too old; `macSaves` each save this Mac keeps itself and
   `macSave` one's bytes; `newest` each emulator's newest version out, or
   null from a helper that cannot ask; and `play` opens one game. `call` is any of its
   calls, drive.js's too: a missing thing is null, and any other refusal,
   or one where `must` is set, an error saying why. A game's file is the one
   its emulator opens: a multi-disc game's playlist, a disc's cue sheet, a
   Wii U game's own file, else its only file. `start` opens the helper
   through the rux-emu:// link it registers, and `wake` waits for it to
   answer. `download` asks the helper to
   fetch a game's files from the home server into this Mac's library with
   the signed-in account's token, `downloads` is how far each has come,
   `library` each game file this Mac holds and `space` how much it has free;
   each is null from a helper too old to download. `remove` takes a game's
   files out of the library, stopping any still arriving. `standings` says
   how each game stands on this Mac, from the library and the downloads.
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

  // The installer Supabase holds for an emulator, put on this Mac: fetched by
  // the helper through a link good for a minute, with a receipt naming `version`.
  async function install(emulator, installer, version) {
    const url = await window.Emu.data.givenLink(`emulators/${installer.name}`);
    if (!url) throw new Error('Supabase no longer holds that installer.');
    const r = await call('/install', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emulator, url, name: installer.name, size: Number(installer.size), sha1: installer.sha1, version }),
    });
    return r ? r.json() : null;
  }

  const at = (emulator, rel) => `emulator=${encodeURIComponent(emulator)}${rel == null ? '' : `&rel=${encodeURIComponent(rel)}`}`;
  const settings = async emulator => { const r = await call(`/mac/settings?${at(emulator)}`); return r ? r.json() : null; };
  const setting = async (emulator, rel) => new Uint8Array(await (await call(`/mac/setting?${at(emulator, rel)}`, {}, true)).arrayBuffer());
  const putSetting = (emulator, rel, bytes) => call(`/mac/setting?${at(emulator, rel)}`, { method: 'POST', body: bytes }, true);
  const manage = async emulator => (await call('/mac/manage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emulator }),
  }, true)).json();

  // An emulator's carried saves on this Mac, or null from a helper too old to carry.
  const carry = async emulator => { const r = await call(`/mac/carry?${at(emulator)}`); return r ? r.json() : null; };
  const carried = async path => new Uint8Array(await (await call(`/mac/carried?path=${encodeURIComponent(path)}`, {}, true)).arrayBuffer());
  const putCarried = (path, saved, bytes) => call(`/mac/carried?path=${encodeURIComponent(path)}&saved=${encodeURIComponent(saved ?? '')}`, { method: 'PUT', body: bytes }, true);
  const markCarried = (path, sha1) => call(`/mac/carried/mark?path=${encodeURIComponent(path)}&sha1=${sha1}`, { method: 'POST' }, true);

  // The BIOS, key and firmware files an emulator holds in the folders Supabase fills, or null from a helper too old to take them.
  const given = async emulator => { const r = await call(`/mac/given?${at(emulator)}`); return r ? r.json() : null; };
  const putGiven = (emulator, path, bytes) => call(`/mac/given?${at(emulator)}&path=${encodeURIComponent(path)}`, { method: 'PUT', body: bytes }, true);

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
  const space = async () => { const r = await call('/library/space'); return r ? r.json() : null; };
  async function remove(game) {
    for (const f of filesOf(game)) {
      await call(`/library/file?path=${encodeURIComponent(`${game.system}/${f.name}`)}`, { method: 'DELETE' }, true);
    }
  }

  // How a game stands on this Mac, for every game asked: `held` with each of
  // its files in the library at its size; `arriving` while one waits, comes
  // or is checked; `failed`, with why, where one stopped; else `away`. Each
  // carries the game's bytes and how many are here. A name is matched in one
  // Unicode form, since a drive and a Mac may spell an accent differently.
  const ACTIVE = ['waiting', 'downloading', 'checking'];
  const standings = (library, downloads) => {
    const key = (system, name) => `${system}/${name}`.normalize('NFC');
    const here = new Map((library ?? []).map(f => [key(f.system, f.name), Number(f.size)]));
    const jobs = new Map((downloads ?? []).map(d => [key(d.system, d.name), d]));
    return game => {
      const files = filesOf(game);
      const total = files.reduce((a, f) => a + Number(f.size), 0);
      const has = f => here.get(key(game.system, f.name)) === Number(f.size);
      if (files.length && files.every(has)) return { state: 'held', total, done: total };
      const wanted = files.filter(f => !has(f)).map(f => jobs.get(key(game.system, f.name))).filter(Boolean);
      const done = files.reduce((a, f) => a + (has(f) ? Number(f.size) : Number(jobs.get(key(game.system, f.name))?.done ?? 0)), 0);
      if (wanted.some(j => ACTIVE.includes(j.state))) {
        return { state: 'arriving', total, done, checking: !wanted.some(j => j.state === 'waiting' || j.state === 'downloading') };
      }
      const failed = wanted.find(j => j.state === 'failed');
      return failed ? { state: 'failed', total, done, error: failed.error } : { state: 'away', total, done };
    };
  };

  // A Mac at a desk, where the helper can be: an iPad also says Mac, but has touch.
  const onMac = /Mac/.test(navigator.platform) && navigator.maxTouchPoints < 2;
  const start = () => { location.href = 'rux-emu://open'; };
  // Starts the helper and waits up to ten seconds for it to answer: its status, or null.
  async function wake() {
    start();
    for (let i = 0; i < 10; i += 1) {
      await new Promise(r => setTimeout(r, 1000));
      const s = await status();
      if (s) return s;
    }
    return null;
  }

  window.Emu = Object.assign(window.Emu || {}, { helper: {
    call, status, mac, newest, install, settings, setting, putSetting, manage, carry, carried, putCarried, markCarried, given, putGiven, macSaves, macSave, play, fileOf, filesOf,
    download, downloads, library, space, remove, standings, onMac, start, wake,
  } });
})();
