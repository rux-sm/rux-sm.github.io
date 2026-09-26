/* ==========================================================================
   rules.js — the Rules page
   --------------------------------------------------------------------------
   Every rule the household has, in the order they are tried: a line takes
   the first rule whose text its description contains. Each shows what it
   matches, the name, kind and category it gives, and how many saved lines
   contain its text. A rule is added or changed in the side panel, and saving
   sorts every saved line it fits, as every later import will be. Deleting a
   rule leaves the lines it sorted as they are.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const KIND = { trade: 'Bought or earned', fee: 'Fee', 'own-transfer': 'Own transfer', 'card-payment': 'Card payment', household: 'Between us' };

  let rules = [], counts = new Map(), household = null, open = null, release = null, opener = null;

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const nice = s => String(s || '').toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const gives = r => [r.merchant && `named ${nice(r.merchant)}`, r.kind && KIND[r.kind], r.category].filter(Boolean).join(' · ') || 'Nothing yet';
  const status = text => { $('coins-status').textContent = text; $('coins-status-wrap').hidden = !text; };

  function draw() {
    $('coins-none').hidden = rules.length > 0;
    $('coins-count').textContent = rules.length === 1 ? '1 rule' : `${rules.length} rules`;
    $('coins-rows').replaceChildren(...rules.map((r, i) => {
      const tr = el('tr', 'coins-line'); tr.tabIndex = 0; tr.dataset.id = r.id;
      tr.append(el('td', '', String(i + 1)), el('td', 'coins-code', r.match), el('td', '', r.merchant ? nice(r.merchant) : ''),
        el('td', '', r.kind ? KIND[r.kind] : ''), el('td', '', r.category), el('td', 'coins-amount', counts.has(r.id) ? String(counts.get(r.id)) : '…'));
      return tr;
    }));
    $('coins-list').replaceChildren(...rules.map(r => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content coins-row'); b.type = 'button'; b.dataset.id = r.id;
      const main = el('span', 'coins-row__main'); main.append(el('span', 'coins-row__title coins-code', r.match), el('span', 'coins-row__sub', gives(r)));
      const side = el('span', 'coins-row__side'); side.append(el('span', 'coins-amount', counts.has(r.id) ? `${counts.get(r.id)} lines` : ''));
      b.append(main, side); li.append(b);
      return li;
    }));
    $('coins-list-wrap').hidden = !rules.length;
    $('coins-table-wrap').hidden = !rules.length;
  }

  // How many lines each rule's text is in, filled in as they arrive.
  async function count() {
    await Promise.all(rules.map(async r => { counts.set(r.id, await C.data.ruleLines(r.match)); draw(); }));
  }

  // ---------- The panel
  const panel = $('coins-panel');
  function openRule(id, from) {
    const r = id ? rules.find(x => x.id === id) : null;
    if (id && !r) return;
    open = r; opener = from;
    $('coins-panel-title').textContent = r ? r.match : 'Add a rule';
    $('coins-r-match').value = r?.match ?? '';
    $('coins-r-merchant').value = r?.merchant ? nice(r.merchant) : '';
    $('coins-r-kind').value = r?.kind ?? '';
    $('coins-r-category').value = r?.category ?? '';
    $('coins-r-delete').hidden = !r;
    delete $('coins-r-delete').dataset.sure;
    $('coins-r-delete').textContent = 'Delete';
    panel.hidden = false;
    panel.classList.add('rux--side-panel--open');
    $('coins-r-match').focus();
    release = window.Rux?.overlay?.register({ element: panel, close: () => closePanel(), dismissOn: { outside: true, escape: true } })?.release ?? null;
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove('rux--side-panel--open');
    panel.hidden = true;
    release?.(); release = null; open = null;
    opener?.focus?.();
  }
  $('coins-panel-close').addEventListener('click', closePanel);
  $('coins-r-cancel').addEventListener('click', closePanel);
  $('coins-add').addEventListener('click', e => openRule(null, e.currentTarget));

  $('coins-r-form').addEventListener('submit', async e => {
    e.preventDefault();
    const match = $('coins-r-match').value.trim().toUpperCase();
    if (match.length < 3) return C.notice('A rule needs at least three letters to match.');
    const merchant = $('coins-r-merchant').value.trim().toUpperCase(), kind = $('coins-r-kind').value || null, category = $('coins-r-category').value.trim();
    if (!merchant && !kind && !category) return C.notice('Give the rule a name, a kind or a category to set.');
    const save = $('coins-r-save'); save.disabled = true;
    try {
      const { rule, changed } = await C.data.saveRule({
        ...(open ? { id: open.id } : { household_id: household, sort: rules.length }),
        match, merchant, kind, category,
      });
      rules = open ? rules.map(r => r.id === rule.id ? rule : r) : [...rules, rule];
      counts.delete(rule.id);
      C.notice();
      closePanel();
      draw();
      status(`The rule sorted ${changed === 1 ? '1 line' : `${changed} lines`}.`);
      counts.set(rule.id, await C.data.ruleLines(rule.match)); draw();
    } catch (error) { fail(error); }
    save.disabled = false;
  });
  $('coins-r-delete').addEventListener('click', async () => {
    const b = $('coins-r-delete');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Delete it; its lines stay sorted'; return; }
    try { await C.data.deleteRule(open.id); rules = rules.filter(r => r.id !== open.id); closePanel(); draw(); status('The rule is deleted. The lines it sorted keep their names and categories.'); }
    catch (error) { fail(error); }
  });

  const pick = e => { const t = e.target.closest('[data-id]'); if (t) openRule(t.dataset.id, t); };
  $('coins-rows').addEventListener('click', pick);
  $('coins-rows').addEventListener('keydown', e => { if (e.key === 'Enter') pick(e); });
  $('coins-list').addEventListener('click', pick);

  (async () => {
    const option = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    $('coins-r-kind').replaceChildren(option('', 'Leave as it is'), ...Object.entries(KIND).map(([k, t]) => option(k, t)));
    const [people, list] = await Promise.all([C.data.people(), C.data.rules()]);
    household = people[0]?.household_id;
    rules = list;
    draw();
    await count();
  })().catch(fail);
})();
