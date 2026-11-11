/* ==========================================================================
   collection.js — the Collection page
   --------------------------------------------------------------------------
   Every game the last scan found, by system then title, with search and a
   filter per system and per status. A wide screen shows a table; a phone
   shows the same games as a list. A game opens in the side panel with
   everything the scan read about it, its saves, and rux's marks and note,
   which are saved from there.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag, option } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  let saves = [];

  function shown() {
    const q = $('emu-search').value.trim().toLowerCase();
    const sys = $('emu-filter-system').value, status = $('emu-filter-status').value;
    return games.filter(g => (!q || g.title.toLowerCase().includes(q))
      && (!sys || g.system === sys) && (!status || g.status === status));
  }

  function render() {
    const list = shown();
    const bytes = list.reduce((a, g) => a + Number(g.size), 0);
    $('emu-sum').textContent = `${list.length} ${list.length === 1 ? 'game' : 'games'}, ${R.size(bytes)}`;
    $('emu-none').hidden = list.length > 0;
    const rows = $('emu-rows'), items = $('emu-items');
    rows.replaceChildren();
    items.replaceChildren();
    for (const g of list) {
      const tr = el('tr', 'emu-game');
      tr.tabIndex = 0;
      tr.append(el('td', '', g.title), el('td', '', R.systemName(g.system)), el('td', '', g.region ?? ''),
        el('td', '', g.formats.join(' + ').toUpperCase()), el('td', 'emu-size', R.size(g.size)));
      const td = el('td');
      td.append(tag(R.STATUS[g.status], true));
      tr.append(td);
      tr.addEventListener('click', () => openGame(g));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') openGame(g); });
      rows.append(tr);

      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content emu-row');
      b.type = 'button';
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', g.title), el('span', 'emu-row__sub', `${R.systemName(g.system)} · ${R.size(g.size)}`));
      b.append(main, tag(R.STATUS[g.status], true));
      b.addEventListener('click', () => openGame(g));
      li.append(b);
      items.append(li);
    }
  }

  // The side panel: what the game is, its problems, then each file.
  function openGame(g) {
    $('emu-panel-label').textContent = R.systemName(g.system);
    $('emu-panel-title').textContent = g.title;
    const body = $('emu-panel-body');
    body.replaceChildren();
    const facts = (pairs) => {
      const dl = el('dl', 'emu-facts');
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
      ['On the list as', g.match?.names?.join(', ')], ['Found by', g.match?.by?.join(', ')],
    ]));
    const own = saves.filter(s => s.system === g.system && s.game === g.title);
    if (own.length) {
      body.append(el('h3', 'rux--type-heading-02', 'Saves'), facts(own.map(s =>
        [s.kind === 'state' ? 'Save state' : s.kind === 'card' ? 'Memory card' : 'Save', `Last saved ${R.date(s.saved_at)}${s.note ? ` · ${s.note}` : ''}`])));
      const a = el('a', 'rux--link', 'Open in Saves');
      a.href = `saves.html?q=${encodeURIComponent(g.title)}`;
      body.append(a);
    }
    body.append(notesForm(g));
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
          ['CRC32', f.crc32, 'emu-hash'], ['MD5', f.md5, 'emu-hash'], ['SHA-1', f.sha1, 'emu-hash'],
        ]));
      }
    }
    $('emu-panel').hidden = false;
    $('emu-panel').classList.add('rux--side-panel--open');
    $('emu-panel-close').focus();
  }
  // rux's marks and note on the game, saved on Save. `plays` is asked only of
  // a converted game whose originals wait in to-delete.
  function notesForm(g) {
    const n = g.notes ?? {};
    const form = el('form', 'rux--stack-vertical rux--stack-scale-5');
    form.append(el('h3', 'rux--type-heading-02', 'Your notes'));
    const fieldset = el('fieldset', 'rux--fieldset');
    const legend = el('legend', 'rux--label', 'Marks');
    fieldset.append(legend);
    const marks = [['played', 'Played'], ['finished', 'Finished'], ['favourite', 'Favourite']];
    if (g.originals?.length) marks.push(['plays', 'The new file plays, so its originals can go']);
    for (const [k, label] of marks) {
      const wrap = el('div', 'rux--form-item rux--checkbox-wrapper');
      const box = el('input', 'rux--checkbox');
      box.type = 'checkbox';
      box.id = `emu-note-${k}`;
      box.name = k;
      box.checked = Boolean(n[k]);
      const lab = el('label', 'rux--checkbox-label');
      lab.htmlFor = box.id;
      lab.append(el('div', 'rux--checkbox-label-text', label));
      wrap.append(box, lab);
      fieldset.append(wrap);
    }
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', 'Note');
    lab.htmlFor = 'emu-note-text';
    lw.append(lab);
    const tw = el('div', 'rux--text-area__wrapper');
    const area = el('textarea', 'rux--text-area');
    area.id = 'emu-note-text';
    area.rows = 3;
    area.value = n.note ?? '';
    tw.append(area);
    item.append(lw, tw);
    const actions = el('div', 'emu-actions');
    const button = el('button', 'rux--btn rux--btn--primary', 'Save notes');
    button.type = 'submit';
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    actions.append(button);
    form.append(fieldset, item, actions, said);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      button.disabled = true;
      const row = { system: g.system, title: g.title, note: area.value.trim() || null };
      for (const [k] of [['played'], ['finished'], ['favourite'], ['plays']]) row[k] = Boolean(form.elements[k]?.checked ?? n[k]);
      try {
        await R.data.saveNotes(row);
        g.notes = row;
        g.status = R.statusOf(g);
        said.textContent = 'Saved.';
        render();
      } catch (error) {
        console.error(error);
        said.textContent = 'That did not save. Try again.';
      }
      button.disabled = false;
    });
    return form;
  }

  const closePanel = () => {
    $('emu-panel').classList.remove('rux--side-panel--open');
    $('emu-panel').hidden = true;
  };
  $('emu-panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('emu-panel').hidden) closePanel(); });

  async function load() {
    try {
      const [rows, notes, savesRead] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves()]);
      saves = savesRead;
      games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }));
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    $('emu-empty').hidden = games.length > 0;
    $('emu-list').hidden = games.length === 0;
    const systems = [...new Set(games.map(g => g.system))]
      .sort((a, b) => Object.keys(R.SYSTEMS).indexOf(a) - Object.keys(R.SYSTEMS).indexOf(b));
    for (const s of systems) $('emu-filter-system').append(option(s, R.systemName(s)));
    for (const [key, [label]] of Object.entries(R.STATUS)) {
      const n = games.filter(g => g.status === key).length;
      if (n) $('emu-filter-status').append(option(key, `${label} (${n})`));
    }
    // A link from Problems names its game as ?q=, which fills the search.
    const q = new URLSearchParams(location.search).get('q');
    if (q) $('emu-search').value = q;
    render();
    if (q) { const only = shown(); if (only.length === 1) openGame(only[0]); }
  }

  for (const id of ['emu-search', 'emu-filter-system', 'emu-filter-status']) {
    $(id).addEventListener(id === 'emu-search' ? 'input' : 'change', render);
  }
  load();
})();
