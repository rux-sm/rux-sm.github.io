/* ==========================================================================
   app.js — what every Emu page shares
   --------------------------------------------------------------------------
   The systems by name, each one's preferred format, the emulator table and
   whether the drive holds what each emulator needs, a game's problems and
   status worked out from what the scan read and rux's notes, sizes and
   dates as text, the shared element helpers and the error notice.
   ========================================================================== */
(() => {
  'use strict';

  // Each folder on the drive by its name, in the order the filter lists them.
  const SYSTEMS = {
    nes: 'NES', snes: 'SNES', n64: 'N64', gc: 'GameCube', wii: 'Wii', wiiu: 'Wii U', switch: 'Switch',
    gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance', nds: 'DS', n3ds: '3DS',
    psx: 'PlayStation', ps2: 'PlayStation 2', xbox: 'Xbox',
  };
  const systemName = s => SYSTEMS[s] ?? s;

  // The format each system's emulator reads best; docs/plans/emu-app.md
  // says why. `m3u` is the playlist beside a game on more than one disc.
  const PREFERRED = {
    nes: ['nes'], snes: ['sfc'], n64: ['z64'], gb: ['gb'], gbc: ['gbc'], gba: ['gba'], nds: ['nds'],
    psx: ['chd', 'm3u'], ps2: ['chd'], gc: ['rvz'], wii: ['rvz'], n3ds: ['3ds'], wiiu: ['wua'],
    switch: ['xci', 'nsp'], xbox: ['iso'],
  };

  // Box art, from libretro's thumbnails, which name each picture after the
  // game's name on No-Intro's or Redump's list with &*/:`<>?\\| as _. A
  // game's candidates are its list names, then its title, then its title
  // less the disc, so a multi-disc game finds one cover. Switch has none.
  const ART = {
    nes: 'Nintendo - Nintendo Entertainment System', snes: 'Nintendo - Super Nintendo Entertainment System',
    n64: 'Nintendo - Nintendo 64', gb: 'Nintendo - Game Boy', gbc: 'Nintendo - Game Boy Color',
    gba: 'Nintendo - Game Boy Advance', nds: 'Nintendo - Nintendo DS', n3ds: 'Nintendo - Nintendo 3DS',
    gc: 'Nintendo - GameCube', wii: 'Nintendo - Wii', wiiu: 'Nintendo - Wii U',
    psx: 'Sony - PlayStation', ps2: 'Sony - PlayStation 2', xbox: 'Microsoft - Xbox',
  };
  const artOf = game => {
    const set = ART[game.system];
    if (!set) return [];
    const names = [...(game.match?.names ?? []), game.title, game.title.replace(/ \(Disc \d+\)/, '')];
    return [...new Set(names)].map(n => `https://thumbnails.libretro.com/${encodeURIComponent(set)}/Named_Boxarts/${encodeURIComponent(n.replace(/[&*/:`<>?\\|]/g, '_'))}.png`);
  };

  // A system's console, for its tile on the Library: rux's own pixel art in
  // brand/systems/<system>.png once a system is listed in DRAWN, else the
  // picture of the console in libretro's RetroArch assets, Systematic set,
  // which is CC BY 4.0 and credited where it shows.
  // The Wii, Wii U and Switch take a model's picture, which reads more
  // plainly at a tile's size than the set's own.
  const DRAWN = new Set([]);
  const CONSOLE_ART = 'https://raw.githubusercontent.com/libretro/retroarch-assets/master/xmb/systematic/png/';
  const CONSOLES = {
    ...ART, wii: 'Nintendo - Wii RVL-001 WT', wiiu: 'Nintendo - Wii U WUP-001 W', switch: 'Nintendo - Switch HAC-001',
  };
  const consoleOf = system => (DRAWN.has(system) ? { url: `brand/systems/${system}.png`, own: true }
    : { url: `${CONSOLE_ART}${encodeURIComponent(CONSOLES[system])}.png`, own: false });

  // Each system's emulator, why, how it names a save and what it needs, from
  // emulators.json, which the scan reads too.
  let emulatorsRead = null;
  const emulators = () => (emulatorsRead ??= fetch('emulators.json')
    .then(r => { if (!r.ok) throw new Error(`emulators.json: ${r.status}`); return r.json(); }));

  // Each file a system's emulator needs, and the BIOS file on the drive that
  // is it: by name in the system's bios folder, and by MD5 where it is known.
  // A key is found by name only, as the scan never reads one.
  const needsOf = (system, emulator, bios) => (emulator?.needs ?? []).map(need => {
    const here = bios.filter(b => b.name.split('/')[0] === system);
    const base = b => b.name.split('/').pop().toLowerCase();
    const named = need.file
      ? here.find(b => base(b) === need.file.toLowerCase())
      : here.find(b => new RegExp(need.pattern, 'i').test(base(b)));
    const byMd5 = need.md5 ? bios.find(b => b.md5 === need.md5) : null;
    const file = byMd5 ?? named ?? null;
    const wrong = Boolean(need.md5 && named && !byMd5);
    return { ...need, label: need.label ?? need.file, file, ok: Boolean(file) && !wrong, wrong };
  });

  // Every problem a game has, from its files' headers, as [kind, words].
  const problemsOf = game => {
    const out = [];
    const files = game.files ?? [];
    const headers = files.map(f => f.header ?? {});
    const preferred = PREFERRED[game.system];
    if (game.folder) out.push(['format', `A folder, not ${preferred ? preferred[0].toUpperCase() : 'a file'}`]);
    else if (preferred && !game.formats.every(f => preferred.includes(f))) {
      out.push(['format', `${game.formats.join(' + ').toUpperCase()}, not ${preferred[0].toUpperCase()}`]);
    }
    const missing = headers.flatMap(h => h.missingTracks ?? []);
    if (missing.length) out.push(['incomplete', `Missing ${missing.join(', ')}`]);
    const m = game.match;
    for (const d of m?.missingDiscs ?? []) out.push(['incomplete', `Missing ${d}`]);
    if (m && !m.listed) out.push(['unlisted', m.unmatched.length === files.filter(f => !['cue', 'm3u'].includes(f.ext)).length
      ? 'Not on the list: a bad, changed or unknown copy'
      : `Not on the list: ${m.unmatched.map(n => n.split('/').pop()).join(', ')}`]);
    if (headers.some(h => h.headerChecksum === 'bad')) out.push(['header', 'Header checksum does not add up']);
    if (headers.some(h => h.copierHeader)) out.push(['header', 'Copier header']);
    if (headers.some(h => h.byteOrder && h.byteOrder !== 'z64')) out.push(['header', 'Byte order is not z64']);
    if (headers.some(h => h.encrypted)) out.push(['encrypted', 'Encrypted']);
    if (headers.some(h => h.readError)) out.push(['header', 'Could not be read']);
    for (const r of m?.renames ?? []) out.push(['rename', `List name: ${r.to.split('/').pop()}`]);
    for (const n of m?.better ?? []) out.push(['newer', `Newer: ${n}`]);
    for (const n of m?.copies ?? []) out.push(['extra', `Also on the drive: ${n}`]);
    // A converted game's originals wait until rux says the new file plays.
    const originals = game.originals ?? [];
    if (originals.length && !game.notes?.plays) {
      out.push(['waiting', `${originals.length} ${originals.length === 1 ? 'original' : 'originals'} in to-delete, ${size(originals.reduce((a, f) => a + f.size, 0))}`]);
    }
    // Worst first, so the first problem is the game's status.
    return out.sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  };

  // The one status a game shows: its worst problem, or Good, in this order.
  // `bios` and `orphan` belong to no game: Problems lists them under these
  // headings, and no game's status is either.
  const STATUS = {
    incomplete: ['Incomplete', 'rux--tag--red'],
    bios: ['Missing BIOS', 'rux--tag--red'],
    unlisted: ['Not on the list', 'rux--tag--red'],
    header: ['Bad header', 'rux--tag--red'],
    encrypted: ['Encrypted', 'rux--tag--magenta'],
    format: ['Convert', 'rux--tag--blue'],
    rename: ['Rename', 'rux--tag--blue'],
    newer: ['Newer version', 'rux--tag--teal'],
    extra: ['Extra copy', 'rux--tag--purple'],
    orphan: ['Save with no game', 'rux--tag--warm-gray'],
    waiting: ['Original waiting', 'rux--tag--cool-gray'],
    good: ['Good', 'rux--tag--green'],
  };
  const ORDER = Object.keys(STATUS);
  const statusOf = game => problemsOf(game)[0]?.[0] ?? 'good';

  const size = bytes => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = Number(bytes) || 0, i = 0;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
  };

  const date = iso => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  const when = iso => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

  // rux's notes on each game, by its system and title, laid on the games.
  const withNotes = (games, notes) => {
    const by = new Map(notes.map(n => [`${n.system}/${n.title}`, n]));
    return games.map(g => ({ ...g, notes: by.get(`${g.system}/${g.title}`) ?? null }));
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tag = ([label, cls], small) => { const t = el('span', `rux--tag ${small ? 'rux--tag--sm ' : ''}${cls}`); t.append(el('span', 'rux--tag__label', label)); return t; };
  // A name as lowercase letters and digits: how an installer is matched to its app, and an emulator's profile is addressed.
  const slug = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const option = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };

  // Folds of Design's accordion, whose script opens and shuts them: `fold` is
  // one, a heading over the nodes it holds, and `folds` the list around them.
  // The body takes `id`, which the heading names as what it controls.
  const fold = (title, content, { id, open = false } = {}) => {
    const item = el('li', `rux--accordion__item${open ? ' rux--accordion__item--active' : ''}`);
    const heading = el('button', 'rux--accordion__heading');
    heading.type = 'button';
    heading.setAttribute('aria-expanded', String(open));
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'rux--accordion__arrow');
    arrow.setAttribute('width', '16');
    arrow.setAttribute('height', '16');
    arrow.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-chevron--right');
    arrow.append(use);
    const name = el('div', 'rux--accordion__title emu-row');
    name.append(...title);
    heading.append(arrow, name);
    const wrapper = el('div', 'rux--accordion__wrapper');
    const body = el('div', 'rux--accordion__content rux--stack-vertical rux--stack-scale-6');
    body.id = id;
    heading.setAttribute('aria-controls', id);
    body.append(...content);
    wrapper.append(body);
    item.append(heading, wrapper);
    return item;
  };
  const folds = items => { const ul = el('ul', 'rux--accordion rux--accordion--end rux--layout--size-lg'); ul.append(...items); return ul; };

  const notice = (text = '') => {
    const box = document.getElementById('emu-error');
    if (!box) return;
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = !text;
  };

  window.Emu = Object.assign(window.Emu || {}, {
    SYSTEMS, systemName, PREFERRED, artOf, consoleOf, emulators, needsOf, problemsOf, STATUS, statusOf, withNotes,
    size, date, when, el, tag, option, slug, fold, folds, notice,
  });
})();
