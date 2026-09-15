/* ==========================================================================
   account/data.js — the owner's Access table
   --------------------------------------------------------------------------
   Lists every account with a checkbox per app, for the owner only. Home is
   every account's, so it has no column; the other apps come from
   /switcher.json, so a new app gets its column with no code here. A tick
   saves at once through set_account_apps(), which refuses anyone who is not
   the owner. The owner's row is ticked and locked, because the owner opens
   every app. Every value from the database is written with textContent.
   ========================================================================== */
(async () => {
  'use strict';
  const account = window.Rux?.account;
  const section = document.getElementById('acct-access');
  if (!account?.staffProfile || !section) return;

  let staff = null;
  try { staff = await account.staffProfile(); } catch { return; }
  if (!staff?.owner) return;

  const head = document.getElementById('acct-access-head');
  const rows = document.getElementById('acct-access-rows');
  const error = document.getElementById('acct-access-error');
  const errorText = document.getElementById('acct-access-error-text');
  const say = text => { errorText.textContent = text || ''; error.hidden = !text; };
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  section.hidden = false;

  // An app's key is its folder, the name set_account_apps() stores.
  let apps;
  try {
    const list = (await (await fetch('/switcher.json', { cache: 'no-store' })).json()).apps;
    apps = list.filter(a => a.path !== '/').map(a => ({ key: a.path.replace(/^\/|\/$/g, ''), name: a.name }));
  } catch {
    say("The app list didn't load. Reload the page to try again.");
    return;
  }

  const { data: accounts, error: listError } = await account.client.rpc('list_accounts');
  if (listError) {
    say("The accounts didn't load. Reload the page to try again.");
    return;
  }

  for (const app of apps) {
    const th = el('th');
    th.scope = 'col';
    th.append(el('div', 'rux--table-header-label', app.name));
    head.append(th);
  }

  accounts.forEach((acct, row) => {
    const name = acct.display_name || acct.login;
    const tr = el('tr');
    tr.append(el('td', null, acct.owner ? `${name} (owner)` : name), el('td', null, acct.login));

    const ticked = new Set(acct.apps || []);
    const boxes = apps.map((app, col) => {
      const td = el('td', 'rux--table-column-checkbox');
      const wrap = el('div', 'rux--checkbox--inline');
      const input = el('input', 'rux--checkbox');
      input.type = 'checkbox';
      input.id = `acct-access-${row}-${col}`;
      input.dataset.app = app.key;
      input.checked = acct.owner || ticked.has(app.key);
      input.disabled = acct.owner;
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = input.id;
      label.append(el('span', 'rux--visually-hidden', `${app.name} for ${name}`));
      wrap.append(input, label);
      td.append(wrap);
      tr.append(td);
      return input;
    });

    // A row's boxes lock while its save runs, then show what the database
    // holds: the saved list, or the list from before when the save failed.
    if (!acct.owner) {
      for (const input of boxes) {
        input.addEventListener('change', async () => {
          const wanted = boxes.filter(b => b.checked).map(b => b.dataset.app);
          for (const b of boxes) b.disabled = true;
          say('');
          const { data, error: saveError } = await account.client.rpc('set_account_apps', { target: acct.id, new_apps: wanted });
          if (saveError) say(`${name}'s access didn't save. Try again.`);
          else { ticked.clear(); for (const key of data || []) ticked.add(key); }
          for (const b of boxes) { b.checked = ticked.has(b.dataset.app); b.disabled = false; }
        });
      }
    }
    rows.append(tr);
  });
})();
