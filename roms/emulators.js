/* ==========================================================================
   emulators.js — the Emulators page
   --------------------------------------------------------------------------
   How each Mac stood when its saves were last gathered: its macOS, ES-DE's
   and each emulator's app and version, or that it is not installed or left
   only its data, and each place it keeps saves, from its setting or its
   default, and how many it found. Then one row per system, from
   emulators.json: the emulator and why, each file it needs and whether the
   drive's bios folder holds it, how it names a save, and where its
   settings and installer live.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el, tag } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the collection.'); return; }

  const SAVES = {
    name: 'a save named after the game\'s file', titleId: 'a save under the game\'s title ID',
    discId: 'a save named by the disc\'s ID', serial: 'a memory card named by the disc\'s serial',
  };

  // An app's state on a Mac as a tag: its version, gone with its data left, or not there.
  const appTag = (app, data) => (app
    ? tag([`Installed${app.version ? ` · ${app.version}` : ''}`, 'rux--tag--green'], true)
    : data ? tag(['App gone, its data left', 'rux--tag--warm-gray'], true) : tag(['Not installed', 'rux--tag--gray'], true));

  function showMacs(macs) {
    $('roms-macs-note').textContent = macs.length
      ? 'As each Mac stood the last time Back up saves.command ran on it and its saves were uploaded on the Saves page.'
      : 'No Mac has reported yet: double-click Back up saves.command on the drive, then Back up this Mac\'s saves on the Saves page.';
    const out = $('roms-macs');
    out.replaceChildren();
    for (const m of macs) {
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h3', 'rux--contained-list__label', `${m.name} · macOS ${m.macos ?? '?'} · checked ${R.when(m.gathered_at)}`));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      const item = (title, sub, tags) => {
        const li = el('li', 'rux--contained-list-item');
        const content = el('div', 'rux--contained-list-item__content roms-emulator');
        const main = el('span', 'roms-row__main');
        main.append(el('span', '', title));
        if (sub) main.append(el('span', 'roms-row__sub roms-files', sub));
        const t = el('div', 'roms-tags');
        t.append(...tags);
        content.append(main, t);
        li.append(content);
        ul.append(li);
      };
      const f = m.frontend ?? {};
      item(f.name ?? 'ES-DE', 'The library', [appTag(f.app, null)]);
      for (const e of m.emulators ?? []) {
        const places = (e.places ?? []).map(p => `${p.found ? `${p.files} ${p.files === 1 ? 'file' : 'files'} in` : 'Nothing at'} ${p.dir}${p.from === 'setting' ? ', from its setting' : ''}`);
        const tags = [appTag(e.app, e.data)];
        if (e.files) tags.push(tag([`${e.files} save ${e.files === 1 ? 'file' : 'files'}, ${R.size(e.size)}`, 'rux--tag--blue'], true));
        item(`${e.emulator}: ${(e.systems ?? []).map(R.systemName).join(', ')}`,
          places.join('\n') || (e.data ? '' : 'No data folder on this Mac'), tags);
      }
      box.append(head, ul);
      out.append(box);
    }
  }

  async function load() {
    let emulators, bios, drive, games, macs;
    try { [emulators, bios, drive, games, macs] = await Promise.all([R.emulators(), R.data.bios(), R.data.drive(), R.data.gameKeys(), R.data.macs()]); }
    catch (error) { console.error(error); R.notice('Roms could not read the emulators. Try again.'); return; }
    $('roms-empty').hidden = Boolean(drive);
    const f = emulators.frontend;
    $('roms-frontend').textContent = `${f.name} is the library. ${f.why}`;
    // An emulator keeps one save folder, named for the first system it plays.
    const folderOf = emu => Object.keys(emulators.systems).find(s => emulators.systems[s].emulator === emu.emulator);
    const count = new Map();
    for (const g of games) count.set(g.system, (count.get(g.system) ?? 0) + 1);
    const installers = drive?.installers ?? [];

    showMacs(macs);
    const ul = $('roms-systems');
    ul.replaceChildren();
    for (const [system, emu] of Object.entries(emulators.systems)) {
      const li = el('li', 'rux--contained-list-item');
      const box = el('div', 'rux--contained-list-item__content roms-emulator');
      const head = el('div', 'roms-row');
      const main = el('span', 'roms-row__main');
      const n = count.get(system) ?? 0;
      main.append(el('span', '', `${R.systemName(system)}: ${emu.emulator}`),
        el('span', 'roms-row__sub', `${n ? `${n} ${n === 1 ? 'game' : 'games'}` : 'No games yet'} · ${emu.why}`));
      head.append(main);
      box.append(head);

      const needs = R.needsOf(system, emu, bios);
      const tags = el('div', 'roms-tags');
      if (!needs.length) tags.append(tag(['Needs nothing', 'rux--tag--green'], true));
      for (const need of needs) {
        const [word, cls] = need.ok ? ['', 'rux--tag--green']
          : need.wrong ? [': not the right file', 'rux--tag--red']
          : need.optional ? [': optional', 'rux--tag--gray'] : [': missing', 'rux--tag--red'];
        tags.append(tag([`${need.label}${word}`, cls], true));
      }
      const installer = installers.find(i => i.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        .includes(emu.emulator.toLowerCase().replace(/[^a-z0-9]/g, '')));
      tags.append(tag(installer ? [`Installer: ${installer.name}`, 'rux--tag--green'] : ['No installer on the drive', 'rux--tag--gray'], true));
      box.append(tags);

      const dl = el('dl', 'roms-facts roms-facts--row');
      for (const [k, v] of [['Saves', `saves/${folderOf(emu)}/, ${SAVES[emu.saves]}`], ['Settings', emu.settings]]) {
        const wrap = el('div');
        wrap.append(el('dt', '', k), el('dd', '', v));
        dl.append(wrap);
      }
      box.append(dl);
      li.append(box);
      ul.append(li);
    }
  }
  load();
})();
