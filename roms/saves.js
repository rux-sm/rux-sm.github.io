/* ==========================================================================
   saves.js — the Saves page
   --------------------------------------------------------------------------
   Where each of the three copies stands: the drive, Supabase and each Mac,
   with every backup in Supabase to download. Then every save the last scan
   found, under one heading per system, each opening in the side panel with
   its files, dates and rux's note, which is saved from there.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the saves.'); return; }

  const KIND = { save: 'Save', state: 'Save state', card: 'Memory card' };
  let saves = [];

  function tile(label, value, sub) {
    const col = el('div', 'rux--css-grid-column rux--sm:col-span-2 rux--md:col-span-4 rux--lg:col-span-4');
    const t = el('div', 'rux--tile');
    t.append(el('p', '', label), el('p', 'rux--type-heading-03', value));
    if (sub) t.append(el('p', 'roms-row__sub', sub));
    col.append(t);
    return col;
  }

  function copies(drive, backups) {
    const out = $('roms-copies');
    out.replaceChildren();
    out.append(tile('Drive', drive?.scanned_at ? R.date(drive.scanned_at) : 'Not scanned',
      drive?.backup ? `${drive.backup.file}, ${R.size(drive.backup.size)}` : 'The last scan packed no backup'));
    out.append(tile('Supabase', backups[0] ? R.date(backups[0].created_at) : 'None yet',
      backups[0] ? `${backups.length} kept` : 'Import the scan with its zip'));
    // Each Mac's newest copy, from the drive's backups.json.
    const macs = new Map();
    for (const b of drive?.backups ?? []) if (!macs.has(b.host) || macs.get(b.host).at < b.at) macs.set(b.host, b);
    if (!macs.size) out.append(tile('Each Mac', 'None yet', 'Run roms/tools/backup-saves.mjs'));
    for (const [host, b] of macs) out.append(tile(host, R.date(b.at), b.folder));

    const ul = $('roms-backup-list');
    ul.replaceChildren();
    for (const b of backups) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const button = el('button', 'rux--contained-list-item__content roms-row');
      button.type = 'button';
      const main = el('span', 'roms-row__main');
      main.append(el('span', '', b.name), el('span', 'roms-row__sub', `${R.when(b.created_at)} · ${R.size(b.metadata?.size)} · Download`));
      button.append(main);
      button.addEventListener('click', async () => {
        try { location.href = await R.data.backupLink(b.name); }
        catch (error) { console.error(error); R.notice('That backup could not be downloaded. Try again.'); }
      });
      li.append(button);
      ul.append(li);
    }
    if (!backups.length) ul.append(el('li', 'rux--contained-list-item', 'No backup in Supabase yet.'));
    $('roms-backups-wrap').hidden = false;
  }

  function render() {
    const q = $('roms-search').value.trim().toLowerCase();
    const list = saves.filter(s => !q || s.name.toLowerCase().includes(q) || (s.note ?? '').toLowerCase().includes(q));
    $('roms-sum').textContent = `${list.length} ${list.length === 1 ? 'save' : 'saves'}, ${R.size(list.reduce((a, s) => a + Number(s.size), 0))}`;
    const out = $('roms-groups');
    out.replaceChildren();
    const order = Object.keys(R.SYSTEMS);
    const systems = [...new Set(list.map(s => s.system))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const system of systems) {
      const rows = list.filter(s => s.system === system);
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h2', 'rux--contained-list__label', `${R.systemName(system)} (${rows.length})`));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      for (const s of rows) {
        const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
        const b = el('button', 'rux--contained-list-item__content roms-row');
        b.type = 'button';
        const main = el('span', 'roms-row__main');
        main.append(el('span', '', s.name), el('span', 'roms-row__sub',
          [KIND[s.kind], `last saved ${R.date(s.saved_at)}`, s.game ? '' : 'no game on the drive', s.note].filter(Boolean).join(' · ')));
        b.append(main);
        b.addEventListener('click', () => openSave(s));
        li.append(b);
        ul.append(li);
      }
      box.append(head, ul);
      out.append(box);
    }
  }

  function openSave(s) {
    $('roms-panel-label').textContent = `${R.systemName(s.system)} · ${KIND[s.kind]}`;
    $('roms-panel-title').textContent = s.name;
    const body = $('roms-panel-body');
    body.replaceChildren();
    const dl = el('dl', 'roms-facts');
    for (const [k, v] of [['Game', s.game ?? 'None on the drive by this name'], ['Created', R.when(s.created_at)],
      ['Last saved', R.when(s.saved_at)], ['Size', R.size(s.size)], ['Files', (s.files ?? []).map(f => f.name).join('\n')]]) {
      const wrap = el('div');
      wrap.append(el('dt', '', k), el('dd', k === 'Files' ? 'roms-files' : '', v));
      dl.append(wrap);
    }
    const form = el('form', 'rux--stack-vertical rux--stack-scale-5');
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', 'Note');
    lab.htmlFor = 'roms-save-note';
    lw.append(lab);
    const tw = el('div', 'rux--text-area__wrapper');
    const area = el('textarea', 'rux--text-area');
    area.id = 'roms-save-note';
    area.rows = 3;
    area.placeholder = 'Where this save is in the game';
    area.value = s.note ?? '';
    tw.append(area);
    item.append(lw, tw);
    const actions = el('div', 'roms-actions');
    const button = el('button', 'rux--btn rux--btn--primary', 'Save note');
    button.type = 'submit';
    actions.append(button);
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    form.append(item, actions, said);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      button.disabled = true;
      const note = area.value.trim() || null;
      try {
        await R.data.saveSaveNote(s, note);
        s.note = note;
        said.textContent = 'Saved.';
        render();
      } catch (error) {
        console.error(error);
        said.textContent = 'That did not save. Try again.';
      }
      button.disabled = false;
    });
    body.append(dl, form);
    $('roms-panel').hidden = false;
    $('roms-panel').classList.add('rux--side-panel--open');
    $('roms-panel-close').focus();
  }
  const closePanel = () => {
    $('roms-panel').classList.remove('rux--side-panel--open');
    $('roms-panel').hidden = true;
  };
  $('roms-panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('roms-panel').hidden) closePanel(); });

  async function load() {
    let drive, backups;
    try { [saves, drive, backups] = await Promise.all([R.data.saves(), R.data.drive(), R.data.backups()]); }
    catch (error) { console.error(error); R.notice('Roms could not read the saves. Try again.'); return; }
    $('roms-empty').hidden = Boolean(drive);
    if (!drive) return;
    copies(drive, backups);
    const unsorted = drive.unsorted_saves ?? [];
    if (unsorted.length) {
      const folders = [...new Set(unsorted.map(f => f.split('/')[0]))];
      $('roms-unsorted').textContent = `${unsorted.length} files in ${folders.join(', ')} match no game: they sit in a folder not named for a system, from before each system had its own. Move them as roms/docs/emulator-setup.md says.`;
      $('roms-unsorted').hidden = false;
    }
    $('roms-list').hidden = false;
    const q = new URLSearchParams(location.search).get('q');
    if (q) $('roms-search').value = q;
    render();
    if (q) { const only = saves.filter(s => s.name === q); if (only.length === 1) openSave(only[0]); }
  }
  $('roms-search').addEventListener('input', render);
  load();
})();
