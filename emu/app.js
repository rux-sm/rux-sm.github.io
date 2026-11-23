/* ==========================================================================
   app.js — what every Emu page shares
   --------------------------------------------------------------------------
   The systems by name, each one's preferred format, the emulator table and
   whether Supabase holds what each emulator needs, a game's problems and
   status worked out from what the scan read and rux's notes, sizes and
   dates as text, the shared element helpers and the error notice.
   ========================================================================== */
(() => {
  'use strict';

  // Each system folder on the server by its name, in the order the filter lists them.
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

  // A game's pictures on libretro's thumbnails, the addresses to try in turn,
  // by the names scan-save.js gives it, as the scan asks for its box art too:
  // Named_Boxarts its box, Named_Snaps a moment in play, Named_Titles its
  // title screen.
  const { ART, ART_AT, artNames } = window.Emu.scanSave;
  const artOf = (game, kind = 'Named_Boxarts') => {
    const set = ART[game.system];
    return set ? artNames(game).map(n => `${ART_AT}/${encodeURIComponent(set.replaceAll(' ', '_'))}/HEAD/${kind}/${encodeURIComponent(n.replace(/[&*/:`<>?\\|]/g, '_'))}.png`) : [];
  };
  // Each system's box, its width over its height, as its covers measure.
  const BOX = { nes: 0.7, snes: 1.4, n64: 1.37, gb: 1, gbc: 1, gba: 1, nds: 1.115, n3ds: 1.12, gc: 0.705, wii: 0.714, wiiu: 0.714, switch: 0.62, psx: 1, ps2: 0.705, xbox: 0.714 };

  // Each system's emulator, why, how it names a save and what it needs, from
  // emulators.json, which the scan reads too.
  let emulatorsRead = null;
  const emulators = () => (emulatorsRead ??= fetch('emulators.json')
    .then(r => { if (!r.ok) throw new Error(`emulators.json: ${r.status}`); return r.json(); }));

  // Each file a system's emulator needs, and the BIOS file on the server that
  // is it: by name in the system's bios folder, and by MD5 where it is known.
  // A key is found by name only, as the scan never reads one.
  const needsOf = (system, emulator, bios) => (emulator?.needs ?? []).map(need => {
    const here = bios.filter(b => b.name.split('/')[0] === system);
    const base = b => b.name.split('/').pop().toLowerCase();
    // A need names one file, a pattern for its name, or a folder held whole,
    // as a Switch's installed firmware is.
    const named = need.file ? here.find(b => base(b) === need.file.toLowerCase())
      : need.folder ? here.find(b => b.name.startsWith(`${system}/${need.folder}/`))
      : here.find(b => new RegExp(need.pattern, 'i').test(base(b)));
    const bySha1 = need.sha1 ? bios.find(b => b.sha1 === need.sha1) : null;
    const file = bySha1 ?? named ?? null;
    const wrong = Boolean(need.sha1 && named && !bySha1);
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
    for (const n of m?.copies ?? []) out.push(['extra', `Also on the server: ${n}`]);
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

  // What a save is called by its kind.
  const saveKind = s => (s.kind === 'state' ? 'Save state' : s.kind === 'card' ? 'Memory card' : 'Save');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  // A game's name as it is read: without the bracketed tags its list adds,
  // region, languages, revision, its article put back in front and its first
  // dash a colon, "Legend of Zelda, The - A Link to the Past" as "The Legend of
  // Zelda: A Link to the Past".
  const nameOf = g => (g.title.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || g.title)
    .replace(/^(.*?), (The|An|A)(?= - |$)/, '$2 $1').replace(' - ', ': ');
  // A game's art, fetched as it comes near the view: the cover the server
  // keeps, else the first of libretro's that loads, else `none()`.
  const near = new IntersectionObserver(seen => {
    for (const { target, isIntersecting } of seen) {
      if (!isIntersecting) continue;
      near.unobserve(target);
      target.dispatchEvent(new Event('emu-near'));
    }
  }, { rootMargin: '600px' });
  function art(g, none) {
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    const urls = artOf(g);
    const next = () => { const url = urls.shift(); if (url) img.src = url; else { img.remove(); none(); } };
    img.addEventListener('error', next);
    img.addEventListener('emu-near', async () => {
      const data = window.Emu.data;
      const sha1 = (await data?.covers().catch(() => null))?.get(window.Emu.scanSave.artKey(g));
      const own = sha1 ? await data.coverUrl(sha1).catch(error => { console.error(error); return null; }) : null;
      if (own) img.src = own; else next();
    });
    near.observe(img);
    return img;
  }
  // A cover: the game's art, else its name, on a tile of its system's box's
  // shape, so a console's covers are all one shape. Art near that shape fills
  // the tile, its edge trimmed; art of another shape shows whole on it.
  function cover(g, cls) {
    const box = el('div', cls);
    const shape = BOX[g.system] ?? 0.75;
    box.style.setProperty('--emu-box', shape);
    // A game with no box art shows its name where the picture would be,
    // leaving anything laid over the picture, such as a download's veil.
    const name = () => {
      const title = el('span', 'emu-cover-title', nameOf(g));
      box.prepend(title);
    };
    const img = art(g, name);
    img.addEventListener('load', () => { img.classList.toggle('emu-cover-whole', Math.abs(img.naturalWidth / img.naturalHeight / shape - 1) > 0.15); });
    box.append(img);
    return box;
  }
  // A game's screenshot: a moment in play, else its title screen, else none,
  // the picture taken away.
  function shot(g) {
    const img = el('img');
    img.alt = '';
    img.decoding = 'async';
    const urls = [...artOf(g, 'Named_Snaps'), ...artOf(g, 'Named_Titles')];
    const next = () => { const url = urls.shift(); if (url) img.src = url; else img.remove(); };
    img.addEventListener('error', next);
    next();
    return img;
  }
  const tag = ([label, cls], small) => { const t = el('span', `rux--tag ${small ? 'rux--tag--sm ' : ''}${cls}`); t.append(el('span', 'rux--tag__label', label)); return t; };
  // A name as lowercase letters and digits: how an installer is matched to its app, and an emulator's profile is addressed.
  const slug = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  // An emulator's versions. `installerOf` is its installer among the files
  // Supabase holds, by its name, and `keptVersion` the version in that file's name, before its
  // `-macOS`: numbers, or a build's seven letters. `plainVersion` is a
  // version as the installer names it, `v2.6.3` and `0.1-12640-gbb4e9ac5e`
  // without the v and the commit. `newerOut` is each emulator whose project
  // has out another version than Supabase keeps; a rolling build is left
  // out, being always a few commits on.
  const plainVersion = v => String(v).replace(/^v/, '').replace(/-g[0-9a-f]+$/, '');
  // An installer is its app's when its file name starts with the app's name,
  // so xemu's is not Rux-Emu-Helper's, whose name holds "xemu" inside it.
  const { installs } = window.Emu.scanSave;
  const installerOf = (files, name) => (files ?? []).filter(f => f.path.startsWith('emulators/'))
    .map(f => ({ name: f.path.slice('emulators/'.length), size: f.size, sha1: f.sha1 })).find(i => installs(i.name, name)) ?? null;
  const keptVersion = installer => installer?.name.match(/-(\d[\w.]*(?:-\d+)?|[0-9a-f]{7})-mac/i)?.[1] ?? null;
  const newerOut = (emulators, drive, files) => Object.entries(drive?.newest ?? {}).map(([name, v]) => {
    const rule = emulators.macSaves[name] ?? (emulators.frontend.name === name ? emulators.frontend : null);
    const kept = keptVersion(installerOf(files, name));
    return rule?.feed && !rule.feed.rolling && kept && plainVersion(v) !== kept ? { name, kept, newest: plainVersion(v) } : null;
  }).filter(Boolean);
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
    SYSTEMS, systemName, PREFERRED, BOX, nameOf, cover, shot, saveKind, emulators, needsOf, problemsOf, STATUS, statusOf, withNotes,
    size, date, when, el, tag, option, slug, plainVersion, installs, installerOf, keptVersion, newerOut, fold, folds, notice,
  });
})();
