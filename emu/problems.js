/* ==========================================================================
   problems.js — the Problems page
   --------------------------------------------------------------------------
   Every game with a problem, under one heading per kind of problem, worst
   kind first; a game with two problems is under both. Each row says what is
   wrong and opens the game in the Library. Two kinds belong to no game: a
   file an emulator needs that the drive lacks, which opens Emulators, and a
   save whose game is not on the drive, which opens Saves.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  async function load() {
    let games, notes, bios, saves, drive, emulators;
    try {
      [games, notes, bios, saves, drive, emulators] = await Promise.all([
        R.data.games(), R.data.notes(), R.data.bios(), R.data.saves(), R.data.drive(), R.emulators()]);
    } catch (error) { console.error(error); R.notice('Emu could not read the collection. Try again.'); return; }
    $('emu-empty').hidden = games.length > 0;
    if (!games.length) return;
    games = R.withNotes(games, notes);

    const groups = new Map(Object.keys(R.STATUS).filter(k => k !== 'good').map(k => [k, []]));
    for (const g of games) for (const [kind, words] of R.problemsOf(g)) groups.get(kind)?.push({ title: g.title, system: g.system, words, href: `./?game=${encodeURIComponent(`${g.system}/${g.title}`)}#${g.system}` });
    const withProblems = new Set([...groups.values()].flat().map(x => `${x.system}/${x.title}`));
    // A system with games, or the Xbox's files, whose emulator lacks a file it needs.
    const systems = new Set(games.map(g => g.system));
    for (const [system, emu] of Object.entries(emulators.systems)) {
      if (!systems.has(system)) continue;
      for (const need of R.needsOf(system, emu, bios).filter(x => !x.ok && !x.optional)) {
        groups.get('bios').push({ title: need.label, system,
          words: need.wrong ? `${emu.emulator} needs it, and the file named so is not the right one` : `${emu.emulator} needs it in bios/${system}/`,
          href: 'emulators.html' });
      }
    }
    for (const s of saves.filter(x => !x.game)) {
      groups.get('orphan').push({ title: s.name, system: s.system, words: 'No game on the drive by this name', href: `saves.html?save=${encodeURIComponent(`${s.system}/${s.name}`)}` });
    }
    $('emu-sum').textContent = withProblems.size
      ? `${withProblems.size} of ${games.length} games need a look.`
      : `All ${games.length} games are good.`;
    // to-delete is safe to empty once every converted game plays, and holds nothing unknown.
    const waiting = games.filter(g => g.originals?.length);
    const td = drive?.to_delete;
    $('emu-trash').textContent = td?.files
      ? (groups.get('waiting').length || td.unknown?.length
        ? `to-delete holds ${td.files} files, ${R.size(td.size)}: ${groups.get('waiting').length} of ${waiting.length} converted games are not yet marked as playing${td.unknown?.length ? `, and ${td.unknown.length} files belong to no game` : ''}.`
        : `to-delete holds ${td.files} files, ${R.size(td.size)}, and every game they were converted into plays: it is safe to empty.`)
      : '';

    const out = $('emu-groups');
    out.replaceChildren();
    for (const [kind, rows] of groups) {
      if (!rows.length) continue;
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h2', 'rux--contained-list__label', `${R.STATUS[kind][0]} (${rows.length})`));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      for (const { title, system, words, href } of rows) {
        const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
        const a = el('button', 'rux--contained-list-item__content emu-row');
        a.type = 'button';
        a.addEventListener('click', () => { location.href = href; });
        const main = el('span', 'emu-row__main');
        main.append(el('span', '', title), el('span', 'emu-row__sub', `${R.systemName(system)} · ${words}`));
        a.append(main);
        li.append(a);
        ul.append(li);
      }
      box.append(head, ul);
      out.append(box);
    }
  }
  load();
})();
