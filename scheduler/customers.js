/* ==========================================================================
   customers.js — THE CUSTOMERS PAGE
   --------------------------------------------------------------------------
   customers.html lists every customer. customers.html?id=<customer id> edits
   one and customers.html?new makes one. They read and write `customers`.

   A customer is who pays: a name, spelled as QuickBooks spells it, a usual
   pickup picked from the saved locations, and a bill-to address only when
   bills go somewhere else. The address itself lives on the location, so it is
   typed once. Contacts link to a customer from their own page, and a customer
   a contact or a trip names is never deleted.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse } = window.SchedulerPair;
  const showPhone = window.SchedulerPhone.format;
  const pair = window.SchedulerPair.page({ list: 'customers', one: 'customer' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const customerId = params.get('id');
  const editing = !!customerId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-customers-h').hidden = true;

  const COLUMNS = 'id,name,usual_location_id,bill_to,updated_at';
  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  let client = null;

  // ── reading ─────────────────────────────────────────────────────────────
  const readCustomers = async () => {
    const { data, error } = await client.from('customers').select(COLUMNS).order('name');
    if (error) throw error;
    return data || [];
  };
  const readLocations = async () => {
    const { data, error } = await client.from('locations').select('id,name,address').order('name');
    if (error) throw error;
    return data || [];
  };
  // Each customer's contacts, by customer id.
  const readContacts = async () => {
    const { data, error } = await client.from('contacts').select('id,name,phone,email,customer_id')
      .not('customer_id', 'is', null).order('name');
    if (error) throw error;
    const map = new Map();
    for (const c of data || []) {
      if (!map.has(c.customer_id)) map.set(c.customer_id, []);
      map.get(c.customer_id).push(c);
    }
    return map;
  };

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let customers = [];
  let places = new Map();   // location id → location
  let people = new Map();   // customer id → contacts

  const pickupOf = c => places.get(c.usual_location_id) || null;
  const peopleOf = c => people.get(c.id) || [];
  const byName = (a, b) => folded(a.name).localeCompare(folded(b.name));
  // A customer with no usual pickup sorts after every one with one, A to Z.
  const SORTS = {
    name: byName,
    pickup: (a, b) => {
      const x = pickupOf(a)?.name, y = pickupOf(b)?.name;
      return !x && !y ? 0 : !x ? 1 : !y ? -1 : folded(x).localeCompare(folded(y));
    },
    contacts: (a, b) => peopleOf(a).length - peopleOf(b).length,
  };
  const matches = (c, q) => {
    if (!q) return true;
    const p = pickupOf(c);
    return [c.name, c.bill_to, p?.name, p?.address].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());
  };

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const shown = customers
      .filter(c => matches(c, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byName(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byName(a, b);
      });
    view.count(shown.length, customers.length);

    const body = $('scheduler-customers-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No customers match “${query}”.` : 'No customers yet.');
      td.colSpan = 3;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const c of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = c.id;

      const who = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', c.name);
      link.href = `customers.html?id=${encodeURIComponent(c.id)}`;
      lines.appendChild(link);
      // Where the bills go: the bill-to's first line, or the pickup when
      // there is one. With neither, the quote has no address to print.
      const bill = String(c.bill_to || '').split('\n').map(s => s.trim()).find(Boolean);
      const billing = bill ? `Bills to ${bill}` : pickupOf(c) ? 'Bills to the pickup' : null;
      if (billing) lines.appendChild(el('span', 'scheduler-pair-cell__detail', billing));
      cell.appendChild(lines);
      who.appendChild(cell);

      const where = el('td');
      const p = pickupOf(c);
      if (p) {
        const pl = el('div', 'scheduler-pair-cell__lines');
        pl.append(el('span', null, p.name), el('span', 'scheduler-pair-cell__detail', p.address));
        where.appendChild(pl);
      } else {
        where.appendChild(el('span', 'scheduler-pair-note', 'Not picked'));
      }

      const n = peopleOf(c).length;
      const count = el('td', null, n ? String(n) : '—');
      tr.append(who, where, count);
      body.appendChild(tr);
    }
  }

  // Search, sort and a row's click, which opens its customer.
  const view = pair.table({ sortKey: 'name', draw: drawList });

  async function readAllLists() {
    const [rows, locs, ppl] = await Promise.all([
      readCustomers(),
      readLocations().catch(() => []),
      readContacts().catch(() => new Map()),
    ]);
    customers = rows;
    places = new Map(locs.map(l => [l.id, l]));
    people = ppl;
  }

  async function loadList() {
    await readAllLists();
    $('scheduler-customers-h').hidden = false;
    $('scheduler-customers-table').hidden = false;
    drawList();
  }

  /* ══ One customer ═══════════════════════════════════════════════════════ */
  const form = $('scheduler-customer-form');
  const nameField = $('scheduler-cu-name');
  const billField = $('scheduler-cu-bill');

  let loaded = null;
  // A new record's id, made once, so a Save sent again cannot insert it twice.
  const newId = crypto.randomUUID();
  let contactsBehind = false; // a rename its contacts' organization text missed
  let pickupId = null;      // the usual pickup picked
  let pickupText = '';      // the pickup field's text
  let baseline = '';

  const readForm = () => ({
    name: nameField.value.trim() || null,
    usual_location_id: pickupId,
    bill_to: billField.value.trim() || null,
  });
  const snapshot = () => JSON.stringify([readForm(), pickupId ? '' : pickupText]);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  /* The usual pickup: Carbon's combo box over every saved location, the name
     over the address. Design's list-box.js filters the options as the field
     is typed in and says which was picked, or none. */
  function drawPickup() {
    const slot = $('scheduler-cu-pickup-slot');
    const lab = el('label', 'rux--label', 'Usual pickup');
    lab.setAttribute('for', 'scheduler-cu-pickup');
    const root = el('div', 'rux--combo-box rux--list-box');
    const box = el('div', 'rux--list-box__field');
    const current = places.get(pickupId);
    const input = el('input', current ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = 'scheduler-cu-pickup';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'scheduler-place-field';
    input.placeholder = 'Search saved locations';
    input.value = current?.name ?? '';
    box.appendChild(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const p of [...places.values()].sort((a, b) => folded(a.name).localeCompare(folded(b.name)))) {
      const on = p.id === pickupId;
      const option = el('li', on
        ? 'rux--list-box__menu-item rux--list-box__menu-item--active scheduler-contact-option'
        : 'rux--list-box__menu-item scheduler-contact-option');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.locationId = p.id;
      option.dataset.ruxText = p.name;
      const body = el('div', 'rux--list-box__menu-item__option scheduler-contact-option__body');
      body.append(el('span', 'scheduler-contact-option__name', p.name),
        el('span', 'scheduler-contact-option__detail', p.address));
      option.appendChild(body);
      menu.appendChild(option);
    }
    root.append(box, menu);
    const req = el('div', 'rux--form-requirement');
    req.id = 'scheduler-cu-pickup-error';
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root, req);
    // Typing drops the pick; choosing an option sets the field without an
    // input event, then says which it was.
    input.addEventListener('input', () => {
      pickupId = null;
      pickupText = input.value.trim();
    });
    root.addEventListener('rux:listbox-selected', e => {
      pickupId = e.detail?.option?.dataset.locationId ?? null;
      pickupText = input.value.trim();
      showPickupError('');
    });
    // Design's list-box.js listens on the document, so a field built now works.
    slot.replaceChildren(wrap);
  }

  function fillForm(c) {
    nameField.value = c.name ?? '';
    pickupId = c.usual_location_id ?? null;
    pickupText = places.get(pickupId)?.name ?? '';
    billField.value = c.bill_to ?? '';
    drawPickup();
    showNameError('');
  }

  function drawTitle() {
    $('scheduler-customer-h').textContent = loaded?.name || 'New customer';
    document.title = `${loaded?.name || 'New customer'} — Scheduler`;
    // A customer not yet saved has no contacts, so no Contacts tab and no Delete.
    $('scheduler-customer-tabs').hidden = !loaded;
    drawDelete();
  }

  // ── validation ──
  const showNameError = message => pair.textError(nameField, 'scheduler-cu-name-error', message);
  const showPickupError = message => pair.comboError($('scheduler-cu-pickup'), 'scheduler-cu-pickup-error', message);
  function validate() {
    showNameError('');
    showPickupError('');
    let first = null;
    const name = nameField.value.trim();
    if (!name) { showNameError('Enter a name.'); first ??= nameField; }
    // QuickBooks matches a customer on its name, so two may not share one.
    else if (customers.some(c => c.id !== loaded?.id && folded(c.name) === folded(name))) {
      showNameError('Another customer already has this name.');
      first ??= nameField;
    }
    if (!pickupId && pickupText) {
      showPickupError('Pick a location from the list, or clear the field.');
      first ??= $('scheduler-cu-pickup');
    }
    first?.focus();
    return !first;
  }

  // ── contacts, read only ──
  function drawContacts() {
    const list = $('scheduler-customer-contacts');
    list.replaceChildren();
    const mine = loaded ? peopleOf(loaded) : [];
    if (!mine.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', 'No contacts yet.'));
      list.appendChild(li);
      return;
    }
    for (const c of mine) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = `contacts.html?id=${encodeURIComponent(c.id)}`;
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', c.name || 'Unnamed contact'));
      lines.appendChild(el('span', 'scheduler-pair-item__detail',
        [showPhone(c.phone), c.email].filter(Boolean).join(' · ') || 'No phone or email'));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  // ── delete ──
  let tripCount = null;     // trips naming this customer, once read
  async function readTripCount() {
    tripCount = null;
    drawDelete();
    const { count, error } = await client.from('trips').select('id', { count: 'exact', head: true })
      .eq('customer_id', loaded.id);
    tripCount = error ? -1 : count ?? 0;
    drawDelete();
  }
  function drawDelete() {
    const section = $('scheduler-customer-delete-section');
    section.hidden = !loaded;
    if (!loaded) return;
    const n = peopleOf(loaded).length;
    const blocked = n > 0 || tripCount !== 0;
    $('scheduler-customer-delete').disabled = blocked;
    $('scheduler-customer-delete-text').textContent = tripCount === null
      ? 'Checking the trips…'
      : tripCount < 0
        ? "The trips didn't load, so this customer can't be deleted now."
        : n > 0 || tripCount > 0
          ? "A contact or a trip names this customer, so it can't be deleted."
          : 'No contact or trip names this customer.';
  }
  // The Delete button opens its modal from markup, `data-rux-open`.
  $('scheduler-customer-delete-confirm')?.addEventListener('click', async () => {
    const button = $('scheduler-customer-delete-confirm');
    button.disabled = true;
    try {
      // Asked again at the moment of deleting, since a contact or a trip may
      // have named this customer since the page loaded.
      const [who, what] = await Promise.all([
        client.from('contacts').select('id').eq('customer_id', loaded.id).limit(1),
        client.from('trips').select('id').eq('customer_id', loaded.id).limit(1),
      ]);
      if (who.error || what.error) throw who.error || what.error;
      window.Rux?.modal?.close?.('scheduler-customer-delete-modal');
      if (who.data?.length || what.data?.length) {
        people = await readContacts();
        await readTripCount();
        drawContacts();
        result('error', 'A contact or a trip names this customer now, so it stays.');
        return;
      }
      const gone = await client.from('customers').delete().eq('id', loaded.id);
      if (gone.error) throw gone.error;
      guard.leave('customers.html');
    } catch {
      window.Rux?.modal?.close?.('scheduler-customer-delete-modal');
      result('error', "The customer wasn't deleted. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  // ── load, save ──
  async function loadCustomer() {
    result(null);
    // Every customer is read either way: a name is checked against them all.
    await readAllLists();
    if (!customerId) {
      loaded = null;
      fillForm({});
    } else {
      loaded = customers.find(c => String(c.id) === customerId) || null;
      if (!loaded) return false;
      fillForm(loaded);
    }
    drawTitle();
    drawContacts();
    baseline = snapshot();
    $('scheduler-customer').hidden = false;
    if (loaded) readTripCount();
    return true;
  }

  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-customer-save');
    saveBtn.disabled = true;
    let wrote = false;
    try {
      let id = loaded?.id;
      if (id && !force) {
        const now = await client.from('customers').select('updated_at').eq('id', id).maybeSingle();
        if (now.error) throw now.error;
        if (!now.data || now.data.updated_at !== loaded.updated_at) {
          guard.conflict();
          return false;
        }
      }
      const renamed = !!loaded && (loaded.name !== row.name || contactsBehind);
      // The write hands back the row as saved, so `loaded` holds its real
      // updated_at even when the read-back below fails, and a second Save
      // updates this row rather than finding a conflict or saving it twice.
      loaded = await window.SchedulerPair.saveRecord(client, 'customers',
        { id: id ?? newId, creating: !id, row, columns: COLUMNS });
      id = loaded.id;
      wrote = true;
      // rux-ui shows a contact's organization as text, so its contacts take
      // the new spelling with it. An update that fails is tried again on the
      // next Save, which would otherwise see no rename.
      if (renamed) {
        const moved = await client.from('contacts').update({ client: row.name }).eq('customer_id', id);
        contactsBehind = !!moved.error;
      }
      history.replaceState(null, '', `customers.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      // A Save that was leaving the page stays, so the missed contacts are said.
      if (contactsBehind) {
        result('error', "The customer saved, but its contacts still show the old name as their organization. Save again to update them.");
        return false;
      }
      result('success', 'Saved.');
      return true;
    } catch {
      if (wrote) {
        // What the form holds is what was saved, so leaving asks nothing.
        baseline = snapshot();
        drawTitle();
        readTripCount();
        result('error', "The customer saved, but the page didn't read it back. Reload the page to see it.");
        return true;
      }
      result('error', "The customer wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = customerId;
  async function reload(id = currentId) {
    const { data, error } = await client.from('customers').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Customer not found');
    loaded = data;
    customers = [...customers.filter(c => c.id !== id), data];
    fillForm(loaded);
    drawTitle();
    drawContacts();
    baseline = snapshot();
    readTripCount();
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  // Leaving with unsaved changes, and a conflict found by Save.
  const guard = pair.guard({ editing, dirty, save, reload });

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  pair.start(async signedIn => {
    client = signedIn;
    if (!editing) { await loadList(); return; }
    if (!(await loadCustomer())) {
      say('info', 'That customer is not in the list', 'Pick a customer from the list below.');
      history.replaceState(null, '', 'customers.html');
      await loadList();
    }
  });
})();
