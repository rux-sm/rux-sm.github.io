/* ==========================================================================
   saves.js — the Saves page
   --------------------------------------------------------------------------
   Where each of the three copies stands: the drive, Supabase and each Mac,
   with every backup in Supabase to download; Update on the Status page
   saves them.
   Then every save, the drive's, each Mac's and the ones Emu carries, which
   Supabase holds, under one heading per system, each opening in the side
   panel with its files, dates, where it lives and how to restore it. A
   drive's or a Mac's save has rux's note, which is saved from there. A
   carried save is read from the files Supabase lists and matched to its
   game by the rules the scan uses.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the saves.'); return; }

  const KIND = { save: 'Save', state: 'Save state', card: 'Memory card' };
  const DRIVE = 'drive';
  const SUPABASE = 'Supabase';
  const where = s => (s.location === DRIVE ? 'the drive' : s.location);

  // The saves Emu carries, from the files Supabase lists under saves/: each
  // system's folder read as the scan reads the drive's, less what a system
  // says is not a save.
  function carried(files, games, emulators) {
    const found = [];
    for (const f of files) {
      const [, top, ...rest] = f.path.split('/');
      const rel = rest.join('/');
      if (!emulators[top] || !rel) continue;
      const only = emulators[top].savesIn;
      if (only && !new RegExp(only).test(rel)) continue;
      found.push({ rel, systems: R.saveRules.systemsOf(top, emulators),
        file: { name: f.path, size: Number(f.size), created: f.saved_at, saved: f.saved_at, mac: f.mac } });
    }
    return R.saveRules.group(found, games, emulators).map(s => ({
      ...s, location: SUPABASE, created_at: s.created, saved_at: s.saved, note: null,
      mac: s.files.map(f => f.mac).filter(Boolean).at(-1) ?? null,
    }));
  }
  let saves = [];
  let driveZip = null;

  function tile(label, value, sub) {
    const col = el('div', 'rux--css-grid-column rux--sm:col-span-2 rux--md:col-span-4 rux--lg:col-span-4');
    const t = el('div', 'rux--tile');
    t.append(el('p', '', label), el('p', 'rux--type-heading-03', value));
    if (sub) t.append(el('p', 'emu-row__sub', sub));
    col.append(t);
    return col;
  }

  function copies(drive, backups) {
    const out = $('emu-copies');
    out.replaceChildren();
    out.append(tile('Drive', drive?.scanned_at ? R.date(drive.scanned_at) : 'Not scanned',
      drive?.backup ? `${drive.backup.file}, ${R.size(drive.backup.size)}` : 'The last scan packed no backup'));
    out.append(tile('Supabase', backups[0] ? R.date(backups[0].created_at) : 'None yet',
      backups[0] ? `${backups.length} kept` : 'Update on Status uploads one'));
    // Each Mac's newest copy, from the drive's backups.json.
    const macs = new Map();
    for (const b of drive?.backups ?? []) if (!macs.has(b.host) || macs.get(b.host).at < b.at) macs.set(b.host, b);
    if (!macs.size) out.append(tile('Each Mac', 'None yet', 'Run emu/tools/backup-saves.mjs'));
    for (const [host, b] of macs) out.append(tile(host, R.date(b.at), b.folder));
    // Each Mac whose own saves were uploaded, and when last.
    const uploaded = new Map();
    for (const s of saves.filter(x => x.location !== DRIVE && x.location !== SUPABASE)) {
      if (!uploaded.has(s.location) || uploaded.get(s.location) < s.backed_up_at) uploaded.set(s.location, s.backed_up_at);
    }
    for (const [mac, at] of uploaded) out.append(tile(`${mac}'s saves`, R.date(at), 'Uploaded from the Mac'));
    const held = saves.filter(x => x.location === SUPABASE);
    if (held.length) out.append(tile('Carried saves', R.date(held.map(x => x.saved_at).sort().at(-1)), `${held.length} in Supabase, on each Mac that plays`));

    const ul = $('emu-backup-list');
    ul.replaceChildren();
    for (const b of backups) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const button = el('button', 'rux--contained-list-item__content emu-row');
      button.type = 'button';
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', b.name), el('span', 'emu-row__sub', `${R.when(b.created_at)} · ${R.size(b.metadata?.size)} · Download`));
      button.append(main);
      button.addEventListener('click', async () => {
        try { location.href = await R.data.backupLink(b.name); }
        catch (error) { console.error(error); R.notice('That backup could not be downloaded. Try again.'); }
      });
      li.append(button);
      ul.append(li);
    }
    if (!backups.length) ul.append(el('li', 'rux--contained-list-item', 'No backup in Supabase yet.'));
    $('emu-backups-wrap').hidden = false;
  }

  function render() {
    $('emu-sum').textContent = `${saves.length} ${saves.length === 1 ? 'save' : 'saves'}, ${R.size(saves.reduce((a, s) => a + Number(s.size), 0))}`;
    const out = $('emu-groups');
    out.replaceChildren();
    const order = Object.keys(R.SYSTEMS);
    const systems = [...new Set(saves.map(s => s.system))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    for (const system of systems) {
      const rows = saves.filter(s => s.system === system);
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h2', 'rux--contained-list__label', `${R.systemName(system)} (${rows.length})`));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      for (const s of rows) {
        const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
        const b = el('button', 'rux--contained-list-item__content emu-row');
        b.type = 'button';
        const main = el('span', 'emu-row__main');
        main.append(el('span', '', s.name), el('span', 'emu-row__sub',
          [KIND[s.kind], s.location === SUPABASE ? 'in Supabase' : `on ${where(s)}`, `last saved ${R.date(s.saved_at)}`, s.game ? '' : 'no game on the drive', s.note].filter(Boolean).join(' · ')));
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
    $('emu-panel-label').textContent = `${R.systemName(s.system)} · ${KIND[s.kind]}`;
    $('emu-panel-title').textContent = s.name;
    const body = $('emu-panel-body');
    body.replaceChildren();
    const dl = el('dl', 'emu-facts');
    const kept = s.location === SUPABASE;
    for (const [k, v] of [['Game', s.game ?? 'None on the drive by this name'],
      ['Lives on', kept ? `Supabase, and each Mac that plays it${s.mac ? `; last carried from ${s.mac}` : ''}` : where(s)],
      ...(kept ? [] : [['Created', R.when(s.created_at)]]), ['Last saved', R.when(s.saved_at)],
      ...(kept ? [] : [['Backed up', s.location === DRIVE ? (driveZip ? `In ${driveZip.name}` : 'Not yet') : R.when(s.backed_up_at)]]),
      ['Size', R.size(s.size)], ['Files', (s.files ?? []).map(f => f.name).join('\n')]]) {
      const wrap = el('div');
      wrap.append(el('dt', '', k), el('dd', k === 'Files' ? 'emu-files' : '', v));
      dl.append(wrap);
    }
    body.append(dl, restoreOf(s));
    // A carried save has no row of its own to keep a note in.
    if (kept) {
      $('emu-panel').hidden = false;
      $('emu-panel').classList.add('rux--side-panel--open');
      $('emu-panel-close').focus();
      return;
    }
    const form = el('form', 'rux--stack-vertical rux--stack-scale-5');
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', 'Note');
    lab.htmlFor = 'emu-save-note';
    lw.append(lab);
    const tw = el('div', 'rux--text-area__wrapper');
    const area = el('textarea', 'rux--text-area');
    area.id = 'emu-save-note';
    area.rows = 3;
    area.placeholder = 'Where this save is in the game';
    area.value = s.note ?? '';
    tw.append(area);
    item.append(lw, tw);
    const actions = el('div', 'emu-actions');
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
    body.append(form);
    $('emu-panel').hidden = false;
    $('emu-panel').classList.add('rux--side-panel--open');
    $('emu-panel-close').focus();
  }
  // Restoring a save: a Mac's files one by one, each with the folder it goes
  // back into; a drive save from the drive's newest backup zip.
  function restoreOf(s) {
    const box = el('div', 'rux--stack-vertical rux--stack-scale-3');
    box.append(el('h3', 'rux--type-heading-02', 'Restore'));
    const download = async (object, name) => {
      try { location.href = await R.data.fileLink(object, name); }
      catch (error) { console.error(error); R.notice('That file could not be downloaded. Try again.'); }
    };
    if (s.location === DRIVE) {
      box.append(el('p', 'rux--type-body-01', driveZip
        ? `Its files are in ${driveZip.name}, under the paths above; put them back under the drive's saves folder.`
        : 'No backup of the drive holds it yet: import a scan with its zip.'));
      if (driveZip) {
        const b = el('button', 'rux--btn rux--btn--tertiary', 'Download the backup zip');
        b.type = 'button';
        b.addEventListener('click', () => download(driveZip.name, driveZip.name));
        box.append(b);
      }
      return box;
    }
    if (s.location === SUPABASE) {
      box.append(el('p', 'rux--type-body-01', 'Play its game on a Mac and Emu puts it there. Each file can also be downloaded by hand.'));
      for (const f of s.files ?? []) {
        const b = el('button', 'rux--btn rux--btn--tertiary', `Download ${f.name.split('/').pop()}`);
        b.type = 'button';
        b.addEventListener('click', async () => {
          try {
            const link = await R.data.givenLink(f.name);
            if (!link) throw new Error('gone');
            location.href = link;
          } catch (error) { console.error(error); R.notice('That file could not be downloaded. Try again.'); }
        });
        const row = el('div', 'emu-actions');
        row.append(b);
        box.append(row);
      }
      return box;
    }
    for (const f of s.files ?? []) {
      const row = el('div', 'emu-actions');
      const b = el('button', 'rux--btn rux--btn--tertiary', `Download ${f.name.split('/').pop()}`);
      b.type = 'button';
      b.addEventListener('click', () => download(f.object, f.name.split('/').pop()));
      row.append(b);
      box.append(row, el('p', 'emu-row__sub', `Put it back in ${f.from}`));
    }
    return box;
  }


  const closePanel = () => {
    $('emu-panel').classList.remove('rux--side-panel--open');
    $('emu-panel').hidden = true;
  };
  $('emu-panel-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('emu-panel').hidden) closePanel(); });

  async function load() {
    let drive, backups;
    try {
      let files, games, emulators;
      [saves, drive, backups, files, games, emulators] = await Promise.all([R.data.saves(), R.data.drive(), R.data.backups(),
        R.data.files('saves/'), R.data.games(), R.emulators()]);
      saves = [...saves, ...carried(files, games, emulators.systems)];
    } catch (error) { console.error(error); R.notice('Emu could not read the saves. Try again.'); return; }
    $('emu-empty').hidden = Boolean(drive);
    if (!drive) return;
    driveZip = backups[0] ?? null;
    copies(drive, backups);
    const unsorted = drive.unsorted_saves ?? [];
    if (unsorted.length) {
      const folders = [...new Set(unsorted.map(f => f.split('/')[0]))];
      $('emu-unsorted').textContent = `${unsorted.length} files in ${folders.join(', ')} match no game: they sit in a folder not named for a system, from before each system had its own. Move them as emu/docs/emulator-setup.md says.`;
      $('emu-unsorted').hidden = false;
    }
    $('emu-list').hidden = false;
    render();
    // The save ?save=<system>/<name> names, from a game's panel or Problems, opened once.
    const url = new URL(location.href);
    const key = url.searchParams.get('save');
    if (key) {
      url.searchParams.delete('save');
      history.replaceState(null, '', url);
      const s = saves.find(x => `${x.system}/${x.name}` === key);
      if (s) openSave(s);
    }
  }
  load();
})();
