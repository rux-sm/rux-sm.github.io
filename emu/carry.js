/* ==========================================================================
   carry.js — an emulator's saves carried between this Mac and Supabase
   --------------------------------------------------------------------------
   An emulator whose places in emulators.json name a folder in Supabase keeps
   its saves in its own folder on the Mac, and this carries them. It compares
   what Rux Emu Helper reads there with what Supabase lists, by fingerprint,
   with the fingerprint the helper noted at each save's last carry: changed on
   one side, a save is copied to the other; changed on both, the one saved
   last is put on both and the other stays among the copies Supabase keeps.
   A save is one file, or every file under the folder a place's `whole`
   names, carried as one so a game whose save is several files never plays
   files from two copies.
   Nothing is removed from either side, and nothing is written under a
   running emulator. This browser remembers which copy was set aside, so a
   game's panel can offer it: `standing` says how a game's saves stand on
   this Mac, and `useOther` plays the copy set aside in place of the other.
   `tools/carry.test.mjs` runs each case against a stand-in helper and
   Supabase, in `npm run check`.

   `start` sets up an emulator never opened on this Mac from the settings
   kept for it: this Mac's own where it kept some before its emulator was
   removed, else the preferred ones. `remove` keeps an emulator's saves and
   settings in Supabase, then has the helper move it and its folders to the
   Trash, so installing it again sets it up as it was. `give` brings the BIOS, key and firmware files Supabase holds for an
   emulator that this Mac lacks, one way. `before` is what Play does first:
   those files and the saves brought, then the settings Emu manages written,
   so the emulator opens them. `after` waits for the emulator
   to quit, carries what it wrote and backs up this Mac's settings where they
   changed. Opening a page carries whatever waited from a game played with the
   site closed.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const H = R?.helper;
  if (!R?.data || !H) return;

  const sha1Of = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
  const foldersOf = rule => (rule?.places ?? []).map(p => p.stored).filter(Boolean);
  const nameOf = path => path.split('/').pop().replace(/\.[^.]+$/, '');
  // The save a carried file is part of: the folder the first `whole` of its
  // emulator's places names in its path, else the file alone.
  const saveOf = (rule, path) => {
    for (const p of rule?.places ?? []) {
      const m = p.whole && path.match(new RegExp(p.whole, 'i'));
      if (m) return m[1];
    }
    return path;
  };

  // The copy set aside for each save changed on both sides, by its path, as
  // this browser remembers it: its fingerprint in Supabase.
  const ASIDE = 'emu-carry-aside';
  const aside = () => { try { return JSON.parse(localStorage.getItem(ASIDE)) ?? {}; } catch { return {}; } };
  const setAside = (path, sha1) => {
    try { localStorage.setItem(ASIDE, JSON.stringify({ ...aside(), [path]: sha1 })); } catch { /* the panel offers no other copy */ }
  };

  async function carryNow(name) {
    const rule = (await R.emulators()).macSaves[name];
    const folders = foldersOf(rule);
    if (!folders.length) return null;
    const here = await H.carry(name);
    if (!here?.carries) return null;
    const out = { running: here.running, mac: here.mac, up: 0, down: 0, both: [] };
    if (here.running) return out;

    const kept = new Map();
    for (const folder of folders) for (const f of await R.data.files(`${folder}/`)) kept.set(f.path, f);
    const mine = new Map(here.files.map(f => [f.path, f]));

    // This Mac's copy put in Supabase, read against its fingerprint.
    const up = async f => {
      await R.data.keepCopy({ path: f.path, sha1: f.sha1, size: f.size, saved: f.saved, mac: here.mac }, async () => {
        const bytes = await H.carried(f.path);
        if (await sha1Of(bytes) !== f.sha1) throw new Error(`${nameOf(f.path)} changed as it was read. Try again.`);
        return new Blob([bytes]);
      });
      await H.markCarried(f.path, f.sha1);
      out.up += 1;
    };
    // Supabase's copy put on this Mac, with the moment it was saved.
    const down = async k => {
      const bytes = await R.data.fileBytes(k.sha1);
      if (await sha1Of(bytes) !== k.sha1) throw new Error(`${nameOf(k.path)} did not arrive whole. Try again.`);
      await H.putCarried(k.path, k.saved_at, bytes);
      out.down += 1;
    };

    const saves = new Map();
    for (const path of new Set([...mine.keys(), ...kept.keys()])) {
      const save = saveOf(rule, path);
      saves.set(save, [...saves.get(save) ?? [], { path, f: mine.get(path), k: kept.get(path) }]);
    }

    for (const [save, files] of saves) {
      if (files.every(({ f, k }) => f && k && f.sha1 === k.sha1)) {
        for (const { path, f } of files) if (f.carried !== f.sha1) await H.markCarried(path, f.sha1);
        continue;
      }
      // Which side changed since the last carry, a file only one side holds
      // counting as that side's change, and what differs each way.
      const ours = files.some(({ f, k }) => f && (!k || f.carried !== f.sha1));
      const theirs = files.some(({ f, k }) => k && (!f || f.carried !== k.sha1));
      const ups = files.filter(({ f, k }) => f && f.sha1 !== k?.sha1);
      const downs = files.filter(({ f, k }) => k && k.sha1 !== f?.sha1);
      if (!theirs) for (const { f } of ups) await up(f);
      else if (!ours) for (const { k } of downs) await down(k);
      else {
        // Both changed since the last carry. This Mac's goes up either way, so
        // it is kept; where Supabase's was saved last, it becomes the newest
        // copy again and comes down, the whole save at once.
        for (const { f } of ups) await up(f);
        const last = list => Math.max(0, ...list.map(t => new Date(t ?? 0).getTime() || 0));
        const later = last(downs.map(({ k }) => k.saved_at)) > last(ups.map(({ f }) => f.saved));
        if (later) {
          for (const { path, k } of downs) {
            await R.data.keepCopy({ path, sha1: k.sha1, size: k.size, saved: k.saved_at, mac: k.mac }, () => { throw new Error('Supabase no longer holds that save.'); });
            await down(k);
          }
        }
        for (const { path, f, k } of files) if (f && k && f.sha1 !== k.sha1) setAside(path, later ? f.sha1 : k.sha1);
        out.both.push(save === files[0].path ? nameOf(save) : null);
      }
    }
    return out;
  }

  // Each BIOS, key or firmware file Supabase holds for an emulator that this
  // Mac lacks, brought into the emulator's own folder: how many came. One
  // the Mac has is left as it is, since an emulator writes its console's
  // settings into some of them.
  async function giveNow(name) {
    const here = await H.given(name);
    if (!here?.folders.length || here.running) return 0;
    const mine = new Set(here.files.map(f => f.path));
    // What the emulator takes from a folder: every file, or those a kind's
    // include matches, as a Switch's keys and not the firmware beside them.
    const kinds = ((await R.emulators()).macSaves[name]?.files ?? []).filter(k => k.class === 'provided');
    const takes = path => kinds.some(k => [k.given ?? []].flat().some(g => path.startsWith(`${g}/`)
      && (!k.include || [`/${path.slice(g.length + 1)}`, path.slice(g.length + 1)].some(r => new RegExp(k.include).test(r)))));
    let came = 0;
    for (const folder of here.folders) {
      for (const f of await R.data.files(`${folder}/`)) {
        // A folder inside another lists its files twice, so each comes once.
        if (mine.has(f.path) || !takes(f.path)) continue;
        mine.add(f.path);
        const bytes = await R.data.fileBytes(f.sha1);
        if (await sha1Of(bytes) !== f.sha1) throw new Error(`${nameOf(f.path)} did not arrive whole. Try again.`);
        await H.putGiven(name, f.path, bytes);
        came += 1;
      }
    }
    return came;
  }

  // One step for an emulator at a time: a second waits for the first, so
  // two never write the same file.
  const queue = new Map();
  const queued = (name, work) => {
    const next = (queue.get(name) ?? Promise.resolve()).catch(() => {}).then(() => work(name));
    queue.set(name, next);
    return next;
  };
  // A Mac without an emulator's folder starts it from the settings it kept
  // itself, as one whose emulator was removed has, else those kept as
  // preferred, else the newest copy any Mac kept, which makes its folder, so
  // its first Play brings its saves and BIOS like any other: whether it did.
  async function startNow(name) {
    const here = await H.settings(name);
    if (!here || here.home || here.running) return false;
    const mac = (await H.carry(name))?.mac;
    const copies = [...(await R.data.settings()).entries()].filter(([owner]) => owner.endsWith(`/${name}`));
    const copy = (mac && copies.find(([owner]) => owner === `${mac.replaceAll('/', '_')}/${name}`)?.[1][0])
      ?? copies.find(([owner]) => owner === `preferred/${name}`)?.[1][0]
      ?? copies.flatMap(([, list]) => list).sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    if (!copy) return false;
    for (const f of copy.files) {
      const bytes = await R.data.fileBytes(f.sha1);
      if (await sha1Of(bytes) !== f.sha1) throw new Error(`${f.rel} did not arrive whole. Try again.`);
      await H.putSetting(name, f.rel, bytes);
    }
    return true;
  }

  // An emulator off this Mac: its saves carried, its settings kept, both read
  // again to be sure Supabase holds them as they are, then the helper moves
  // the app and its folders to the Trash.
  async function removeNow(name) {
    const c = await carryNow(name);
    const mac = c?.mac ?? (await H.carry(name))?.mac;
    if (c?.running) throw new Error(`Quit ${name} first, so its saves can be kept.`);
    if (!mac) throw new Error('Rux Emu Helper did not say which Mac this is.');
    await backUp(name, mac);
    const again = await carryNow(name);
    if (again && (again.running || again.up || again.down || again.both.length)) throw new Error(`${name}'s saves changed as they were kept. Try again.`);
    const here = await H.settings(name);
    const newest = (await R.data.settings()).get(`${mac.replaceAll('/', '_')}/${name}`)?.[0]?.files ?? [];
    const print = list => list.map(f => `${f.rel}|${f.sha1}`).sort().join('\n');
    if (here?.files.length && print(here.files) !== print(newest)) throw new Error(`${name}'s settings changed as they were kept. Try again.`);
    return H.uninstall(name);
  }

  const run = name => queued(name, carryNow);
  const remove = name => queued(name, removeNow);
  const give = name => queued(name, giveNow);
  const start = name => queued(name, startNow);

  // A whole save's folder names no game, as Azahar's `data` does, so it is said as its saves.
  const told = c => c.both.length
    ? `Two copies of ${c.both.every(Boolean) ? c.both.join(', ') : 'its saves'} were found: the one saved last plays, and the other is kept.`
    : c.up ? 'Its saves are in Supabase.' : 'Its saves are in step.';

  // This Mac's settings for an emulator kept as a new copy where they differ from the newest kept.
  async function backUp(name, mac) {
    const here = await H.settings(name);
    if (!here?.files.length) return;
    const newest = (await R.data.settings()).get(`${mac.replaceAll('/', '_')}/${name}`)?.[0]?.files ?? [];
    const print = list => list.map(f => `${f.rel}|${f.sha1}`).sort().join('\n');
    if (print(here.files) === print(newest)) return;
    await R.data.keepSettings(mac, name, here.files, async f => {
      const bytes = await H.setting(name, f.rel);
      if (await sha1Of(bytes) !== f.sha1) throw new Error(`${f.rel} changed as it was read.`);
      return bytes;
    }, mac);
  }

  const emulatorOf = async system => (await R.emulators()).systems[system]?.emulator;

  // How a game's carried saves stand on this Mac: null where its emulator
  // carries none or none is this game's; else whether each is the copy
  // Supabase holds, and each save with another copy set aside.
  async function standing(game) {
    const emulators = await R.emulators();
    const name = emulators.systems[game.system]?.emulator;
    const folders = foldersOf(emulators.macSaves[name]);
    if (!folders.length) return null;
    const here = await H.carry(name);
    if (!here?.carries) return null;
    const kept = new Map();
    for (const folder of folders) for (const f of await R.data.files(`${folder}/`)) kept.set(f.path, f.sha1);
    const mine = new Map(here.files.map(f => [f.path, f.sha1]));
    // A save's path is saves/<the folder of its emulator's first system>/<the rest>.
    const its = path => {
      const [, top, ...rest] = path.split('/');
      return emulators.systems[top]
        && R.saveRules.match(rest.join('/'), R.saveRules.systemsOf(top, emulators.systems), [game], emulators.systems).game === game;
    };
    const paths = [...new Set([...mine.keys(), ...kept.keys()])].filter(its);
    if (!paths.length) return null;
    const set = aside();
    return { emulator: name, running: here.running, inStep: paths.every(p => mine.get(p) === kept.get(p)),
      other: paths.filter(p => set[p] && set[p] !== kept.get(p)) };
  }

  // The copy set aside made the one that plays: it becomes Supabase's newest
  // and comes down, and the one it replaces is set aside in its place.
  async function useOther(name, path) {
    const now = (await R.data.files(path)).find(f => f.path === path);
    const other = await R.data.copyOf(path, aside()[path]);
    if (!now || !other) throw new Error('Supabase no longer keeps the other copy.');
    if ((await H.carry(name))?.running) throw new Error(`Quit ${name} first, so its save can change.`);
    await run(name);
    await R.data.keepCopy({ path, sha1: other.sha1, size: other.size, saved: other.saved_at, mac: other.mac }, () => { throw new Error('Supabase no longer keeps the other copy.'); });
    setAside(path, now.sha1);
    return run(name);
  }

  // Before a game plays: whether its emulator's saves are carried. A carry
  // that fails says so and the game plays with this Mac's saves.
  async function before(system, say = () => {}) {
    const name = await emulatorOf(system);
    if (!name || !foldersOf((await R.emulators()).macSaves[name]).length) return false;
    say('Bringing its saves…');
    let c;
    try { await start(name); await give(name); c = await run(name); } catch (error) { console.error(error); say('Its saves could not be brought, so this Mac\'s play.'); c = { running: false }; }
    if (!c) return false;
    if (c.running) throw new Error(`Quit ${name} first, so its saves can be brought.`);
    await H.manage(name);
    return true;
  }

  // After a game starts: once its emulator has quit, what it wrote is carried.
  const watching = new Set();
  async function after(system, say = () => {}) {
    const name = await emulatorOf(system);
    if (!name || watching.has(name)) return;
    watching.add(name);
    const started = Date.now();
    let seen = false;
    const look = async () => {
      try {
        const here = await H.carry(name);
        if (here?.running) seen = true;
        else if (seen || Date.now() - started > 20000) {
          watching.delete(name);
          // An emulator may write a save a moment after it closes its window.
          await new Promise(r => setTimeout(r, 2000));
          const c = await run(name);
          if (c && !c.running) { await backUp(name, c.mac); say(told(c)); }
          return;
        }
      } catch (error) {
        console.error(error);
        watching.delete(name);
        say(`Its saves were not carried: ${error.message}`);
        return;
      }
      setTimeout(look, 3000);
    };
    setTimeout(look, 3000);
  }

  // Opening the site on a Mac carries what waited there and brings what is newer.
  (async () => {
    if (!H.onMac || !await H.status()) return;
    for (const [name, rule] of Object.entries((await R.emulators()).macSaves)) {
      if (!foldersOf(rule).length) continue;
      try { await give(name); await run(name); } catch (error) { console.error(error); }
    }
  })();

  R.carry = { run, give, start, remove, before, after, standing, useOther };
})();
