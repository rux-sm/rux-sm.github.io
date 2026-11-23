#!/usr/bin/env node
// scan-save.test.mjs -- runs scan-save.js against a stand-in of Supabase's
// REST address holding invented rows: what a scan changes, the requests the
// secret-key calls make, and a save's renames, writes and deletions.

import scanSave from '../scan-save.js';

let failed = 0;
let cases = 0;
const check = (name, ok, got) => {
  cases++;
  if (ok) return;
  failed++;
  console.error(`  fail  ${name}${got === undefined ? '' : `: got ${JSON.stringify(got)}`}`);
};
const url = 'https://example.supabase.co';
const KEY = 'a-secret-key';

// The stand-in: rows by table, every request it was asked kept, answering as PostgREST does.
function world(tables) {
  const asked = [];
  const objects = new Map();
  const fetch = async (to, init = {}) => {
    const u = new URL(to);
    const table = u.pathname.split('/').pop();
    if (u.pathname.startsWith('/storage/v1/object/emu-collection/')) {
      asked.push({ method: init.method, table: 'bucket', query: table });
      if (init.method === 'DELETE') objects.delete(table); else objects.set(table, init.body);
      return { ok: true, status: 200, text: async () => '' };
    }
    asked.push({ method: init.method ?? 'GET', table, query: u.search, body: init.body ? JSON.parse(init.body) : null, prefer: init.headers?.prefer });
    if (init.headers?.apikey !== KEY || init.headers?.authorization !== `Bearer ${KEY}`) return { ok: false, status: 401, text: async () => '' };
    const rows = tables[table] ?? [];
    const match = [...u.searchParams].filter(([k, v]) => v.startsWith('eq.')).map(([k, v]) => [k, v.slice(3)]);
    const hits = r => match.every(([k, v]) => String(r[k]) === v);
    if (!init.method) {
      const from = Number(u.searchParams.get('offset'));
      return { ok: true, status: 200, json: async () => rows.filter(hits).slice(from, from + Number(u.searchParams.get('limit'))) };
    }
    if (init.method === 'PATCH') for (const r of rows.filter(hits)) Object.assign(r, JSON.parse(init.body));
    if (init.method === 'DELETE') tables[table] = rows.filter(r => !hits(r));
    if (init.method === 'POST' && !u.searchParams.get('on_conflict')) { tables[table] = [...rows, JSON.parse(init.body)]; return { ok: true, status: 201, text: async () => '' }; }
    if (init.method === 'POST') {
      const keys = u.searchParams.get('on_conflict').split(',');
      for (const row of JSON.parse(init.body)) {
        const at = rows.findIndex(r => keys.every(k => r[k] === row[k]));
        if (at < 0) rows.push(row); else rows[at] = { ...rows[at], ...row };
        tables[table] = rows;
      }
    }
    return { ok: true, status: 201, text: async () => '' };
  };
  return { fetch, asked, tables, objects };
}

const game = (title, size, extra = {}) => ({ system: 'gb', title, size, files: [{ name: `gb/${title}.gb`, size }], ...extra });
const scan = {
  scanned: '2026-11-13T04:00:00.000Z',
  games: [game('Kept', 100), game('Grown', 300), game('New', 50), game('Renamed (Rev 1)', 70)],
  saves: [{ system: 'gb', name: 'Kept', kind: 'save', game: 'Kept', files: [], size: 8 }],
  toDelete: [], unsortedSaves: [],
  renames: [{ system: 'gb', from: 'Renamed', to: 'Renamed (Rev 1)' }],
};

// What a scan changes.
{
  const c = scanSave.changes(scan,
    [game('Kept', 100), game('Grown', 200), game('Gone', 10)],
    [{ system: 'gb', name: 'Old', kind: 'save', location: 'drive' }, { system: 'gb', name: 'Kept', kind: 'state', location: 'a Mac' }]);
  check('a new game is added', c.added.map(g => g.title).join() === 'New,Renamed (Rev 1)', c.added.map(g => g.title));
  check('a game of another size is changed', c.changed.map(g => g.title).join() === 'Grown', c.changed.map(g => g.title));
  check('a game no longer scanned is gone', c.gone.map(g => g.title).join() === 'Gone', c.gone.map(g => g.title));
  check('a server save not scanned is gone', c.savesGone.map(s => s.name).join() === 'Old', c.savesGone);
  check('a Mac\'s save is never the server\'s', !c.savesGone.some(s => s.location !== 'drive'), c.savesGone);
  check('a scanned save not saved is new', c.savesNew.map(s => s.name).join() === 'Kept', c.savesNew);
}

// A save through the secret-key calls.
{
  const w = world({
    emu_games: [game('Kept', 100), game('Grown', 200), game('Gone', 10)],
    emu_notes: [{ system: 'gb', title: 'Renamed', note: 'rux wrote this' }],
    emu_saves: [{ system: 'gb', name: 'Renamed', kind: 'save', location: 'a Mac', game: 'Renamed' },
      { system: 'gb', name: 'Old', kind: 'save', location: 'drive' }],
    emu_scan: [{ id: 1, newest: { mGBA: '0.10.5' } }],
  });
  const db = scanSave.restDb({ url, key: KEY, fetch: w.fetch });
  const games = await db.rows('emu_games', 'system,title,size');
  const saves = await db.rows('emu_saves', 'system,name,kind,location');
  const [row] = await db.rows('emu_scan', 'newest');
  const change = scanSave.changes(scan, games, saves);
  await scanSave.save(db, scanSave.rowsOf(scan, change, { newest: row.newest }));
  const t = w.tables;

  check('every request carries the key', w.asked.length > 0);
  check('a read names its columns and pages', w.asked[0].query === '?select=system,title,size&limit=1000&offset=0', w.asked[0].query);
  check('a renamed game keeps its note', t.emu_notes[0].title === 'Renamed (Rev 1)' && t.emu_notes[0].note === 'rux wrote this', t.emu_notes);
  check('a renamed game\'s save moves with it', t.emu_saves.some(s => s.name === 'Renamed (Rev 1)' && s.location === 'a Mac'), t.emu_saves);
  check('every scanned game is written', ['Kept', 'Grown', 'New', 'Renamed (Rev 1)'].every(n => t.emu_games.some(g => g.title === n)), t.emu_games.map(g => g.title));
  check('a game of another size takes its new size', t.emu_games.find(g => g.title === 'Grown').size === 300);
  check('a game gone is deleted', !t.emu_games.some(g => g.title === 'Gone'), t.emu_games.map(g => g.title));
  check('a server save gone is deleted', !t.emu_saves.some(s => s.name === 'Old'), t.emu_saves);
  check('the scanned save is written as the server\'s', t.emu_saves.some(s => s.name === 'Kept' && s.location === 'drive'), t.emu_saves);
  check('the scan\'s row keeps its newest versions', t.emu_scan[0].newest?.mGBA === '0.10.5', t.emu_scan[0]);
  check('the scan\'s row takes the scan\'s time', t.emu_scan[0].scanned_at === scan.scanned, t.emu_scan[0]);
  const upserts = w.asked.filter(a => a.method === 'POST');
  check('a write merges over the row with the same key', upserts.every(a => a.prefer?.includes('resolution=merge-duplicates')), upserts);
  const del = w.asked.find(a => a.method === 'DELETE' && a.table === 'emu_games');
  check('a deletion names the row exactly', del?.query === '?system=eq.gb&title=eq.Gone', del?.query);
}

// A title with the characters a filter treats specially still names one row.
{
  const w = world({ emu_games: [game('A, B (USA) & C', 5)] });
  const db = scanSave.restDb({ url, key: KEY, fetch: w.fetch });
  await db.remove('emu_games', { system: 'gb', title: 'A, B (USA) & C' });
  check('a title with commas, brackets and an ampersand is deleted', w.tables.emu_games.length === 0, w.asked.at(-1).query);
}

// The files every Mac is given: which differ, and putting them in Supabase.
{
  const held = [
    { path: 'bios/psx/same.bin', size: 10, saved_at: '2026-11-01T00:00:00.400Z', sha1: 'a'.repeat(40) },
    { path: 'bios/psx/grown.bin', size: 10, saved_at: '2026-11-01T00:00:00Z', sha1: 'b'.repeat(40) },
    { path: 'emulators/Dolphin-2512-macOS.dmg', size: 5, saved_at: '2026-10-01T00:00:00Z', sha1: 'c'.repeat(40) },
  ];
  const disk = {
    'bios/psx/same.bin': { size: 10, mtimeMs: Date.parse('2026-11-01T00:00:00.900Z') },
    'bios/psx/grown.bin': { size: 12, mtimeMs: Date.parse('2026-11-01T00:00:00Z') },
    'bios/psx/new.bin': { size: 3, mtimeMs: Date.parse('2026-11-02T00:00:00Z') },
    'emulators/Dolphin-2609b-macOS.dmg': { size: 6, mtimeMs: Date.parse('2026-11-03T00:00:00Z') },
  };
  const found = { bios: ['psx/same.bin', 'psx/grown.bin', 'psx/new.bin', 'psx/gone.bin'].map(name => ({ name })),
    installers: [{ name: 'Dolphin-2609b-macOS.dmg' }] };
  const given = await scanSave.givenChanged(found, async p => disk[p] ?? null, held);
  check('a file the same to the second is left', !given.some(f => f.path === 'bios/psx/same.bin'), given.map(f => f.path));
  check('a file of another size and a new one go', ['bios/psx/grown.bin', 'bios/psx/new.bin'].every(p => given.some(f => f.path === p)), given.map(f => f.path));
  check('a file no longer on the server is not asked for', !given.some(f => f.path === 'bios/psx/gone.bin'), given.map(f => f.path));

  const w = world({
    emu_files: held.map(({ path, sha1, size }) => ({ path, sha1, size })),
    emu_files_now: held.map(({ path, sha1 }) => ({ path, sha1 })),
  });
  w.objects.set('c'.repeat(40), 'old installer');
  const sha = { 'bios/psx/grown.bin': 'b'.repeat(40), 'bios/psx/new.bin': 'd'.repeat(40), 'emulators/Dolphin-2609b-macOS.dmg': 'e'.repeat(40) };
  const read = [];
  const ordered = given.sort((a, b) => a.path.localeCompare(b.path));
  // The stand-in's emu_files_now follows emu_files, as the view does.
  const fetchNow = w.fetch;
  w.fetch = async (to, init) => { w.tables.emu_files_now = w.tables.emu_files.map(({ path, sha1 }) => ({ path, sha1 })); return fetchNow(to, init); };
  await scanSave.putGiven(scanSave.restDb({ url, key: KEY, fetch: w.fetch }), ordered, {
    sha1Of: async p => sha[p], bytesOf: async p => { read.push(p); return `bytes of ${p}`; }, mac: 'home server', names: ['Dolphin'],
  });
  check('bytes Supabase already has are not read again', !read.includes('bios/psx/grown.bin'), read);
  check('new bytes are read and put in the bucket', read.includes('bios/psx/new.bin') && w.objects.has('d'.repeat(40)), read);
  check('each file gets a row naming the server', ['bios/psx/new.bin', 'emulators/Dolphin-2609b-macOS.dmg'].every(p => w.tables.emu_files.some(f => f.path === p && f.mac === 'home server')), w.tables.emu_files);
  check('a newer installer takes its emulator\'s older one\'s place', !w.tables.emu_files.some(f => f.path === 'emulators/Dolphin-2512-macOS.dmg'), w.tables.emu_files.map(f => f.path));
  check('the older installer\'s bytes go with it', !w.objects.has('c'.repeat(40)));
}

// A game's cover from libretro's thumbnails, by its names, a link followed.
{
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1]);
  const text = t => new TextEncoder().encode(t);
  const at = 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy/HEAD/Named_Boxarts/';
  const shelf = {
    [`${at}${encodeURIComponent('Plain Game (World).png')}`]: png,
    [`${at}${encodeURIComponent('Linked Game (USA).png')}`]: text('Linked Game (World).png'),
    [`${at}${encodeURIComponent('Linked Game (World).png')}`]: png,
    [`${at}${encodeURIComponent('Odd Link (USA).png')}`]: text('../somewhere/else.png'),
    [`${at}${encodeURIComponent('Tom _ Jerry (USA).png')}`]: png,
    [`${at}${encodeURIComponent('Two Discs (USA).png')}`]: png,
    [`${at}${encodeURIComponent('Many Regions (USA).png')}`]: png,
    [`${at}${encodeURIComponent('First Disc (USA) (Disc 1).png')}`]: png,
  };
  const listing = ['Odd - Game & Friends (USA).png', 'Odd Game and Friends (Europe).png', 'Odd Game and Friends (USA) (Demo).png'];
  shelf[`${at}${encodeURIComponent(listing[0])}`] = png;
  const asked = [];
  const fetch = async to => {
    asked.push(to);
    if (to.includes('Broken')) return { ok: false, status: 503 };
    if (to.endsWith('/git/trees/HEAD:Named_Boxarts')) return { ok: true, status: 200, json: async () => ({ tree: listing.map(path => ({ path })) }) };
    const body = shelf[to];
    return body ? { ok: true, status: 200, arrayBuffer: async () => body.buffer } : { ok: false, status: 404 };
  };
  const cover = (title, names) => scanSave.fetchArt({ system: 'gb', title, match: names ? { names } : null }, fetch);
  check('a cover is found by the game\'s list name', (await cover('plain', ['Plain Game (World)']))?.length === png.length);
  check('a picture that is a link is followed', (await cover('Linked Game (USA)'))?.length === png.length);
  check('a link that leaves the folder is not', (await cover('Odd Link (USA)')) === null);
  check('a name\'s & is asked for as _', (await cover('Tom & Jerry (USA)'))?.length === png.length);
  check('a disc finds its game\'s one cover', (await cover('Two Discs (USA) (Disc 2)'))?.length === png.length);
  check('a game of more regions finds the plain USA cover', (await cover('Many Regions (USA, Canada) (En,Fr)'))?.length === png.length);
  check('a game of several discs finds its first disc\'s cover', (await cover('First Disc (USA, Canada)'))?.length === png.length);
  check('a game of another region does not take the USA cover', (await cover('Many Regions (Japan)')) === null);
  check('a name written another way is found, its own region first and no demo', (await cover('Odd Game, The - Friends (USA)'))?.length === png.length && asked.at(-1).endsWith(encodeURIComponent(listing[0])), asked.at(-1));
  check('a game libretro lacks has none', (await cover('Nobody Has This')) === null);
  const before = asked.length;
  check('a system libretro has no art for is not asked', (await scanSave.fetchArt({ system: 'switch', title: 'Any' }, fetch)) === null && asked.length === before);
  let threw = false;
  try { await cover('Broken Night'); } catch { threw = true; }
  check('a night GitHub fails is an error, not a missing cover', threw);
}

// The covers the server keeps: which differ, and putting them in Supabase.
{
  const held = [
    { path: 'art/gb/Same (World).png', size: 10, saved_at: '2026-11-01T00:00:00.400Z', sha1: 'a'.repeat(40) },
    { path: 'art/gb/Redrawn (World).png', size: 10, saved_at: '2026-11-01T00:00:00Z', sha1: 'b'.repeat(40) },
    { path: 'art/gb/Gone (World).png', size: 10, saved_at: '2026-11-01T00:00:00Z', sha1: 'c'.repeat(40) },
    { path: 'art/gb/Now Own (World).png', size: 10, saved_at: '2026-11-01T00:00:00Z', sha1: 'd'.repeat(40) },
  ];
  const covers = [
    { path: 'art/gb/Same (World).png', size: 10, mtimeMs: Date.parse('2026-11-01T00:00:00.900Z') },
    { path: 'art/gb/Redrawn (World).png', size: 14, mtimeMs: Date.parse('2026-11-05T00:00:00Z') },
    { path: 'art/gb/New (World).png', size: 7, mtimeMs: Date.parse('2026-11-06T00:00:00Z') },
    { path: 'art/gb/Now Own (World).jpg', size: 9, mtimeMs: Date.parse('2026-11-07T00:00:00Z') },
  ];
  const change = scanSave.artChanged(covers, held);
  const puts = change.put.map(f => f.path).sort();
  check('a cover the same to the second is left', !puts.includes('art/gb/Same (World).png'), puts);
  check('a redrawn cover and a new one are put', ['art/gb/New (World).png', 'art/gb/Redrawn (World).png'].every(p => puts.includes(p)), puts);
  check('a cover whose game is gone goes', change.gone.includes('art/gb/Gone (World).png'), change.gone);
  check('rux\'s own picture takes the place of libretro\'s', puts.includes('art/gb/Now Own (World).jpg') && change.gone.includes('art/gb/Now Own (World).png'), change);

  const w = world({ emu_files: held.map(({ path, sha1, size }) => ({ path, sha1, size })) });
  for (const f of held) w.objects.set(f.sha1, 'old');
  const sha = { 'art/gb/Redrawn (World).png': 'e'.repeat(40), 'art/gb/New (World).png': 'f'.repeat(40), 'art/gb/Now Own (World).jpg': '9'.repeat(40) };
  await scanSave.putArt(scanSave.restDb({ url, key: KEY, fetch: w.fetch }), change, {
    sha1Of: async p => sha[p], bytesOf: async p => `bytes of ${p}`, mac: 'home server',
  });
  const rows = w.tables.emu_files.map(f => f.path).sort();
  check('Supabase then holds one row a cover the server keeps', JSON.stringify(rows) === JSON.stringify(covers.map(c => c.path).sort()), rows);
  check('a redrawn cover\'s old bytes go and its new ones arrive', !w.objects.has('b'.repeat(40)) && w.objects.has('e'.repeat(40)), [...w.objects.keys()]);
  check('a gone cover\'s bytes go with it', !w.objects.has('c'.repeat(40)) && !w.objects.has('d'.repeat(40)), [...w.objects.keys()]);
  check('an untouched cover keeps its bytes', w.objects.has('a'.repeat(40)));
  check('each cover put names the server', w.tables.emu_files.filter(f => sha[f.path]).every(f => f.mac === 'home server'), w.tables.emu_files);
}

// A refusal is an error, never a quiet success.
{
  const db = scanSave.restDb({ url, key: 'the-wrong-key', fetch: world({}).fetch });
  let threw = false;
  try { await db.rows('emu_games', 'system'); } catch { threw = true; }
  check('a refused key stops the save', threw);
}

// libretro's facts: a fact a file, read by the game's comment, and the
// PlayStation's one file a game, named, with its description.
{
  const facts = scanSave.readDat(`clrmamepro (\n\tname "Invented"\n)\n\ngame (\n\tcomment "Plain Game (USA)"\n\tgenre "Puzzle"\n\trom ( crc 00000000 )\n)\n`);
  scanSave.readDat(`game (\n\tcomment "Plain Game (USA)"\n\treleaseyear "1991"\n)\ngame (\n\tcomment "Plain Game (USA)"\n\tusers 2\n)\n`, facts);
  scanSave.readDat(`game (\n\tname "Disc Game (USA)"\n\tdescription "A \\"quoted\\" tale."\n\tdeveloper "Some Studio"\n\tusers "1"\n\trom (\n\t\tname "Disc Game (USA).cue"\n\t)\n)\n`, facts);
  const plain = scanSave.factsOf({ system: 'gb', title: 'Plain Game (USA)' }, facts);
  check('a game\'s facts are gathered from each file', plain?.genre === 'Puzzle' && plain.year === '1991' && plain.players === 2, plain);
  const disc = scanSave.factsOf({ system: 'psx', title: 'Disc Game (USA)' }, facts);
  check('a named game keeps its description and not its file\'s name', disc?.description === 'A "quoted" tale.' && disc.developer === 'Some Studio' && disc.players === 1, disc);
  check('a game libretro lacks has no facts', scanSave.factsOf({ system: 'gb', title: 'Nobody Has This' }, facts) === null);
}

console.log(`  ${failed ? 'fail' : 'ok  '}  ${cases - failed} of ${cases} cases`);
process.exit(failed ? 1 : 0);
