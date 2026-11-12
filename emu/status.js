/* ==========================================================================
   status.js — the Status page
   --------------------------------------------------------------------------
   What is done and what is left. The collection: each BIOS a system's
   emulator needs and each emulator's installer, which Supabase holds for
   every Mac, Rux Emu Helper's zip there to download on a Mac away from the
   collection, whether its project has a newer one out, and from the drive's
   last scan, saves still in a folder from before each emulator had its own. Then this Mac,
   live from Rux Emu Helper, helper.js, when it is running here, and every
   other Mac as Update last saved it there, folded shut below it so the page
   is about the Mac in hand. Each Mac lists its emulators in
   emulators.json's order: ES-DE reading the
   drive's games, each emulator saving into its folder on the drive, and each
   retired app still there or still holding files. Installing an app is what
   says a Mac plays with it, so one that is not installed is only said, unless
   its old folder still holds saves. An emulator whose systems have no games
   yet is not needed yet. Each emulator's line opens its profile on the
   Emulators page.
   Update, above them, is update.js, and they are drawn again after it saves;
   this Mac is read again each time the page comes back into view.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  const DONE = ['Done', 'rux--tag--green'];
  const TODO = ['To do', 'rux--tag--red'];
  const LATER = ['Not needed yet', 'rux--tag--gray'];
  const ABSENT = ['Not installed', 'rux--tag--gray'];
  const files = n => `${n} ${n === 1 ? 'file' : 'files'}`;
  // Whether Supabase keeps an installer named for an app.
  const kept = (held, name) => Boolean(R.installerOf(held, name));
  // An emulator's profile on the Emulators page.
  const profile = name => `emulators.html#${R.slug(name)}`;
  const absent = (held, name) => kept(held, name) ? 'Its installer is in Supabase' : 'No installer for it in Supabase yet';

  // A state as a tag that keeps its width beside a long line.
  const state = t => { const box = el('span', 'emu-state'); box.append(tag(t, true)); return box; };

  // A list of rows under a heading, each row a thing, what is true of it and its state; a row with an `href` is a link.
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
      const content = el('div', 'rux--contained-list-item__content emu-row');
      const main = el('span', 'emu-row__main');
      if (r.href) { const a = el('a', 'rux--link', r.what); a.href = r.href; main.append(a); } else main.append(el('span', '', r.what));
      if (r.detail) main.append(el('span', 'emu-row__sub emu-files', r.detail));
      content.append(main);
      if (r.button) {
        const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', r.button.label);
        b.type = 'button';
        b.addEventListener('click', async () => {
          b.disabled = true;
          try { await r.button.run(); } catch (error) { console.error(error); R.notice(`${r.button.label} did not work. Try again.`); }
          b.disabled = false;
        });
        content.append(b);
      }
      content.append(state(r.state));
      li.append(content);
      ul.append(li);
    }
    box.append(head, ul);
    const wrap = el('section', 'rux--stack-vertical rux--stack-scale-3');
    wrap.append(box);
    if (note) wrap.append(el('p', 'rux--type-helper-text-01 emu-row__sub', note));
    return wrap;
  }

  // The collection: what Supabase holds for every Mac, and the drive from its last scan.
  function driveRows(emulators, bios, drive, saves, used, held, helperVersion) {
    const rows = [];
    const missing = [];
    for (const [system, emu] of Object.entries(emulators.systems)) {
      if (!used(emu.emulator)) continue;
      for (const n of R.needsOf(system, emu, bios)) if (!n.ok && !n.optional) missing.push(`${R.systemName(system)}: ${n.label}${n.wrong ? ', not the right file' : ''}`);
    }
    rows.push({ what: 'BIOS and keys', state: missing.length ? TODO : DONE,
      detail: missing.length ? `Put in the drive's bios folder, and Update:\n${missing.join('\n')}` : 'Every file a system with games needs is in Supabase' });

    const names = [...new Set(Object.values(emulators.systems).map(e => e.emulator))].filter(used);
    const noInstaller = names.filter(n => !kept(held, n));
    rows.push({ what: 'Installers kept in Supabase', state: noInstaller.length ? TODO : DONE,
      detail: noInstaller.length ? `None yet for ${noInstaller.join(', ')}: put it in the drive's emulation/emulators/, and Update` : `One for each of ${names.join(', ')}` });

    // Rux Emu Helper, zipped among the installers, for a Mac away from the collection.
    const zip = R.installerOf(held, 'Rux Emu Helper');
    const keptHelper = zip?.name.match(/-(\d+)-macOS/)?.[1] ?? null;
    const here = helperVersion;
    const download = async () => {
      const link = await R.data.givenLink(`emulators/${zip.name}`);
      if (link) location.href = link;
    };
    rows.push(!zip
      ? { what: 'Rux Emu Helper', state: TODO, detail: 'Not in Supabase yet: build it with emu/tools/build-helper.mjs, and Update' }
      : here && Number(here) < Number(keptHelper)
        ? { what: 'Rux Emu Helper', state: TODO, button: { label: 'Download', run: download },
          detail: `This Mac runs version ${here}: download version ${keptHelper}, unzip it, drag it into Applications and open it` }
        : { what: 'Rux Emu Helper', state: DONE, button: { label: 'Download', run: download },
          detail: `Version ${keptHelper} in Supabase. On a new Mac: download, unzip, drag into Applications, open it, and allow it once in System Settings, Privacy & Security` });

    // Each installer against the newest its project has out, once Update has asked.
    if (drive.newest) {
      const newer = R.newerOut(emulators, drive, held);
      rows.push({ what: 'The newest versions in Supabase', state: newer.length ? TODO : DONE,
        detail: newer.length ? `Download into the drive's emulation/emulators/, and Update:\n${newer.map(n => `${n.name} ${n.newest}, in place of ${n.kept}`).join('\n')}`
          : 'Each installer is the newest its project has out' });
    }

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
        ? `Move out of ${[...old.keys()].join(', ')}: ${[...old.values()].reduce((a, b) => a + b, 0)} saves${unsorted ? ` and ${files(unsorted)} that match no game` : ''}, as emu/docs/emulator-setup.md says`
        : 'Every save on the drive sits in its emulator\'s folder' });
    return rows;
  }

  // One Mac, from its last gathering.
  function macRows(mac, emulators, used, held) {
    const rows = [];
    const f = mac.frontend ?? {};
    const reads = f.romDirectory && /\/emulation\/roms\/?$/.test(f.romDirectory);
    rows.push({ what: `${f.name ?? 'ES-DE'}, the library`, href: profile(f.name ?? 'ES-DE'),
      state: !f.app ? ABSENT : reads ? DONE : TODO,
      detail: !f.app ? absent(held, f.name ?? 'ES-DE')
        : reads ? `${f.app.version ?? 'Installed'} · reads ${f.romDirectory}`
        : f.romDirectory ? `Reads ${f.romDirectory}: point it at the drive's roms folder`
        : 'Open it once and point its ROM folder at the drive\'s roms folder' });

    // An emulator keeps one save folder on the drive, named for the first system it plays.
    const folderOf = name => Object.keys(emulators.systems).find(s => emulators.systems[s].emulator === name);
    for (const e of (mac.emulators ?? []).filter(x => !x.retired)) {
      const systems = (e.systems ?? []).map(R.systemName).join(', ');
      const what = `${e.emulator}: ${systems}`;
      const href = profile(e.emulator);
      if (!e.app) {
        const left = (e.places ?? []).filter(p => p.files && !/\/emulation\/saves\//.test(p.dir)).map(p => `${files(p.files)} in ${p.dir}`);
        rows.push(left.length
          ? { what, href, state: TODO, detail: `Not installed, and its old folder holds saves: move them to the drive's saves/${folderOf(e.emulator)}/\n${left.join('\n')}` }
          : { what, href, state: ABSENT, detail: absent(held, e.emulator) });
        continue;
      }
      if (!used(e.emulator)) {
        rows.push({ what, href, state: LATER, detail: `${e.app.version ?? 'Installed'} · no games for it yet` });
        continue;
      }
      const version = e.app.version ?? 'Installed';
      if (emulators.macSaves?.[e.emulator]?.inHardDisk) {
        rows.push({ what, href, state: DONE, detail: `${version} · saves inside its hard disk image` });
        continue;
      }
      // An emulator whose saves Emu carries keeps them in its own folder.
      const carried = (emulators.macSaves?.[e.emulator]?.places ?? []).map((p, i) => p.stored ? e.places?.[i] : null).filter(Boolean);
      if (carried.length) {
        const where = carried.map(p => `${files(p.files ?? 0)} in ${p.dir}`).join('\n');
        rows.push(e.data && carried.every(p => p.dir?.startsWith(`${e.data}/`))
          ? { what, href, state: DONE, detail: `${version} · saves carried through Supabase\n${where}` }
          : { what, href, state: TODO, detail: `${version} · press Play once, and Emu points it at its own folder\n${where}` });
        continue;
      }
      const folder = `saves/${folderOf(e.emulator)}`;
      const onDrive = new RegExp(`/emulation/${folder}(/|$)`);
      const places = e.places ?? [];
      const elsewhere = places.filter(p => p.dir && !onDrive.test(p.dir) && (p.from === 'setting' || p.files));
      const where = places.filter(p => p.dir).map(p => `${files(p.files ?? 0)} in ${p.dir}`).join('\n');
      if (!e.data) {
        rows.push({ what, href, state: TODO, detail: `${version} · open it once and set its saves to the drive's ${folder}/` });
      } else if (elsewhere.length || !places.some(p => p.dir && onDrive.test(p.dir))) {
        rows.push({ what, href, state: TODO, detail: `${version} · move its saves and point it at the drive's ${folder}/\n${where}` });
      } else {
        rows.push({ what, href, state: DONE, detail: `${version} · saves to the drive\n${where}` });
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

  // A Mac's emulators in emulators.json's order, its retired apps after.
  const ordered = (mac, emulators) => {
    const order = [...Object.keys(emulators.macSaves ?? {}), ...Object.keys(emulators.retired ?? {})];
    return { ...mac, emulators: [...(mac.emulators ?? [])].sort((a, b) => order.indexOf(a.emulator) - order.indexOf(b.emulator)) };
  };

  let read = null;
  let live = null;
  // Whether the other Macs are unfolded, kept across a redraw.
  let othersOpen = false;

  async function load() {
    try {
      const [emulators, held, drive, games, saves, macs] = await Promise.all([
        R.emulators(), R.data.files(), R.data.drive(), R.data.gameKeys(), R.data.saves(), R.data.macs()]);
      // The BIOS, keys and firmware among the files, each by its name under bios/.
      const bios = held.filter(f => f.path.startsWith('bios/')).map(f => ({ name: f.path.slice('bios/'.length), sha1: f.sha1 }));
      read = { emulators, held, bios, drive, games, saves, macs };
    } catch (error) { console.error(error); R.notice('Emu could not read the status. Try again.'); return; }
    draw();
    readThisMac();
  }

  // The version of the helper answering on this Mac, or null.
  let helperVersion = null;

  async function readThisMac() {
    if (!R.helper.onMac) return;
    helperVersion = (await R.helper.status())?.version ?? null;
    live = await R.helper.mac();
    if (read) draw();
  }

  function draw() {
    const { emulators, held, bios, drive, games, saves, macs } = read;
    // An emulator is needed once any system it plays has a game.
    const withGames = new Set(games.map(g => g.system));
    const used = name => Object.entries(emulators.systems).some(([s, e]) => e.emulator === name && withGames.has(s));

    const out = $('emu-status');
    out.replaceChildren();
    if (drive) {
      out.append(section('The collection', `What Supabase holds for every Mac, and the drive from the scan of ${R.when(drive.scanned_at)}.`,
        driveRows(emulators, bios, drive, saves, used, held, helperVersion)));
    } else {
      out.append(el('p', 'rux--type-body-01', 'No scan yet. Update scans the drive.'));
    }
    // This Mac, read now, stands in for its last report.
    const here = live && { name: live.mac, macos: live.macos, frontend: live.frontend, emulators: live.emulators, live: true };
    const rowsOf = mac => macRows(ordered(mac, emulators), emulators, used, held);
    const macSection = (mac, rows) => section(`${mac.name} · macOS ${mac.macos ?? '?'}${mac.live ? ' · this Mac' : ''}`,
      mac.live
        ? 'Live from Rux Emu Helper. Update saves it, with any save this Mac keeps itself.'
        : `As Update last saved it there, ${R.when(mac.gathered_at)}.`,
      rows);
    if (here) out.append(macSection(here, rowsOf(here)));
    if (R.helper.onMac && !live) out.append(startHelper());
    const others = macs.filter(m => m.name !== here?.name).sort((a, b) => a.name.localeCompare(b.name))
      .map(mac => ({ mac, rows: rowsOf(mac) }));
    if (others.length) {
      const left = others.reduce((n, o) => n + o.rows.filter(r => r.state === TODO).length, 0);
      out.append(otherMacs(here ? 'Other Macs' : 'Macs', left, others.map(o => macSection(o.mac, o.rows))));
    }
    if (!here && !others.length) {
      out.append(el('p', 'rux--type-body-01', 'No Mac has been saved yet: Update on a Mac with Rux Emu Helper saves it.'));
    }
  }

  // The Macs that are not this one, in one fold of Design's accordion, shut
  // until opened, its heading saying what they have left to do.
  function otherMacs(title, left, sections) {
    const item = R.fold([el('span', 'emu-row__main', `${title} (${sections.length})`),
      state(left ? [`${left} to do`, 'rux--tag--red'] : ['All done', 'rux--tag--green'])],
      sections, { id: 'emu-other-macs', open: othersOpen });
    item.addEventListener('rux:accordion-opened', () => { othersOpen = true; });
    item.addEventListener('rux:accordion-closed', () => { othersOpen = false; });
    return R.folds([item]);
  }

  // On a Mac whose helper is not answering, a way to start it and see this Mac live.
  function startHelper() {
    const box = el('div', 'rux--stack-vertical rux--stack-scale-3');
    const said = el('p', 'rux--type-body-01', 'Rux Emu Helper is not running on this Mac, so this Mac is not shown live.');
    said.setAttribute('role', 'status');
    const b = el('button', 'rux--btn rux--btn--secondary', 'Start Rux Emu Helper');
    b.type = 'button';
    b.addEventListener('click', async () => {
      b.disabled = true;
      R.helper.start();
      said.textContent = 'Starting…';
      for (let i = 0; i < 10 && !live; i += 1) { await new Promise(r => setTimeout(r, 1000)); live = await R.helper.mac(); }
      if (live) draw();
      else { said.textContent = 'It did not start. Install it with Install Rux Emu Helper.command beside the games, or Download it under The collection.'; b.disabled = false; }
    });
    box.append(said, b);
    return box;
  }

  load();
  document.addEventListener('emu:saved', load);
  // The helper may be started or quit, or an emulator set up, while the page is away.
  window.addEventListener('focus', readThisMac);
})();
