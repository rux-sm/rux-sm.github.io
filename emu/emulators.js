/* ==========================================================================
   emulators.js — the Emulators page
   --------------------------------------------------------------------------
   One profile per emulator, from emulators.json, each a fold with the same
   parts in the same order: the systems it plays; the version Supabase
   holds, the newest its project has out as Update last asked, and each
   Mac's, with Install where this Mac lacks that version, which Rux Emu
   Helper does from Supabase, and Remove where this Mac has it, which keeps
   its saves and settings in Supabase and moves it to the Trash; each file it needs and whether Supabase holds it; every kind of file it writes, where that sits on a Mac, the
   setting that moves it and what becomes of it; the settings to have, with
   each Mac's backups of its settings in Supabase and the preferred set; and
   what is worth knowing. On this Mac, through the helper, its settings are
   backed up, a backup put back, the set here kept as preferred, and the
   preferred set taken: what is here is backed up first, and the settings
   Emu manages are written over what arrives. ES-DE, the library, is the last profile.
   A profile is addressed as #<name>, as Status links to it, and opens there.
   Each Mac is as Update last saved it, and this one live from Rux Emu
   Helper when it runs here. A version is the one the helper's receipt names
   where it installed the app, else the app's own, which three do not say. Whether each Mac's saves are where they should
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

  // SETTINGS IN SUPABASE. `kept` is every copy, from data.js; `said` what a
  // step just did, shown in that emulator's profile once the page is read again.
  let kept = new Map();
  let said = null;
  const copiesOf = (owner, name) => kept.get(`${owner}/${name}`) ?? [];
  const same = (a, b) => a.length === b.length && a.every(f => b.some(g => g.rel === f.rel && g.sha1 === f.sha1));
  const filesOf = n => `${n} ${n === 1 ? 'file' : 'files'}`;
  // A copy's moment to the second, since two may be made in one minute.
  const moment = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const sha1Of = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');

  // This Mac's settings for an emulator, as the helper reads them now.
  async function mine(name) {
    const out = await R.helper.settings(name);
    if (!out) throw new Error('Rux Emu Helper on this Mac is too old for this: Status has the newest.');
    return out;
  }
  // This Mac's settings kept as a new copy, for itself or as preferred,
  // unless the newest copy there is the same: whether one was made. Each
  // file is checked against its fingerprint as it is read.
  async function keep(name, owner, mac) {
    const here = await mine(name);
    if (!here.files.length) throw new Error(here.home ? `${name} has no settings on this Mac yet.` : `Open ${name} once on this Mac first, so it makes its settings.`);
    if (same(here.files, copiesOf(owner, name)[0]?.files ?? [])) return false;
    await R.data.keepSettings(owner, name, here.files, async f => {
      const bytes = await R.helper.setting(name, f.rel);
      if (await sha1Of(bytes) !== f.sha1) throw new Error(`${f.rel} changed as it was read. Try again.`);
      return bytes;
    }, mac);
    // Read again at once, so a step that stops after this still compares with what is kept.
    kept = await R.data.settings();
    return true;
  }
  // A copy written on this Mac: what is here backed up first, each file put
  // in its place, then the settings Emu manages set over them. A file here
  // that the copy lacks stays. The copy's bytes are read before that backup,
  // which as a sixth copy drops the oldest, and that may be the one put back.
  async function put(name, copy, mac) {
    const here = await mine(name);
    if (here.running) throw new Error(`Quit ${name} first: it writes its settings as it quits.`);
    const files = [];
    for (const f of copy.files) files.push([f.rel, await R.data.fileBytes(f.sha1)]);
    if (here.files.length) await keep(name, mac, mac);
    for (const [rel, bytes] of files) await R.helper.putSetting(name, rel, bytes);
    const { left } = await R.helper.manage(name);
    return left.length ? ` The helper could not place these in ${name}'s settings file, so set them by hand: ${left.join(', ')}.` : '';
  }

  // An emulator's settings in Supabase, in its profile: when each Mac last
  // backed them up and where the preferred set came from; and for this Mac,
  // read live, the steps and its copies to put back.
  function backups(name, macs) {
    const preferred = copiesOf('preferred', name)[0] ?? null;
    const nodes = [facts([
      ...macs.map(m => [`${m.name}${m.live ? ' · this Mac' : ''}`,
        copiesOf(m.name, name)[0] ? `Backed up ${R.when(copiesOf(m.name, name)[0].at)}` : 'Not backed up yet']),
      ['Preferred', preferred ? `From ${preferred.mac ?? 'a Mac'}, ${R.when(preferred.at)}` : 'None kept yet'],
    ])];
    const here = macs.find(m => m.live)?.name;
    if (!here) return nodes;
    const status = el('p', 'rux--type-body-01');
    status.setAttribute('role', 'status');
    if (said?.name === name) { status.textContent = said.text; said = null; }
    const buttons = [];
    // One step at a time: every button waits, and the page is read again with this profile open.
    const step = (label, doing, run, cls = 'rux--btn--tertiary') => {
      const b = el('button', `rux--btn ${cls} rux--btn--sm rux--layout--size-sm`, label);
      b.type = 'button';
      buttons.push(b);
      b.addEventListener('click', async () => {
        for (const x of buttons) x.disabled = true;
        status.textContent = doing;
        try {
          said = { name, text: await run() };
          history.replaceState(null, '', `#${R.slug(name)}`);
          await load();
        } catch (error) { status.textContent = error.message; for (const x of buttons) x.disabled = false; }
      });
      return b;
    };
    const row = el('div', 'emu-actions');
    row.append(
      step('Back up this Mac', 'Backing up…', async () => (await keep(name, here, here) ? 'Backed up.' : 'Nothing has changed since the last backup.')),
      step('Keep as preferred', 'Keeping…', async () => {
        await keep(name, here, here);
        return await keep(name, 'preferred', here) ? 'This Mac\u2019s settings are now the preferred set.' : 'The preferred set is already this.';
      }));
    if (preferred) row.append(step('Take preferred', 'Taking the preferred set…', async () => `This Mac now has the preferred set.${await put(name, preferred, here)}`));
    nodes.push(row);
    const copies = copiesOf(here, name);
    if (copies.length) {
      const box = el('div', 'rux--contained-list rux--layout--size-lg');
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      ul.setAttribute('aria-label', `This Mac's backups of ${name}'s settings`);
      for (const c of copies) {
        const li = el('li', 'rux--contained-list-item');
        const content = el('div', 'rux--contained-list-item__content emu-row');
        const main = el('span', 'emu-row__main');
        main.append(el('span', '', moment(c.at)), el('span', 'emu-row__sub', filesOf(c.files.length)));
        const b = step('Put back', 'Putting it back…', async () => `The backup of ${moment(c.at)} is back on this Mac.${await put(name, c, here)}`, 'rux--btn--ghost');
        b.setAttribute('aria-label', `Put back the backup of ${moment(c.at)}`);
        content.append(main, b);
        li.append(content);
        ul.append(li);
      }
      box.append(ul);
      nodes.push(box);
    }
    nodes.push(status);
    return nodes;
  }

  // Install, under an emulator's versions: the installer Supabase holds put
  // on this Mac by the helper, then the page read again with that profile open.
  function installerRow(name, file, version, label) {
    const row = el('div', 'emu-actions');
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    const b = el('button', 'rux--btn rux--btn--tertiary rux--btn--sm rux--layout--size-sm', label);
    b.type = 'button';
    b.addEventListener('click', async () => {
      b.disabled = true;
      said.textContent = `Installing ${name}: the helper is fetching ${R.size(file.size)} from Supabase…`;
      try {
        const out = await R.helper.install(name, file, version);
        if (!out) throw new Error('Rux Emu Helper on this Mac is too old to install: Status has the newest.');
        history.replaceState(null, '', `#${R.slug(name)}`);
        await load();
      } catch (error) { said.textContent = error.message; b.disabled = false; }
    });
    row.append(b);
    return [row, said];
  }

  // Remove, under an emulator's versions: what would go said first, with
  // Remove and Cancel; Remove keeps its saves and settings in Supabase, then
  // the helper moves the app and its folders to the Trash.
  function removeRow(name) {
    const row = el('div', 'emu-actions');
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    const button = (label, kind) => { const b = el('button', `rux--btn ${kind} rux--btn--sm rux--layout--size-sm`, label); b.type = 'button'; return b; };
    const ask = button('Remove from this Mac', 'rux--btn--danger--ghost');
    const yes = button('Remove', 'rux--btn--danger');
    const no = button('Cancel', 'rux--btn--ghost');
    const asking = on => { ask.hidden = on; yes.hidden = !on; no.hidden = !on; };
    asking(false);
    ask.addEventListener('click', async () => {
      ask.disabled = true;
      try {
        const r = await R.helper.removal(name);
        if (!r) throw new Error('Rux Emu Helper on this Mac is too old to remove an emulator: Status has the newest.');
        if (r.running) throw new Error(`Quit ${name} first.`);
        const rest = r.rest
          ? ` ${r.rest} of those files, ${R.size(r.restSize)}, are not in Supabase, such as caches and logs, and will not come back.`
          : '';
        said.textContent = `Its saves and settings go to Supabase first. Then ${name} and its folders go to the Trash: ${r.files} files, ${R.size(r.size)}.${rest}`;
        asking(true);
      } catch (error) { said.textContent = error.message; }
      ask.disabled = false;
    });
    no.addEventListener('click', () => { said.textContent = ''; asking(false); });
    yes.addEventListener('click', async () => {
      yes.disabled = no.disabled = true;
      said.textContent = `Keeping ${name}'s saves and settings in Supabase…`;
      try {
        await R.carry.remove(name);
        history.replaceState(null, '', `#${R.slug(name)}`);
        await load();
      } catch (error) { said.textContent = error.message; yes.disabled = no.disabled = false; }
    });
    row.append(ask, yes, no);
    return [row, said];
  }

  // One emulator's profile. `on(mac)` is this app as a Mac reported it, and
  // `needs` its files by system. `installs` is false for the library, which
  // the helper neither installs nor backs up.
  function profile({ name, rule, systems, why, saves, needs, on, installs = true }, { macs, drive, files }) {
    const installer = R.installerOf(files, name);
    const kept = R.keptVersion(installer);
    // The newest its project has out, as Update last asked; a rolling build's is never a to-do.
    const out = drive?.newest?.[name] ? R.plainVersion(drive.newest[name]) : null;
    const newer = out && kept && out !== kept && !rule.feed?.rolling;
    const says = rule.reportsVersion !== false;
    // A Mac's version is known from the helper's receipt, or from an app that says its own.
    const stands = macs.map(mac => {
      const app = on(mac);
      const known = app && (app.receipt || says) ? app.version ?? null : null;
      return { mac, app, known };
    });
    const behind = s => Boolean(s.known && kept && R.plainVersion(s.known) !== kept);
    const differs = stands.filter(behind).length;

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

    const version = [facts([
      ['In Supabase', installer ? `${kept ?? 'A build'} · ${installer.name}` : 'No installer for it yet'],
      ['Newest out', out ? `${out}${rule.feed?.rolling ? ' · a new build every few days' : ''}`
        : rule.feed ? 'Not asked yet: Update asks its project' : 'Not followed: it is a development build'],
      ...stands.map(s => [`${s.mac.name}${s.mac.live ? ' · this Mac' : ''}`,
        !s.app ? 'Not installed' : s.known ? `${s.known}${s.app.receipt ? ' · installed by the helper' : ''}`
          : says ? 'Installed' : 'Installed; the app does not say its version']),
    ])];
    // This Mac, read live, takes Supabase's version where it has none, another, or one nobody can name.
    const mine = stands.find(s => s.mac.live);
    if (installs && mine && installer && kept && (!mine.app || !mine.known || behind(mine))) {
      version.push(...installerRow(name, installer, kept, !mine.app ? `Install ${kept} on this Mac` : `Install ${kept} in its place`));
    }
    if (installs && mine?.app && R.carry) version.push(...removeRow(name));
    parts.push(part('Version', ...version));

    const need = el('div', 'emu-tags');
    if (!needs.length) need.append(tag(['Nothing', 'rux--tag--green'], true));
    for (const n of needs) {
      const [word, cls] = n.ok ? ['', 'rux--tag--green']
        : n.wrong ? [': not the right file', 'rux--tag--red']
        : n.optional ? [': optional', 'rux--tag--gray'] : [': missing', 'rux--tag--red'];
      need.append(tag([`${n.label}${word}`, cls], true));
    }
    parts.push(part('Needs', need));

    // Its folder as this Mac has it, read live, else the first it may use.
    const home = macs.find(m => m.live)?.emulators?.find(e => e.emulator === name)?.data ?? rule.homes?.[0];
    const places = (rule.places ?? []).map((p, i) => {
      // Where each Mac has this place: its setting or its default, and how many files it holds.
      const each = macs.map(mac => {
        const at = on(mac) && mac.emulators?.find(e => e.emulator === name)?.places?.[i];
        return at ? `${mac.name}: ${at.dir || 'beside the game'}, ${at.files ?? 0} ${at.files === 1 ? 'file' : 'files'}` : null;
      }).filter(Boolean);
      return [p.kind, [where({ ...p, besideGame: !p.path && rule.besideGame }), ...each].join('\n'), BECOMES.shared];
    });
    const others = (rule.files ?? []).map(f => [f.kind, where(f), BECOMES[f.class]]);
    parts.push(part('Files',
      facts([['Its folder on a Mac', home ?? 'None of its own'],
        ...(saves ? [['In the collection', saves]] : [])]),
      rows([...places, ...others])));

    const config = rule.config?.file ?? rule.config;
    const manages = rule.manages ?? [];
    parts.push(part('Settings',
      facts([['Its settings file', config ? `${home}/${config}` : home ?? 'None']]),
      ...(manages.length ? [rows(manages.map(m => [`${m.key} = ${m.value === '' ? 'empty' : m.value.replace('{home}', home ?? '')}`, m.why]))] : []),
      ...(installs ? backups(name, macs) : [])));

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
    let emulators, files, drive, games, saved, live;
    try {
      [emulators, files, drive, games, saved, live, kept] = await Promise.all([R.emulators(), R.data.files(), R.data.drive(),
        R.data.gameKeys(), R.data.macs(), R.helper.onMac ? R.helper.mac() : null, R.data.settings()]);
    } catch (error) { console.error(error); R.notice('Emu could not read the emulators. Try again.'); return; }
    $('emu-empty').hidden = Boolean(drive);
    // This Mac, read now, stands in for its last report.
    const here = live && { name: live.mac, frontend: live.frontend, emulators: live.emulators, live: true };
    const macs = [...saved.filter(m => m.name !== here?.name), ...(here ? [here] : [])].sort((a, b) => a.name.localeCompare(b.name));
    const count = new Map();
    for (const g of games) count.set(g.system, (count.get(g.system) ?? 0) + 1);
    // The BIOS, keys and firmware among the files, each by its name under bios/.
    const bios = files.filter(f => f.path.startsWith('bios/')).map(f => ({ name: f.path.slice('bios/'.length), sha1: f.sha1 }));
    const all = { macs, drive, files };
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
      on: mac => mac.frontend?.app ?? null, installs: false,
    }, all));
    $('emu-profiles').replaceChildren(R.folds(items));
    show();
  }
  load();
  window.addEventListener('hashchange', show);
})();
