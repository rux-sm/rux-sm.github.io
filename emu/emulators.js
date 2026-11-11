/* ==========================================================================
   emulators.js — the Emulators page
   --------------------------------------------------------------------------
   One row per system, from emulators.json: the emulator and why, each file
   it needs and whether the drive's bios folder holds it, how it names a
   save, and where its settings and installer live. How each Mac stands is
   the Status page's.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  const SAVES = {
    name: 'a save named after the game\'s file', titleId: 'a save under the game\'s title ID',
    discId: 'a save named by the disc\'s ID', serial: 'a memory card named by the disc\'s serial',
  };

  async function load() {
    let emulators, bios, drive, games;
    try { [emulators, bios, drive, games] = await Promise.all([R.emulators(), R.data.bios(), R.data.drive(), R.data.gameKeys()]); }
    catch (error) { console.error(error); R.notice('Emu could not read the emulators. Try again.'); return; }
    $('emu-empty').hidden = Boolean(drive);
    const f = emulators.frontend;
    $('emu-frontend').textContent = `${f.name} is the library. ${f.why}`;
    // An emulator keeps one save folder, named for the first system it plays.
    const folderOf = emu => Object.keys(emulators.systems).find(s => emulators.systems[s].emulator === emu.emulator);
    const count = new Map();
    for (const g of games) count.set(g.system, (count.get(g.system) ?? 0) + 1);
    const installers = drive?.installers ?? [];

    const ul = $('emu-systems');
    ul.replaceChildren();
    for (const [system, emu] of Object.entries(emulators.systems)) {
      const li = el('li', 'rux--contained-list-item');
      const box = el('div', 'rux--contained-list-item__content emu-emulator');
      const head = el('div', 'emu-row');
      const main = el('span', 'emu-row__main');
      const n = count.get(system) ?? 0;
      main.append(el('span', '', `${R.systemName(system)}: ${emu.emulator}`),
        el('span', 'emu-row__sub', `${n ? `${n} ${n === 1 ? 'game' : 'games'}` : 'No games yet'} · ${emu.why}`));
      head.append(main);
      box.append(head);

      const needs = R.needsOf(system, emu, bios);
      const tags = el('div', 'emu-tags');
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

      const dl = el('dl', 'emu-facts emu-facts--row');
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
