/* ==========================================================================
   status.js — the Status page
   --------------------------------------------------------------------------
   What is done and what is left. The drive, from its last scan: each BIOS
   a system's emulator needs, each emulator's installer kept, and saves
   still in a folder from before each emulator had its own. Then each Mac,
   from the last time Check this Mac.command ran on it: ES-DE installed and
   reading the drive's games, each emulator installed and saving into its
   folder on the drive, and each retired app still there or still holding
   files. An emulator whose systems have no games yet is not needed yet.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el, tag } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the collection.'); return; }

  const DONE = ['Done', 'rux--tag--green'];
  const TODO = ['To do', 'rux--tag--red'];
  const LATER = ['Not needed yet', 'rux--tag--gray'];
  const files = n => `${n} ${n === 1 ? 'file' : 'files'}`;

  // A state as a tag that keeps its width beside a long line.
  const state = t => { const box = el('span', 'roms-state'); box.append(tag(t, true)); return box; };

  // A list of rows under a heading, each row a thing, what is true of it and its state.
  function section(title, note, rows) {
    const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
    const head = el('div', 'rux--contained-list__header');
    const left = rows.filter(r => r.state === TODO).length;
    head.append(el('h2', 'rux--contained-list__label', title),
      state(left ? [`${left} to do`, 'rux--tag--red'] : ['All done', 'rux--tag--green']));
    const ul = el('ul');
    ul.setAttribute('role', 'list');
    for (const r of rows) {
      const li = el('li', 'rux--contained-list-item');
      const content = el('div', 'rux--contained-list-item__content roms-row');
      const main = el('span', 'roms-row__main');
      main.append(el('span', '', r.what));
      if (r.detail) main.append(el('span', 'roms-row__sub roms-files', r.detail));
      content.append(main, state(r.state));
      li.append(content);
      ul.append(li);
    }
    box.append(head, ul);
    const wrap = el('section', 'rux--stack-vertical rux--stack-scale-3');
    wrap.append(box);
    if (note) wrap.append(el('p', 'rux--type-helper-text-01 roms-row__sub', note));
    return wrap;
  }

  // The drive, from its last scan.
  function driveRows(emulators, bios, drive, saves, used) {
    const rows = [];
    const missing = [];
    for (const [system, emu] of Object.entries(emulators.systems)) {
      if (!used(emu.emulator)) continue;
      for (const n of R.needsOf(system, emu, bios)) if (!n.ok && !n.optional) missing.push(`${R.systemName(system)}: ${n.label}${n.wrong ? ', not the right file' : ''}`);
    }
    rows.push({ what: 'BIOS and keys', state: missing.length ? TODO : DONE,
      detail: missing.length ? `Put in the drive's bios folder:\n${missing.join('\n')}` : 'Every file a system with games needs is in the bios folder' });

    const names = [...new Set(Object.values(emulators.systems).map(e => e.emulator))].filter(used);
    const flat = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const kept = n => (drive.installers ?? []).some(i => flat(i.name).includes(flat(n)));
    const noInstaller = names.filter(n => !kept(n));
    rows.push({ what: 'Installers kept on the drive', state: noInstaller.length ? TODO : DONE,
      detail: noInstaller.length ? `None yet in emulation/emulators/ for ${noInstaller.join(', ')}` : `One for each of ${names.join(', ')}` });

    // A save's folder is its emulator's when it is named for a system.
    const old = new Map();
    for (const s of saves.filter(x => x.location === 'drive')) {
      const top = (s.files?.[0]?.name ?? '').split('/')[0];
      if (top !== '..' && !emulators.systems[top]) old.set(top, (old.get(top) ?? 0) + 1);
    }
    for (const f of drive.unsorted_saves ?? []) if (!old.has(f.split('/')[0])) old.set(f.split('/')[0], 0);
    const unsorted = (drive.unsorted_saves ?? []).length;
    rows.push({ what: 'Saves in their emulator\'s folder', state: old.size ? TODO : DONE,
      detail: old.size
        ? `Move out of ${[...old.keys()].join(', ')}: ${[...old.values()].reduce((a, b) => a + b, 0)} saves${unsorted ? ` and ${files(unsorted)} that match no game` : ''}, as roms/docs/emulator-setup.md says`
        : 'Every save on the drive sits in its emulator\'s folder' });
    return rows;
  }

  // One Mac, from its last gathering.
  function macRows(mac, emulators, used) {
    const rows = [];
    const f = mac.frontend ?? {};
    const reads = f.romDirectory && /\/emulation\/roms\/?$/.test(f.romDirectory);
    rows.push({ what: `${f.name ?? 'ES-DE'}, the library`,
      state: f.app && reads ? DONE : TODO,
      detail: !f.app ? 'Install it, as roms/docs/emulator-setup.md says'
        : reads ? `${f.app.version ?? 'Installed'} · reads ${f.romDirectory}`
        : f.romDirectory ? `Reads ${f.romDirectory}: point it at the drive's roms folder`
        : 'Open it once and point its ROM folder at the drive\'s roms folder' });

    // An emulator keeps one save folder on the drive, named for the first system it plays.
    const folderOf = name => Object.keys(emulators.systems).find(s => emulators.systems[s].emulator === name);
    for (const e of (mac.emulators ?? []).filter(x => !x.retired)) {
      const systems = (e.systems ?? []).map(R.systemName).join(', ');
      const what = `${e.emulator}: ${systems}`;
      if (!used(e.emulator)) {
        rows.push({ what, state: LATER, detail: e.app ? `${e.app.version ?? 'Installed'} · no games for it yet` : 'No games for it yet' });
        continue;
      }
      if (!e.app) {
        rows.push({ what, state: TODO, detail: e.data ? `Install it; its old data is left at ${e.data}` : 'Install it' });
        continue;
      }
      const version = e.app.version ?? 'Installed';
      if (emulators.macSaves?.[e.emulator]?.inHardDisk) {
        rows.push({ what, state: DONE, detail: `${version} · saves inside its hard disk image` });
        continue;
      }
      const drive = `saves/${folderOf(e.emulator)}`;
      const onDrive = new RegExp(`/emulation/${drive}(/|$)`);
      const places = e.places ?? [];
      const elsewhere = places.filter(p => p.dir && !onDrive.test(p.dir) && (p.from === 'setting' || p.files));
      const where = places.filter(p => p.dir).map(p => `${files(p.files ?? 0)} in ${p.dir}`).join('\n');
      if (!e.data) {
        rows.push({ what, state: TODO, detail: `${version} · open it once and set its saves to the drive's ${drive}/` });
      } else if (elsewhere.length || !places.some(p => p.dir && onDrive.test(p.dir))) {
        rows.push({ what, state: TODO, detail: `${version} · move its saves and point it at the drive's ${drive}/\n${where}` });
      } else {
        rows.push({ what, state: DONE, detail: `${version} · saves to the drive\n${where}` });
      }
    }

    for (const e of (mac.emulators ?? []).filter(x => x.retired)) {
      const left = (e.places ?? []).filter(p => p.files).map(p => `${files(p.files)} in ${p.dir}`);
      rows.push({ what: `${e.emulator}, retired`, state: TODO,
        detail: left.length
          ? `Move what is left to the drive, then remove it:\n${left.join('\n')}`
          : e.app ? 'Remove the app' : `Remove its folder ${e.data}` });
    }
    return rows;
  }

  async function load() {
    let emulators, bios, drive, games, saves, macs;
    try {
      [emulators, bios, drive, games, saves, macs] = await Promise.all([
        R.emulators(), R.data.bios(), R.data.drive(), R.data.gameKeys(), R.data.saves(), R.data.macs()]);
    } catch (error) { console.error(error); R.notice('Roms could not read the status. Try again.'); return; }

    // An emulator is needed once any system it plays has a game.
    const withGames = new Set(games.map(g => g.system));
    const used = name => Object.entries(emulators.systems).some(([s, e]) => e.emulator === name && withGames.has(s));

    const out = $('roms-status');
    out.replaceChildren();
    if (drive) {
      out.append(section('The drive', `From the scan of ${R.when(drive.scanned_at)}. Scan and import again after a change.`,
        driveRows(emulators, bios, drive, saves, used)));
    } else {
      const p = el('p', 'rux--type-body-01', 'No scan yet. ');
      const a = el('a', 'rux--link', 'Import one');
      a.href = 'import.html';
      p.append(a, '.');
      out.append(p);
    }
    for (const mac of macs) {
      out.append(section(`${mac.name} · macOS ${mac.macos ?? '?'}`,
        `From ${R.when(mac.gathered_at)}. Double-click Check this Mac.command on the drive, then Back up this Mac's saves on the Saves page, to check again.`,
        macRows(mac, emulators, used)));
    }
    if (!macs.length) {
      out.append(el('p', 'rux--type-body-01', 'No Mac has reported yet: double-click Check this Mac.command on the drive, then Back up this Mac\'s saves on the Saves page.'));
    }
  }
  load();
})();
