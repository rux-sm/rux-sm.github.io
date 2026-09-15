/* ==========================================================================
   account/data.js — the owner's Access table
   --------------------------------------------------------------------------
   Lists every account with a checkbox per app, for the owner only. Home is
   every account's, so it has no column; the other apps come from
   /switcher.json, so a new app gets its column with no code here.

   Ticks wait for Save. A save that takes access away first lists every change
   in a dialog to confirm, because removing Scheduler logs that person out of
   the scheduler at once. Each changed account is saved through
   set_account_apps(), which refuses anyone who is not the owner. The owner's
   row is ticked and locked, because the owner opens every app. Every value
   from the database is written with textContent.
   ========================================================================== */
(async () => {
  'use strict';
  const account = window.Rux?.account;
  const section = document.getElementById('acct-access');
  if (!account?.staffProfile || !section) return;

  let staff = null;
  try { staff = await account.staffProfile(); } catch { return; }
  if (!staff?.owner) return;

  const $ = id => document.getElementById(id);
  const head = $('acct-access-head');
  const rows = $('acct-access-rows');
  const actions = $('acct-access-actions');
  const saveBtn = $('acct-access-save');
  const discardBtn = $('acct-access-discard');
  const dialog = $('acct-access-confirm');
  const changeList = $('acct-access-changes');
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };
  const note = (id, text) => { $(`${id}-text`).textContent = text || ''; $(id).hidden = !text; };
  const sayError = text => note('acct-access-error', text);
  const saySaved = text => note('acct-access-saved', text);

  section.hidden = false;

  // An app's key is its folder, the name set_account_apps() stores.
  let apps;
  try {
    const list = (await (await fetch('/switcher.json', { cache: 'no-store' })).json()).apps;
    apps = list.filter(a => a.path !== '/').map(a => ({ key: a.path.replace(/^\/|\/$/g, ''), name: a.name }));
  } catch {
    sayError("The app list didn't load. Reload the page to try again.");
    return;
  }
  const visible = new Set(apps.map(a => a.key));

  const { data: accounts, error: listError } = await account.client.rpc('list_accounts');
  if (listError) {
    sayError("The accounts didn't load. Reload the page to try again.");
    return;
  }

  for (const app of apps) {
    const th = el('th');
    th.scope = 'col';
    th.append(el('div', 'rux--table-header-label', app.name));
    head.append(th);
  }

  // Every account the owner can change: its name, its saved apps and its boxes.
  const people = [];
  accounts.forEach((acct, row) => {
    const name = acct.display_name || acct.login;
    const tr = el('tr');
    tr.append(el('td', null, acct.owner ? `${name} (owner)` : name), el('td', null, acct.login));
    const saved = new Set(acct.apps || []);
    const boxes = apps.map((app, col) => {
      const td = el('td', 'rux--table-column-checkbox');
      const wrap = el('div', 'rux--checkbox--inline');
      const input = el('input', 'rux--checkbox');
      input.type = 'checkbox';
      input.id = `acct-access-${row}-${col}`;
      input.dataset.app = app.key;
      input.checked = acct.owner || saved.has(app.key);
      input.disabled = acct.owner;
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = input.id;
      label.append(el('span', 'rux--visually-hidden', `${app.name} for ${name}`));
      wrap.append(input, label);
      td.append(wrap);
      tr.append(td);
      return input;
    });
    rows.append(tr);
    if (!acct.owner) people.push({ id: acct.id, name, saved, boxes });
  });

  const nameOf = key => apps.find(a => a.key === key)?.name ?? key;
  const joined = keys => {
    const names = keys.map(nameOf);
    return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  };

  // Each account whose ticks differ from what is saved, with what it adds and
  // removes. Apps no longer in switcher.json have no box, so they are kept.
  const changes = () => people.map(person => {
    const ticked = new Set(person.boxes.filter(b => b.checked).map(b => b.dataset.app));
    return {
      person,
      apps: [...ticked, ...[...person.saved].filter(k => !visible.has(k))],
      added: apps.map(a => a.key).filter(k => ticked.has(k) && !person.saved.has(k)),
      removed: apps.map(a => a.key).filter(k => !ticked.has(k) && person.saved.has(k)),
    };
  }).filter(c => c.added.length || c.removed.length);

  const sentence = c => {
    const parts = [];
    if (c.added.length) parts.push(`add ${joined(c.added)}`);
    if (c.removed.length) parts.push(`remove ${joined(c.removed)}`);
    const line = `${c.person.name}: ${parts.join(', ')}.`;
    return c.removed.includes('scheduler') ? `${line} They will be logged out of the scheduler.` : line;
  };

  const refresh = () => { actions.hidden = changes().length === 0; };
  const lock = on => {
    for (const person of people) for (const box of person.boxes) box.disabled = on;
    saveBtn.disabled = on;
    discardBtn.disabled = on;
  };

  for (const person of people) {
    for (const box of person.boxes) {
      box.addEventListener('change', () => { sayError(''); saySaved(''); refresh(); });
    }
  }

  discardBtn.addEventListener('click', () => {
    for (const person of people) for (const box of person.boxes) box.checked = person.saved.has(box.dataset.app);
    sayError('');
    refresh();
  });

  // Saves each changed account in turn. A saved account shows what the
  // database returned; a failed one keeps its ticks, so Save can try again.
  const saveAll = async () => {
    const list = changes();
    if (!list.length) return;
    lock(true);
    sayError('');
    saySaved('');
    const failed = [];
    for (const c of list) {
      const { data, error } = await account.client.rpc('set_account_apps', { target: c.person.id, new_apps: c.apps });
      if (error) { failed.push(c.person.name); continue; }
      c.person.saved = new Set(data || []);
      for (const box of c.person.boxes) box.checked = c.person.saved.has(box.dataset.app);
    }
    lock(false);
    refresh();
    if (failed.length) sayError(`Access didn't save for ${failed.join(', ')}. Try again.`);
    else saySaved('Access saved.');
  };

  saveBtn.addEventListener('click', () => {
    const list = changes();
    if (!list.length) return;
    if (!list.some(c => c.removed.length)) { saveAll(); return; }
    changeList.replaceChildren(...list.map(c => el('li', 'rux--list__item', sentence(c))));
    window.Rux?.modal?.open?.(dialog, saveBtn);
  });

  $('acct-access-confirm-save').addEventListener('click', () => {
    window.Rux?.modal?.close?.(dialog);
    saveAll();
  });

  // The browser's own warning covers leaving with unsaved ticks.
  window.addEventListener('beforeunload', e => {
    if (changes().length) { e.preventDefault(); e.returnValue = ''; }
  });
})();
