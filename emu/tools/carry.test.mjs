#!/usr/bin/env node
// carry.test.mjs -- runs carry.js against a stand-in helper and Supabase:
// one case per way a save can differ between a Mac and Supabase, then what a
// game's panel is told and the press that plays the copy set aside, then a
// save of several files, as Azahar's, carried as one, an emulator kept and
// then removed, then a game's cards:
// one pulled out, a new save begun, the first put back, and a Mac that
// still holds a save taken out elsewhere.

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

const GB = { emulator: 'mGBA', systems: { gb: { emulator: 'mGBA', saves: 'name' } }, macSaves: { mGBA: { places: [{ stored: 'saves/gb' }, { stored: 'saves/gb/states' }] } } };
async function world({ local = {}, ledger = {}, remote = [], running = false, rules = GB, home = '~/.config/mgba', kept = new Map(), keptBytes = {}, oldHelper = false }) {
  const written = [];
  const uninstalled = [];
  // local: path -> {text, saved}; remote rows oldest first: {path, text, saved}
  const mac = new Map(Object.entries(local).map(([p, v]) => [p, { bytes: enc(v.text), saved: v.saved }]));
  const led = new Map(Object.entries(ledger).map(([p, t]) => [p, sha(enc(t))]));
  const rows = []; const blobs = new Map(); let tick = 0;
  // A remote row with no text is a save taken out.
  for (const r of remote) {
    if (r.text == null) { rows.push({ path: r.path, sha1: null, size: null, saved_at: null, mac: 'other', carried_at: ++tick }); continue; }
    const b = enc(r.text); blobs.set(sha(b), b); rows.push({ path: r.path, sha1: sha(b), size: b.length, saved_at: r.saved, mac: 'other', carried_at: ++tick });
  }
  const cards = [];
  const now = () => { const m = new Map(); for (const r of [...rows].sort((a, b) => a.carried_at - b.carried_at)) m.set(r.path, r); return [...m.values()]; };
  const H = {
    onMac: false, status: async () => null,
    carry: async () => ({ carries: true, running, mac: 'this Mac', files: [...mac].map(([path, f]) => ({ path, size: f.bytes.length, sha1: sha(f.bytes), saved: f.saved, carried: led.get(path) ?? null })) }),
    carried: async p => mac.get(p).bytes,
    putCarried: async (p, saved, bytes) => { if (running) throw new Error('running'); mac.set(p, { bytes, saved }); led.set(p, sha(bytes)); },
    markCarried: async (p, s) => { if (sha(mac.get(p).bytes) !== s) throw new Error('changed'); led.set(p, s); },
    removeCarried: async (p, s) => { if (oldHelper) return null; if (running) throw new Error('running'); if (mac.has(p) && sha(mac.get(p).bytes) !== s) throw new Error('changed'); mac.delete(p); led.delete(p); return true; },
    manage: async () => ({}), settings: async () => ({ home, running, files: [] }),
    uninstall: async name => { uninstalled.push(name); return true; },
    putSetting: async (name, rel, bytes) => { written.push([name, rel, new TextDecoder().decode(bytes)]); home = '~/.config/mgba'; },
  };
  const data = {
    files: async folder => now().filter(r => r.sha1 && r.path.startsWith(folder)),
    gone: async folder => now().filter(r => !r.sha1 && r.path.startsWith(folder)).map(r => r.path),
    takeOut: async (path, by) => { rows.push({ path, sha1: null, size: null, saved_at: null, mac: by, carried_at: ++tick }); },
    dropFile: async path => { for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].path === path) rows.splice(i, 1); },
    cards: async () => cards.map(c => ({ ...c })),
    addCard: async row => { if (cards.some(c => c.system === row.system && c.game === row.game && (c.name === row.name || (c.inserted && row.inserted)))) throw new Error('duplicate'); const c = { id: `id${cards.length + 1}`, ...row }; cards.push(c); return { ...c }; },
    setCard: async (id, values) => { const c = cards.find(x => x.id === id); if (values.inserted && cards.some(x => x !== c && x.game === c.game && x.inserted)) throw new Error('two in'); Object.assign(c, values); },
    fileBytes: async s => blobs.get(s) ?? (keptBytes[s] != null ? enc(keptBytes[s]) : undefined),
    keepCopy: async (f, bytes) => { if (!blobs.has(f.sha1)) blobs.set(f.sha1, new Uint8Array(await (await bytes()).arrayBuffer())); rows.push({ path: f.path, sha1: f.sha1, size: f.size, saved_at: f.saved, mac: f.mac, carried_at: ++tick }); },
    settings: async () => kept, keepSettings: async () => {},
    copyOf: async (path, sha1) => rows.find(r => r.path === path && r.sha1 === sha1) ?? null,
  };
  const store = new Map();
  const localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  const window = { Emu: { data, helper: H, saveRules, emulators: async () => rules } };
  new Function('window', 'crypto', 'Blob', 'console', 'localStorage', src)(window, globalThis.crypto, Blob, console, localStorage);
  const out = await window.Emu.carry.run(rules.emulator);
  const text = b => new TextDecoder().decode(b);
  return { out, written, uninstalled, cards, carry: window.Emu.carry, play: (p, t, saved) => mac.set(p, { bytes: enc(t), saved }), local: p => mac.has(p) ? text(mac.get(p).bytes) : null, remote: p => { const r = now().find(r => r.path === p); return r?.sha1 ? text(blobs.get(r.sha1)) : null; },
    copies: p => rows.filter(r => r.path === p && r.sha1).map(r => text(blobs.get(r.sha1))), ledger: p => led.get(p), sha: t => sha(enc(t)) };
}
const P = 'saves/gb/Game.sav';
let w;
// Turning a console off keeps; only putting it back removes.
w = await world({});
w.play(P, 'A', '2026-01-01T00:00:00Z');
await w.carry.keep('mGBA');
check('keeping carries what was played since and takes nothing off this Mac', w.remote(P) === 'A' && w.local(P) === 'A' && w.uninstalled.length === 0);
w.play(P, 'B', '2026-01-02T00:00:00Z');
await w.carry.remove('mGBA');
check('removing keeps what changed since it was kept, then takes the emulator off', w.remote(P) === 'B' && w.uninstalled.join() === 'mGBA');
w = await world({ local: { [P]: { text: 'A', saved: 'x' } }, running: true });
check('neither keeps nor removes under a running emulator', await w.carry.keep('mGBA').then(() => false, () => true) && await w.carry.remove('mGBA').then(() => false, () => true) && w.uninstalled.length === 0);
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
const copyOf = (at, text) => ({ at, mac: 'a Mac', files: [{ rel: 'config.ini', sha1: sha(enc(text)), size: text.length }] });
const keptSets = sets => new Map(sets.map(([owner, list]) => [`${owner}/mGBA`, list]));
const bytesOf = (...texts) => Object.fromEntries(texts.map(t => [sha(enc(t)), t]));
w = await world({ home: null, kept: keptSets([['preferred', [copyOf('2026-01-01', 'preferred set')]], ['a Mac', [copyOf('2026-02-01', 'newer Mac set')]]]), keptBytes: bytesOf('preferred set', 'newer Mac set') });
let took = await w.carry.start('mGBA');
check('an emulator never opened here starts from the preferred settings', took === true && w.written.length === 1 && w.written[0][2] === 'preferred set');
w = await world({ home: null, kept: keptSets([['old Mac', [copyOf('2026-01-01', 'old')]], ['new Mac', [copyOf('2026-03-01', 'newest')]]]), keptBytes: bytesOf('old', 'newest') });
took = await w.carry.start('mGBA');
check('with no preferred set, it starts from the newest copy any Mac kept', took === true && w.written[0]?.[2] === 'newest');
w = await world({ kept: keptSets([['preferred', [copyOf('2026-01-01', 'preferred set')]]]), keptBytes: bytesOf('preferred set') });
took = await w.carry.start('mGBA');
check('an emulator this Mac already opened keeps its own settings', took === false && w.written.length === 0);
w = await world({ home: null });
took = await w.carry.start('mGBA');
check('with no settings kept anywhere, nothing is written', took === false && w.written.length === 0);
w = await world({ home: null, kept: keptSets([['preferred', [copyOf('2026-01-01', 'what Supabase lists')]]]), keptBytes: { [sha(enc('what Supabase lists'))]: 'other bytes' } });
check('settings that do not match their fingerprint are not written', await w.carry.start('mGBA').then(() => false, () => true) && w.written.length === 0);
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

// A game's cards. Its save and its save state are one card.
const ST = 'saves/gb/states/Game.ss1';
const games = [game, { system: 'gb', title: 'Other', files: [{ name: 'gb/Other.gb' }] }];
const of = async () => (await w.carry.cardsFor('gb', games)).games.get('Game');
w = await world({ local: { [P]: { text: 'A', saved: '2026-01-01T00:00:00Z' }, [ST]: { text: 'S', saved: '2026-01-01T00:00:00Z' }, 'saves/gb/Other.sav': { text: 'O', saved: 'x' } } });
let c = await of();
check('a game with a save has one card in, not yet named, its save state riding on it', c.in && c.in.name === null && c.in.states === 1 && c.out.length === 0);
await w.carry.takeOut(game, games);
c = await of();
check('a card pulled out leaves this Mac and Supabase with no save for its game', w.local(P) === null && w.local(ST) === null && w.remote(P) === null && w.remote(ST) === null && c.in === null);
check('and is kept whole and named, out of its game', c.out.length === 1 && c.out[0].name === 'Card 1' && c.out[0].states === 1 && w.remote(`cards/${c.out[0].id}/${P}`) === 'A' && w.remote(`cards/${c.out[0].id}/${ST}`) === 'S');
check('another game\'s save is left alone', w.local('saves/gb/Other.sav') === 'O' && w.remote('saves/gb/Other.sav') === 'O');
let again = await w.carry.run('mGBA');
check('a carry after brings nothing back', again.up === 0 && again.down === 0 && w.local(P) === null);
w.play(P, 'N', '2026-02-01T00:00:00Z');
await w.carry.run('mGBA');
c = await of();
check('playing with no card in starts a new one', w.remote(P) === 'N' && c.in?.name === null && c.out.length === 1);
const first = c.out[0].id;
await w.carry.putIn(game, games, first);
c = await of();
check('putting the first card back swaps them, save state and all', w.local(P) === 'A' && w.local(ST) === 'S' && w.remote(P) === 'A' && c.in?.name === 'Card 1' && c.out.length === 1 && c.out[0].name === 'Card 2');
check('the card swapped out is whole under its own id, and the one put in has left cards/', w.remote(`cards/${c.out[0].id}/${P}`) === 'N' && w.remote(`cards/${first}/${P}`) === null);
await w.carry.rename(game, c.in.id, 'First run');
check('a card takes a name', (await of()).in.name === 'First run');
w = await world({ local: { [P]: { text: 'A', saved: 'x' } } });
await w.carry.rename(game, null, 'Mine');
c = await of();
check('naming a card not yet named gives the one in its name', c.in.name === 'Mine' && w.cards.length === 1 && w.cards[0].inserted === true);
w = await world({ local: { [P]: { text: 'A', saved: 'x' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'A', saved: 'x' }, { path: P }] });
check('a save taken out elsewhere goes off this Mac too, and is not carried back up', w.local(P) === null && w.remote(P) === null && w.out.off === 1 && w.out.up === 0);
w = await world({ local: { [P]: { text: 'A', saved: 'x' } }, remote: [{ path: P, text: 'A', saved: 'x' }, { path: P }] });
check('so does one this Mac never carried, being a copy Supabase keeps', w.local(P) === null && w.remote(P) === null && w.out.up === 0);
w = await world({ local: { [P]: { text: 'B', saved: 'y' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'A', saved: 'x' }, { path: P }] });
check('one changed here since is a new save, and goes up', w.local(P) === 'B' && w.remote(P) === 'B' && w.out.up === 1);
w = await world({ oldHelper: true, local: { [P]: { text: 'A', saved: 'x' } }, ledger: { [P]: 'A' }, remote: [{ path: P, text: 'A', saved: 'x' }, { path: P }] });
check('a helper too old to take it off leaves it, and it is still not carried up', w.local(P) === 'A' && w.remote(P) === null && w.out.up === 0 && w.out.off === 0);
w = await world({ oldHelper: true, local: { [P]: { text: 'A', saved: 'x' } } });
check('a card does not come out under a helper too old, and its save stays', await w.carry.takeOut(game, games).then(() => false, () => true) && w.local(P) === 'A' && w.remote(P) === 'A' && (await of()).in !== null);
w = await world({ running: true, local: { [P]: { text: 'A', saved: 'x' } }, remote: [{ path: P, text: 'A', saved: 'x' }] });
check('nor under a running emulator', await w.carry.takeOut(game, games).then(() => false, () => true) && w.local(P) === 'A' && w.remote(P) === 'A');

// A 3DS save is a folder of files, read from emulators.json as Azahar's places name it.
const rules = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../emulators.json', import.meta.url)), 'utf8'));
const N3DS = { emulator: 'Azahar', systems: { n3ds: rules.systems.n3ds }, macSaves: { Azahar: rules.macSaves.Azahar } };
const D = 'saves/n3ds/sdmc/Nintendo 3DS/0/0/title/00040000/00033500/data/00000001';
const S1 = `${D}/save00.bin`, S2 = `${D}/system.dat`;
w = await world({ rules: N3DS, local: { [S1]: { text: 'a2', saved: '2026-01-02T00:00:00Z' }, [S2]: { text: 'b1', saved: '2026-01-01T00:00:00Z' } },
  ledger: { [S1]: 'a1', [S2]: 'b1' }, remote: [{ path: S1, text: 'a1', saved: '2026-01-01T00:00:00Z' }, { path: S2, text: 'b2', saved: '2026-01-03T00:00:00Z' }] });
check('a save of several files changed on both sides comes whole from the one saved last', w.local(S1) === 'a1' && w.local(S2) === 'b2' && w.remote(S1) === 'a1' && w.copies(S1).includes('a2') && w.out.both.length === 1);
w = await world({ rules: N3DS, local: { [S1]: { text: 'a2', saved: 'x' }, [S2]: { text: 'b1', saved: 'x' } }, ledger: { [S1]: 'a1', [S2]: 'b1' },
  remote: [{ path: S1, text: 'a1', saved: 'x' }, { path: S2, text: 'b1', saved: 'x' }] });
check('one file of a save changed on this Mac goes up alone', w.remote(S1) === 'a2' && w.out.up === 1 && w.out.down === 0);
w = await world({ rules: N3DS, remote: [{ path: S1, text: 'a1', saved: 'x' }, { path: S2, text: 'b1', saved: 'x' }] });
check('a new Mac gets every file of a save', w.local(S1) === 'a1' && w.local(S2) === 'b1' && w.out.down === 2);

// A BIOS, key or firmware file Supabase holds is brought where this Mac
// lacks it, from each folder a kind names and only the files it takes.
async function giving(name, have, rows, folders = [...new Set(rows.map(p => p.split('/').slice(0, 2).join('/')))]) {
  const blobs = new Map(rows.map(p => [sha(enc(p)), enc(p)]));
  const put = [];
  const H = { onMac: false, status: async () => null,
    given: async () => ({ folders, running: false, files: have.map(path => ({ path })) }),
    putGiven: async (_, path) => put.push(path) };
  const data = { files: async folder => rows.filter(p => p.startsWith(folder)).map(path => ({ path, sha1: sha(enc(path)) })), fileBytes: async s => blobs.get(s) };
  const window = { Emu: { data, helper: H, saveRules, emulators: async () => rules } };
  new Function('window', 'crypto', 'Blob', 'console', 'localStorage', src)(window, globalThis.crypto, Blob, console, { getItem: () => null, setItem: () => {} });
  await window.Emu.carry.give(name);
  return put.sort().join();
}
const FW = 'bios/switch/Contents/registered/0a1b.nca/00';
check('a Switch\'s keys and installed firmware are brought, each once, and the firmware zip is not',
  await giving('Ryujinx', [], ['bios/switch/prod.keys', 'bios/switch/title.keys', 'bios/switch/Firmware.22.1.0.zip', FW], ['bios/switch', 'bios/switch/Contents'])
    === `${FW},bios/switch/prod.keys,bios/switch/title.keys`);
check('Mesen 2\'s firmware comes from each of its folders, and only what it reads',
  await giving('Mesen 2', ['bios/snes/dsp1.rom'], ['bios/snes/dsp1.rom', 'bios/snes/cx4.rom', 'bios/fds/disksys.rom', 'bios/satellaview/BS-X.bin', 'bios/satellaview/BS-X BIOS (English).sfc'])
    === 'bios/fds/disksys.rom,bios/satellaview/BS-X.bin,bios/snes/cx4.rom');

process.exit(fails ? 1 : 0);
