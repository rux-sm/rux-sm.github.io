/* ==========================================================================
   emulators.js — the Emulators page
   --------------------------------------------------------------------------
   One profile per emulator, from emulators.json, each a fold with the same
   parts in the same order: the systems it plays; its version on the drive,
   the newest its project has out as Update last asked, and each Mac's; each file it needs and whether the drive's bios folder
   holds it; every kind of file it writes, where that sits on a Mac, the
   setting that moves it and what becomes of it; the settings to have; and
   what is worth knowing. ES-DE, the library, is the last profile.
   A profile is addressed as #<name>, as Status links to it, and opens there.
   Each Mac is as Update last saved it, and this one live from Rux Emu
   Helper when it runs here. Whether each Mac's saves are where they should
   be is the Status page's.
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
  // What becomes of a file, by its class in emulators.json. Screenshots and
  // a Mac's own settings stay on the Mac, as nothing carries them yet.
  const BECOMES = {
    shared: ['A save', 'rux--tag--green'], provided: ['From the collection', 'rux--tag--blue'],
    own: ['This Mac\'s settings', 'rux--tag--gray'], collected: ['Stays on this Mac', 'rux--tag--gray'],
    local: ['Stays on this Mac', 'rux--tag--gray'],
  };

  const heading = text => el('h3', 'rux--type-heading-02', text);
  const part = (title, ...nodes) => { const s = el('section', 'rux--stack-vertical rux--stack-scale-4'); s.append(heading(title), ...nodes); return s; };
  // Facts side by side: a label over each value.
  function facts(pairs) {
    const dl = el('dl', 'emu-facts emu-facts--row');
    for (const [k, v] of pairs) { const wrap = el('div'); wrap.append(el('dt', '', k), el('dd', '', v)); dl.append(wrap); }
    return dl;
  }
  // Rows in a list: a thing, what is true of it under it, and a tag beside it.
  function rows(list) {
    const box = el('div', 'rux--contained-list rux--layout--size-lg');
    const ul = el('ul');
    ul.setAttribute('role', 'list');
    for (const [what, detail, state] of list) {
      const li = el('li', 'rux--contained-list-item');
      const content = el('div', 'rux--contained-list-item__content emu-row');
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', what), el('span', 'emu-row__sub emu-files', detail));
      content.append(main);
      if (state) { const beside = el('span', 'emu-state'); beside.append(tag(state, true)); content.append(beside); }
      li.append(content);
      ul.append(li);
    }
    box.append(ul);
    return box;
  }

  // Where a file sits on a Mac, and the setting that moves it.
  const where = f => `${f.besideGame ? 'Beside the game' : f.path ? `In ${f.path}` : 'Wherever its setting says'} · ${f.key ? `moved by ${f.key}` : 'no setting moves it'}`;

  // One emulator's profile. `on(mac)` is this app as a Mac reported it, and `needs` its files by system.
  function profile({ name, rule, systems, why, saves, needs, on }, { macs, drive }) {
    const installer = R.installerOf(drive, name);
    const kept = R.keptVersion(installer);
    // The newest its project has out, as Update last asked; a rolling build's is never a to-do.
    const out = drive?.newest?.[name] ? R.plainVersion(drive.newest[name]) : null;
    const newer = out && kept && out !== kept && !rule.feed?.rolling;
    const says = rule.reportsVersion !== false;
    const stands = macs.map(mac => {
      const app = on(mac);
      return { mac, version: !app ? null : says ? app.version ?? 'Installed' : 'Installed' };
    });
    const differs = says && kept ? stands.filter(s => s.version && R.plainVersion(s.version) !== kept).length : 0;

    const title = el('span', 'emu-row__main');
    title.append(el('span', '', name), el('span', 'emu-row__sub', systems.length ? systems.map(R.systemName).join(', ') : 'The library'));
    const tags = el('span', 'emu-tags emu-state');
    if (differs) tags.append(tag([`${differs} ${differs === 1 ? 'Mac differs' : 'Macs differ'}`, 'rux--tag--red'], true));
    if (newer) tags.append(tag([`${out} is out`, 'rux--tag--red'], true));
    tags.append(tag(kept ? [kept, 'rux--tag--gray'] : ['No installer', 'rux--tag--red'], true));

    const parts = [];
    const about = el('ul', 'rux--list--unordered');
    for (const line of why) about.append(el('li', 'rux--list__item', line));
    parts.push(about);

    parts.push(part('Version', facts([
      ['On the drive', installer ? `${kept ?? 'A build'} · ${installer.name}` : 'No installer for it in emulation/emulators/'],
      ['Newest out', out ? `${out}${rule.feed?.rolling ? ' · a new build every few days' : ''}`
        : rule.feed ? 'Not asked yet: Update asks its project' : 'Not followed: the drive keeps a development build'],
      ...stands.map(s => [`${s.mac.name}${s.mac.live ? ' · this Mac' : ''}`,
        s.version === null ? 'Not installed' : says ? s.version : 'Installed; the app does not say its version']),
    ])));

    const need = el('div', 'emu-tags');
    if (!needs.length) need.append(tag(['Nothing', 'rux--tag--green'], true));
    for (const n of needs) {
      const [word, cls] = n.ok ? ['', 'rux--tag--green']
        : n.wrong ? [': not the right file', 'rux--tag--red']
        : n.optional ? [': optional', 'rux--tag--gray'] : [': missing', 'rux--tag--red'];
      need.append(tag([`${n.label}${word}`, cls], true));
    }
    parts.push(part('Needs', need));

    const home = rule.homes?.[0];
    const places = (rule.places ?? []).map((p, i) => {
      // Where each Mac has this place: its setting or its default, and how many files it holds.
      const each = macs.map(mac => {
        const at = on(mac) && mac.emulators?.find(e => e.emulator === name)?.places?.[i];
        return at ? `${mac.name}: ${at.dir || 'beside the game'}, ${at.files ?? 0} ${at.files === 1 ? 'file' : 'files'}` : null;
      }).filter(Boolean);
      return [p.kind, [where({ ...p, besideGame: !p.path && rule.besideGame }), ...each].join('\n'), BECOMES.shared];
    });
    const files = (rule.files ?? []).map(f => [f.kind, where(f), BECOMES[f.class]]);
    parts.push(part('Files',
      facts([['Its folder on a Mac', home ?? 'None of its own'],
        ...(saves ? [['In the collection', saves]] : [])]),
      rows([...places, ...files])));

    const config = rule.config?.file ?? rule.config;
    const manages = rule.manages ?? [];
    parts.push(part('Settings',
      facts([['Its settings file', config ? `${home}/${config}` : home ?? 'None']]),
      ...(manages.length ? [rows(manages.map(m => [`${m.key} = ${m.value === '' ? 'empty' : m.value}`, m.why]))] : [])));

    const notes = el('ul', 'rux--list--unordered');
    for (const n of rule.notes ?? []) notes.append(el('li', 'rux--list__item', n));
    if (rule.notes?.length) parts.push(part('Worth knowing', notes));

    const id = R.slug(name);
    const item = R.fold([title, tags], parts, { id: `${id}-profile`, open: location.hash === `#${id}` });
    item.id = id;
    item.classList.add('emu-profile');
    return item;
  }

  // The profile the address names, opened and brought into view.
  function show() {
    const item = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (!item?.matches('.rux--accordion__item')) return;
    window.Rux.accordion.open(item);
    item.scrollIntoView({ block: 'start' });
  }

  async function load() {
    let emulators, bios, drive, games, saved, live;
    try {
      [emulators, bios, drive, games, saved, live] = await Promise.all([R.emulators(), R.data.bios(), R.data.drive(),
        R.data.gameKeys(), R.data.macs(), R.helper.onMac ? R.helper.mac() : null]);
    } catch (error) { console.error(error); R.notice('Emu could not read the emulators. Try again.'); return; }
    $('emu-empty').hidden = Boolean(drive);
    // This Mac, read now, stands in for its last report.
    const here = live && { name: live.mac, frontend: live.frontend, emulators: live.emulators, live: true };
    const macs = [...saved.filter(m => m.name !== here?.name), ...(here ? [here] : [])].sort((a, b) => a.name.localeCompare(b.name));
    const count = new Map();
    for (const g of games) count.set(g.system, (count.get(g.system) ?? 0) + 1);
    const all = { macs, drive };
    const gamesOf = n => (n ? `${n} ${n === 1 ? 'game' : 'games'}` : 'no games yet');

    const items = Object.entries(emulators.macSaves).map(([name, rule]) => {
      const systems = Object.keys(emulators.systems).filter(s => emulators.systems[s].emulator === name);
      const first = emulators.systems[systems[0]];
      return profile({
        name, rule, systems,
        why: systems.map(s => `${R.systemName(s)}, ${gamesOf(count.get(s))}. ${emulators.systems[s].why}`),
        // An emulator keeps one save folder in the collection, named for the first system it plays.
        saves: `saves/${systems[0]}/, ${SAVES[first.saves]}`,
        needs: systems.flatMap(s => R.needsOf(s, emulators.systems[s], bios)),
        on: mac => mac.emulators?.find(e => e.emulator === name)?.app ?? null,
      }, all);
    });
    const f = emulators.frontend;
    items.push(profile({
      name: f.name, rule: { ...f, homes: [f.settings] }, systems: [], why: [f.why], saves: null, needs: [],
      on: mac => mac.frontend?.app ?? null,
    }, all));
    $('emu-profiles').replaceChildren(R.folds(items));
    show();
  }
  load();
  window.addEventListener('hashchange', show);
})();
