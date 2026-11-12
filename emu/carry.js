/* ==========================================================================
   carry.js — an emulator's saves carried between this Mac and Supabase
   --------------------------------------------------------------------------
   An emulator whose places in emulators.json name a folder in Supabase keeps
   its saves in its own folder on the Mac, and this carries them. It compares
   what Rux Emu Helper reads there with what Supabase lists, by fingerprint,
   with the fingerprint the helper noted at each save's last carry: changed on
   one side, a save is copied to the other; changed on both, the one saved
   last is put on both and the other stays among the copies Supabase keeps.
   Nothing is removed from either side, and nothing is written under a
   running emulator.

   `before` is what Play does first: the saves brought, then the settings Emu
   manages written, so the emulator opens them. `after` waits for the emulator
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

  async function carryNow(name) {
    const folders = foldersOf((await R.emulators()).macSaves[name]);
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

    for (const path of new Set([...mine.keys(), ...kept.keys()])) {
      const f = mine.get(path);
      const k = kept.get(path);
      if (!k) await up(f);
      else if (!f) await down(k);
      else if (f.sha1 === k.sha1) { if (f.carried !== f.sha1) await H.markCarried(path, f.sha1); }
      else if (f.carried === k.sha1) await up(f);
      else if (f.carried === f.sha1) await down(k);
      else {
        // Both changed since the last carry. This Mac's goes up either way, so
        // it is kept; where Supabase's was saved last, it becomes the newest
        // copy again and comes down.
        await up(f);
        if (new Date(k.saved_at ?? 0) > new Date(f.saved ?? 0)) {
          await R.data.keepCopy({ path, sha1: k.sha1, size: k.size, saved: k.saved_at, mac: k.mac }, () => { throw new Error('Supabase no longer holds that save.'); });
          await down(k);
        }
        out.both.push(nameOf(path));
      }
    }
    return out;
  }

  // One carry of an emulator at a time: a second waits for the first.
  const queue = new Map();
  const run = name => {
    const next = (queue.get(name) ?? Promise.resolve()).catch(() => {}).then(() => carryNow(name));
    queue.set(name, next);
    return next;
  };

  const told = c => c.both.length
    ? `Two copies of ${c.both.join(', ')} were found: the one saved last plays, and the other is kept.`
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

  // Before a game plays: whether its emulator's saves are carried. A carry
  // that fails says so and the game plays with this Mac's saves.
  async function before(system, say = () => {}) {
    const name = await emulatorOf(system);
    if (!name || !foldersOf((await R.emulators()).macSaves[name]).length) return false;
    say('Bringing its saves…');
    let c;
    try { c = await run(name); } catch (error) { console.error(error); say('Its saves could not be brought, so this Mac\'s play.'); c = { running: false }; }
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
      try { await run(name); } catch (error) { console.error(error); }
    }
  })();

  R.carry = { run, before, after };
})();
