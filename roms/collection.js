/* ==========================================================================
   collection.js — the Collection page
   --------------------------------------------------------------------------
   Every game the last scan found, by system then title, with search and a
   filter per system and per status. A wide screen shows a table; a phone
   shows the same games as a list. A game opens in the side panel with
   everything the scan read about it.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el, tag, option } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the collection.'); return; }

  let games = [];

  function shown() {
    const q = $('roms-search').value.trim().toLowerCase();
    const sys = $('roms-filter-system').value, status = $('roms-filter-status').value;
    return games.filter(g => (!q || g.title.toLowerCase().includes(q))
      && (!sys || g.system === sys) && (!status || g.status === status));
  }

  function render() {
    const list = shown();
    const bytes = list.reduce((a, g) => a + Number(g.size), 0);
    $('roms-sum').textContent = `${list.length} ${list.length === 1 ? 'game' : 'games'}, ${R.size(bytes)}`;
    $('roms-none').hidden = list.length > 0;
    const rows = $('roms-rows'), items = $('roms-items');
    rows.replaceChildren();
    items.replaceChildren();
    for (const g of list) {
      const tr = el('tr', 'roms-game');
      tr.tabIndex = 0;
      tr.append(el('td', '', g.title), el('td', '', R.systemName(g.system)), el('td', '', g.region ?? ''),
        el('td', '', g.formats.join(' + ').toUpperCase()), el('td', 'roms-size', R.size(g.size)));
      const td = el('td');
      td.append(tag(R.STATUS[g.status], true));
      tr.append(td);
      tr.addEventListener('click', () => openGame(g));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') openGame(g); });
      rows.append(tr);

      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content roms-row');
      b.type = 'button';
      const main = el('span', 'roms-row__main');
      main.append(el('span', '', g.title), el('span', 'roms-row__sub', `${R.systemName(g.system)} · ${R.size(g.size)}`));
      b.append(main, tag(R.STATUS[g.status], true));
      b.addEventListener('click', () => openGame(g));
      li.append(b);
      items.append(li);
    }
  }

  // The side panel: what the game is, its problems, then each file.
  function openGame(g) {
    $('roms-panel-label').textContent = R.systemName(g.system);
    $('roms-panel-title').textContent = g.title;
    const body = $('roms-panel-body');
    body.replaceChildren();
    const facts = (pairs) => {
      const dl = el('dl', 'roms-facts');
      for (const [k, v, cls] of pairs) {
        if (v == null || v === '') continue;
        const wrap = el('div');
        wrap.append(el('dt', '', k), el('dd', cls ?? '', String(v)));
        dl.append(wrap);
      }
      return dl;
    };
    const problems = R.problemsOf(g);
    const status = el('div');
    status.append(tag(R.STATUS[g.status]));
    body.append(status);
    if (problems.length) {
      const ul = el('ul', 'rux--list--unordered');
      for (const [, words] of problems) ul.append(el('li', 'rux--list__item', words));
      body.append(ul);
    }
    body.append(facts([
      ['Region', g.region], ['Languages', g.languages], ['Revision', g.revision],
      ['Format', g.formats.join(' + ').toUpperCase()], ['Size', R.size(g.size)],
      ['Title ID', g.title_id], ['Version', g.title_id ? g.version : null],
      ['Save', g.has_save ? 'Yes' : null],
    ]));
    for (const x of g.extras ?? []) {
      body.append(el('h3', 'rux--type-heading-02', x.kind === 'update' ? 'Update' : 'Add-on'),
        facts([['File', x.file?.name], ['Version', x.version], ['Size', x.file ? R.size(x.file.size) : null]]));
    }
    const files = g.files ?? [];
    if (g.folder) {
      body.append(el('h3', 'rux--type-heading-02', 'Folder'), facts([['Files', files.length]]));
    } else {
      for (const f of files) {
        const h = f.header ?? {};
        body.append(el('h3', 'rux--type-heading-02', f.name.split('/').pop()), facts([
          ['Size', R.size(f.size)],
          ['Internal title', h.internalTitle], ['Game code', h.gameCode], ['Product code', h.productCode],
          ['Disc ID', h.discId], ['Disc', h.discNumber], ['Serial', h.serial],
          ['Version byte', h.version ?? h.revision], ['Header', h.header], ['Layout', h.layout],
          ['Boot chip', h.cic && `CIC-${h.cic}`], ['Header checksum', h.headerChecksum],
          ['Tracks', h.tracks], ['CHD', h.chdVersion && `v${h.chdVersion}`],
          ['Encrypted', h.encrypted == null ? null : h.encrypted ? 'Yes' : 'No'],
          ['CRC32', f.crc32, 'roms-hash'], ['MD5', f.md5, 'roms-hash'], ['SHA-1', f.sha1, 'roms-hash'],
        ]));
      }
    }
    $('roms-panel').hidden = false;
    $('roms-panel-close').focus();
  }
  const closePanel = () => { $('roms-panel').hidden = true; };
  $('roms-panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('roms-panel').hidden) closePanel(); });

  async function load() {
    try {
      games = (await R.data.games()).map(g => ({ ...g, status: R.statusOf(g) }));
    } catch (error) {
      console.error(error);
      R.notice('Roms could not read the collection. Try again.');
      return;
    }
    $('roms-empty').hidden = games.length > 0;
    $('roms-list').hidden = games.length === 0;
    const systems = [...new Set(games.map(g => g.system))]
      .sort((a, b) => Object.keys(R.SYSTEMS).indexOf(a) - Object.keys(R.SYSTEMS).indexOf(b));
    for (const s of systems) $('roms-filter-system').append(option(s, R.systemName(s)));
    for (const [key, [label]] of Object.entries(R.STATUS)) {
      const n = games.filter(g => g.status === key).length;
      if (n) $('roms-filter-status').append(option(key, `${label} (${n})`));
    }
    render();
  }

  for (const id of ['roms-search', 'roms-filter-system', 'roms-filter-status']) {
    $(id).addEventListener(id === 'roms-search' ? 'input' : 'change', render);
  }
  load();
})();
