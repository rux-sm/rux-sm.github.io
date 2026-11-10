/* ==========================================================================
   saves.js — the Saves page
   --------------------------------------------------------------------------
   Where each of the three copies stands: the drive, Supabase and each Mac,
   with every backup in Supabase to download, and Back up this Mac's saves,
   which uploads what roms/tools/check-mac.mjs wrote to the drive.
   Then every save, the drive's and each Mac's, under one heading per
   system, each opening in the side panel with its files, dates, where it
   lives, how to restore it, and rux's note, which is saved from there.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the saves.'); return; }

  const KIND = { save: 'Save', state: 'Save state', card: 'Memory card' };
  const DRIVE = 'drive';
  const where = s => (s.location === DRIVE ? 'the drive' : s.location);
  let saves = [];
  let driveZip = null;

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
    // Each Mac whose own saves were uploaded, and when last.
    const uploaded = new Map();
    for (const s of saves.filter(x => x.location !== DRIVE)) {
      if (!uploaded.has(s.location) || uploaded.get(s.location) < s.backed_up_at) uploaded.set(s.location, s.backed_up_at);
    }
    for (const [mac, at] of uploaded) out.append(tile(`${mac}'s saves`, R.date(at), 'Uploaded from the Mac'));

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
          [KIND[s.kind], `on ${where(s)}`, `last saved ${R.date(s.saved_at)}`, s.game ? '' : 'no game on the drive', s.note].filter(Boolean).join(' · ')));
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
    for (const [k, v] of [['Game', s.game ?? 'None on the drive by this name'], ['Lives on', where(s)],
      ['Created', R.when(s.created_at)], ['Last saved', R.when(s.saved_at)],
      ['Backed up', s.location === DRIVE ? (driveZip ? `In ${driveZip.name}` : 'Not yet') : R.when(s.backed_up_at)],
      ['Size', R.size(s.size)], ['Files', (s.files ?? []).map(f => f.name).join('\n')]]) {
      const wrap = el('div');
      wrap.append(el('dt', '', k), el('dd', k === 'Files' ? 'roms-files' : '', v));
      dl.append(wrap);
    }
    body.append(dl, restoreOf(s));
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
    body.append(form);
    $('roms-panel').hidden = false;
    $('roms-panel').classList.add('rux--side-panel--open');
    $('roms-panel-close').focus();
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
    for (const f of s.files ?? []) {
      const row = el('div', 'roms-actions');
      const b = el('button', 'rux--btn rux--btn--tertiary', `Download ${f.name.split('/').pop()}`);
      b.type = 'button';
      b.addEventListener('click', () => download(f.object, f.name.split('/').pop()));
      row.append(b);
      box.append(row, el('p', 'roms-row__sub', `Put it back in ${f.from}`));
    }
    return box;
  }

  // ---- Back up this Mac's saves ------------------------------------------

  // The drive's macs folder check-mac.mjs writes to, as Chrome gave it, kept
  // in this browser so it is picked once.
  const handles = (mode, act) => new Promise((resolve, reject) => {
    const open = indexedDB.open('roms', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('handles', mode);
      const req = act(tx.objectStore('handles'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    };
  });
  const said = text => { $('roms-mac-status').textContent = text; };
  // Supabase takes a narrower set of characters in a file's path than a file name may hold.
  const safe = p => p.split('/').map(part => part.replace(/[^\w !\-.*'()&$@=;:+,?]/g, '_')).join('/');
  const fileAt = async (dir, rel) => {
    const parts = rel.split('/');
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
    return (await dir.getFileHandle(parts.at(-1))).getFile();
  };
  const manifestOf = async dir => {
    try { return JSON.parse(await (await fileAt(dir, 'report.json')).text()); } catch { return null; }
  };

  async function backUpMac() {
    if (!window.showDirectoryPicker) { said('Backing up a Mac\'s saves needs Chrome, which can read a folder you choose.'); return; }
    const button = $('roms-mac-backup');
    button.disabled = true;
    try {
      let dir = await handles('readonly', store => store.get('macs')).catch(() => null);
      if (dir && await dir.queryPermission({ mode: 'read' }) !== 'granted' && await dir.requestPermission({ mode: 'read' }) !== 'granted') dir = null;
      if (!dir) {
        said('Choose the macs folder in the drive\'s emulation folder.');
        dir = await window.showDirectoryPicker({ id: 'roms-macs', mode: 'read' });
        await handles('readwrite', store => store.put(dir, 'macs'));
      }
      // The newest report in the folder, or the folder itself if one Mac's was chosen.
      let gathering = await manifestOf(dir) ? { dir, m: await manifestOf(dir) } : null;
      for await (const [, h] of dir.entries()) {
        if (h.kind !== 'directory') continue;
        const m = await manifestOf(h);
        if (m && (!gathering || m.made > gathering.m.made)) gathering = { dir: h, m };
      }
      if (!gathering) { said('That folder holds no Mac\'s report. Double-click Check this Mac.command on the drive first.'); return; }
      const { m } = gathering;
      said(`Uploading ${m.files.length} files from ${m.mac}, gathered ${R.when(m.made)}…`);
      const [games, emulators] = await Promise.all([R.data.games(), R.emulators()]);
      const uploads = [];
      const files = [];
      for (const f of m.files) {
        const stored = safe(f.stored);
        uploads.push({ stored, blob: await fileAt(gathering.dir, f.stored) });
        files.push({ rel: f.rel, systems: f.systems, file: { name: f.rel, stored, from: f.from, size: f.size, created: f.created, saved: f.saved } });
      }
      const grouped = R.saveRules.group(files, games, emulators.systems);
      await R.data.saveMacSaves(m, uploads, grouped);
      said(`${grouped.length} saves from ${m.mac} backed up, ${m.files.length} files in all.`);
      await load();
    } catch (error) {
      if (error?.name === 'AbortError') { said(''); return; }
      console.error(error);
      said(error?.message ? `That did not back up: ${error.message}` : 'That did not back up. Try again.');
    } finally {
      button.disabled = false;
    }
  }
  $('roms-mac-backup').addEventListener('click', backUpMac);

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
    driveZip = backups[0] ?? null;
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
