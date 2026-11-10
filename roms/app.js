/* ==========================================================================
   app.js — what every Roms page shares
   --------------------------------------------------------------------------
   The systems by name, each one's preferred format, a game's problems and
   status worked out from what the scan read, sizes as text, the shared
   element helpers and the error notice.
   ========================================================================== */
(() => {
  'use strict';

  // Each folder on the drive by its name, in the order the filter lists them.
  const SYSTEMS = {
    nes: 'NES', snes: 'SNES', n64: 'N64', gc: 'GameCube', wii: 'Wii', wiiu: 'Wii U', switch: 'Switch',
    gb: 'Game Boy', gbc: 'Game Boy Color', gba: 'Game Boy Advance', nds: 'DS', n3ds: '3DS',
    psx: 'PlayStation', ps2: 'PlayStation 2',
  };
  const systemName = s => SYSTEMS[s] ?? s;

  // The format each system's emulator reads best; docs/plans/roms-app.md
  // says why. `m3u` is the playlist beside a game on more than one disc.
  const PREFERRED = {
    nes: ['nes'], snes: ['sfc'], n64: ['z64'], gb: ['gb'], gbc: ['gbc'], gba: ['gba'], nds: ['nds'],
    psx: ['chd', 'm3u'], ps2: ['chd'], gc: ['rvz'], wii: ['rvz'], n3ds: ['3ds'], wiiu: ['wua'],
    switch: ['xci', 'nsp'],
  };

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
    if (headers.some(h => h.headerChecksum === 'bad')) out.push(['header', 'Header checksum does not add up']);
    if (headers.some(h => h.copierHeader)) out.push(['header', 'Copier header']);
    if (headers.some(h => h.byteOrder && h.byteOrder !== 'z64')) out.push(['header', 'Byte order is not z64']);
    if (headers.some(h => h.encrypted)) out.push(['encrypted', 'Encrypted']);
    if (headers.some(h => h.readError)) out.push(['header', 'Could not be read']);
    return out;
  };

  // The one status a game shows: its worst problem, or Good.
  const STATUS = {
    incomplete: ['Incomplete', 'rux--tag--red'],
    header: ['Bad header', 'rux--tag--red'],
    encrypted: ['Encrypted', 'rux--tag--magenta'],
    format: ['Convert', 'rux--tag--blue'],
    good: ['Good', 'rux--tag--green'],
  };
  const statusOf = game => problemsOf(game)[0]?.[0] ?? 'good';

  const size = bytes => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let n = Number(bytes) || 0, i = 0;
    while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
    return `${n >= 100 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tag = ([label, cls], small) => { const t = el('span', `rux--tag ${small ? 'rux--tag--sm ' : ''}${cls}`); t.append(el('span', 'rux--tag__label', label)); return t; };
  const option = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };

  const notice = (text = '') => {
    const box = document.getElementById('roms-error');
    if (!box) return;
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = !text;
  };

  window.Roms = Object.assign(window.Roms || {}, {
    SYSTEMS, systemName, PREFERRED, problemsOf, STATUS, statusOf, size, el, tag, option, notice,
  });
})();
