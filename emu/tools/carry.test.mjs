#!/usr/bin/env node
// carry.test.mjs -- runs carry.js against a stand-in helper and Supabase:
// one case per way a save can differ between a Mac and Supabase, then what a
// game's panel is told and the press that plays the copy set aside.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const saveRules = createRequire(import.meta.url)('../saves-rules.js');
const src = fs.readFileSync(fileURLToPath(new URL('../carry.js', import.meta.url)), 'utf8');
const sha = b => crypto.createHash('sha1').update(b).digest('hex');
const enc = s => new TextEncoder().encode(s);
let fails = 0;
const check = (name, ok) => { if (!ok) fails++; console.log(ok ? '   ok   ' : '  FAIL  ', name); };

async function world({ local = {}, ledger = {}, remote = [] , running = false }) {
  // local: path -> {text, saved}; remote rows oldest first: {path, text, saved}
  const mac = new Map(Object.entries(local).map(([p, v]) => [p, { bytes: enc(v.text), saved: v.saved }]));
  const led = new Map(Object.entries(ledger).map(([p, t]) => [p, sha(enc(t))]));
  const rows = []; const blobs = new Map(); let tick = 0;
  for (const r of remote) { const b = enc(r.text); blobs.set(sha(b), b); rows.push({ path: r.path, sha1: sha(b), size: b.length, saved_at: r.saved, mac: 'other', carried_at: ++tick }); }
  const now = () => { const m = new Map(); for (const r of [...rows].sort((a, b) => a.carried_at - b.carried_at)) m.set(r.path, r); return [...m.values()]; };
  const H = {
    onMac: false, status: async () => null,
    carry: async () => ({ carries: true, running, mac: 'this Mac', files: [...mac].map(([path, f]) => ({ path, size: f.bytes.length, sha1: sha(f.bytes), saved: f.saved, carried: led.get(path) ?? null })) }),
    carried: async p => mac.get(p).bytes,
    putCarried: async (p, saved, bytes) => { if (running) throw new Error('running'); mac.set(p, { bytes, saved }); led.set(p, sha(bytes)); },
    markCarried: async (p, s) => { if (sha(mac.get(p).bytes) !== s) throw new Error('changed'); led.set(p, s); },
    manage: async () => ({}), settings: async () => ({ files: [] }),
  };
  const data = {
    files: async folder => now().filter(r => r.path.startsWith(folder)),
    fileBytes: async s => blobs.get(s),
    keepCopy: async (f, bytes) => { if (!blobs.has(f.sha1)) blobs.set(f.sha1, new Uint8Array(await (await bytes()).arrayBuffer())); rows.push({ path: f.path, sha1: f.sha1, size: f.size, saved_at: f.saved, mac: f.mac, carried_at: ++tick }); },
    settings: async () => new Map(), keepSettings: async () => {},
    copyOf: async (path, sha1) => rows.find(r => r.path === path && r.sha1 === sha1) ?? null,
  };
  const store = new Map();
  const localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const window = { Emu: { data, helper: H, saveRules, emulators: async () => ({ systems: { gb: { emulator: 'mGBA', saves: 'name' } }, macSaves: { mGBA: { places: [{ stored: 'saves/gb' }, { stored: 'saves/gb/states' }] } } }) } };
  new Function('window', 'crypto', 'Blob', 'console', 'localStorage', src)(window, globalThis.crypto, Blob, console, localStorage);
  const out = await window.Emu.carry.run('mGBA');
  const text = b => new TextDecoder().decode(b);
  return { out, carry: window.Emu.carry, local: p => mac.has(p) ? text(mac.get(p).bytes) : null, remote: p => { const r = now().find(r => r.path === p); return r ? text(blobs.get(r.sha1)) : null; },
    copies: p => rows.filter(r => r.path === p).map(r => text(blobs.get(r.sha1))), ledger: p => led.get(p), sha: t => sha(enc(t)) };
}
const P = 'saves/gb/Game.sav';
let w;
w = await world({ local: { [P]: { text: 'A', saved: '2026-01-01T00:00:00Z' } } });
check('only on this Mac goes up', w.remote(P) === 'A' && w.local(P) === 'A' && w.ledger(P) === w.sha('A') && w.out.up === 1);
w = await world({ remote: [{ path: P, text: 'A', saved: '2026-01-01T00:00:00Z' }] });
check('only in Supabase comes down', w.local(P) === 'A' && w.ledger(P) === w.sha('A') && w.out.down === 1);
w = await world({ local: { [P]: { text: 'A', saved: 'x' } }, remote: [{ path: P, text: 'A', saved: 'x' }] });
check('the same on both is only noted', w.out.up === 0 && w.out.down === 0 && w.ledger(P) === w.sha('A'));
w = await world({ local: { [P]: { text: 'B', saved: '2026-01-02T00:00:00Z' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'A', saved: '2026-01-01T00:00:00Z' }] });
check('changed on this Mac goes up, the old one kept', w.remote(P) === 'B' && w.copies(P).join() === 'A,B' && w.out.both.length === 0);
w = await world({ local: { [P]: { text: 'A', saved: '2026-01-01T00:00:00Z' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'A', saved: '2026-01-01T00:00:00Z' }, { path: P, text: 'B', saved: '2026-01-02T00:00:00Z' }] });
check('changed in Supabase comes down', w.local(P) === 'B' && w.remote(P) === 'B' && w.out.down === 1 && w.out.up === 0);
w = await world({ local: { [P]: { text: 'L', saved: '2026-01-03T00:00:00Z' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'R', saved: '2026-01-02T00:00:00Z' }] });
check('both changed, this Mac saved last: it plays, Supabase\'s kept', w.local(P) === 'L' && w.remote(P) === 'L' && w.copies(P).includes('R') && w.out.both.length === 1);
w = await world({ local: { [P]: { text: 'L', saved: '2026-01-02T00:00:00Z' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'R', saved: '2026-01-03T00:00:00Z' }] });
check('both changed, Supabase saved last: it plays, this Mac\'s kept', w.local(P) === 'R' && w.remote(P) === 'R' && w.copies(P).includes('L') && w.out.both.length === 1);
w = await world({ local: { [P]: { text: 'L', saved: '2026-01-02T00:00:00Z' } }, remote: [{ path: P, text: 'R', saved: '2026-01-03T00:00:00Z' }] });
check('first carry with two different copies loses neither', w.local(P) === 'R' && w.copies(P).includes('L') && w.copies(P).includes('R'));
w = await world({ local: { [P]: { text: 'L', saved: 'x' } }, remote: [{ path: P, text: 'R', saved: 'y' }], running: true });
check('nothing moves under a running emulator', w.local(P) === 'L' && w.remote(P) === 'R' && w.out.running === true);
w = await world({ remote: [{ path: 'saves/gb/states/Game.ss1', text: 'S', saved: 'x' }, { path: 'saves/gbx/Other.sav', text: 'O', saved: 'x' }] });
check('a state comes down once, and another folder is left alone', w.local('saves/gb/states/Game.ss1') === 'S' && w.local('saves/gbx/Other.sav') === null && w.out.down === 1);
const game = { system: 'gb', title: 'Game', files: [{ name: 'gb/Game.gb' }] };
w = await world({ local: { [P]: { text: 'L', saved: '2026-01-02T00:00:00Z' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'R', saved: '2026-01-03T00:00:00Z' }] });
let st = await w.carry.standing(game);
check('a game\'s panel is told its saves are in step and that another copy is kept', st.inStep === true && st.other.join() === P && st.emulator === 'mGBA');
check('another game is told nothing', await w.carry.standing({ system: 'gb', title: 'Other', files: [{ name: 'gb/Other.gb' }] }) === null);
await w.carry.useOther('mGBA', P);
st = await w.carry.standing(game);
check('the other copy plays on a press, and the first is kept to go back to', w.local(P) === 'L' && w.remote(P) === 'L' && w.copies(P).includes('R') && st.inStep && st.other.join() === P);
await w.carry.useOther('mGBA', P);
check('a second press goes back', w.local(P) === 'R' && w.remote(P) === 'R');
w = await world({ local: { [P]: { text: 'A', saved: 'x' } }, remote: [{ path: P, text: 'A', saved: 'x' }] });
st = await w.carry.standing(game);
check('a save never in doubt offers no other copy', st.inStep === true && st.other.length === 0);
process.exit(fails ? 1 : 0);
