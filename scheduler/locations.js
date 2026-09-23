/* ==========================================================================
   locations.js — THE LOCATIONS PAGE
   --------------------------------------------------------------------------
   locations.html lists every saved location. locations.html?id=<location id>
   edits one and locations.html?new makes one. Both read and write
   `locations`, which rux-ui's Settings list and itinerary search read too.

   A location is a name, an address and a map point. The address is picked
   from the map search in places.js, so every saved place has the point a
   drive time is worked out from; typed text alone is not saved.

   A trip keeps its own copy of every stop, so changing or deleting a location
   never changes a trip. Only a customer's usual pickup holds a location in
   place: one in use cannot be deleted.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size, viewBox, cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  const params = new URLSearchParams(location.search);
  const locationId = params.get('id');
  const editing = !!locationId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-locations-h').hidden = true;

  const COLUMNS = 'id,name,address,lat,lng,mapbox_id,updated_at';
  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  let client = null;

  // ── the notice ──────────────────────────────────────────────────────────
  // Every class is written out in full: the class sweep reads the source.
  const NOTE = {
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#m-info-fill' },
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#m-error-fill' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#m-check_circle-fill' },
  };
  const say = (kind, title, text) => {
    $('scheduler-locations-notice').hidden = !kind;
    if (!kind) return;
    $('scheduler-locations-notice-box').className = NOTE[kind].cls;
    $('scheduler-locations-notice-icon').setAttribute('href', NOTE[kind].icon);
    $('scheduler-locations-notice-title').textContent = title;
    $('scheduler-locations-notice-text').textContent = text || '';
  };
  const result = (kind, text) => {
    $('scheduler-location-result').hidden = !kind;
    if (!kind) return;
    $('scheduler-location-result-box').className = NOTE[kind].cls;
    $('scheduler-location-result-icon').setAttribute('href', NOTE[kind].icon);
    $('scheduler-location-result-text').textContent = text;
  };

  // ── reading ─────────────────────────────────────────────────────────────
  const readLocations = async () => {
    const { data, error } = await client.from('locations').select(COLUMNS).order('name');
    if (error) throw error;
    return data || [];
  };
  // Which customers take each location as their usual pickup.
  const readUses = async () => {
    const { data, error } = await client.from('customers').select('id,name,usual_location_id')
      .not('usual_location_id', 'is', null).order('name');
    if (error) throw error;
    const map = new Map();
    for (const c of data || []) {
      if (!map.has(c.usual_location_id)) map.set(c.usual_location_id, []);
      map.get(c.usual_location_id).push(c);
    }
    return map;
  };

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let places = [];
  let uses = new Map();
  let query = '';
  let sortKey = 'name';
  let sortDir = 'ascending';

  const usesOf = p => uses.get(p.id) || [];
  const byName = (a, b) => folded(a.name).localeCompare(folded(b.name)) || folded(a.address).localeCompare(folded(b.address));
  const SORTS = {
    name: byName,
    customers: (a, b) => usesOf(a).length - usesOf(b).length,
  };
  const matches = (p, q) => !q || `${p.name} ${p.address}`.toLowerCase().includes(q.toLowerCase());

  function drawList() {
    const shown = places
      .filter(p => matches(p, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byName(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byName(a, b);
      });

    // What the search came to, in the band beside it.
    const note = $('scheduler-locations-count');
    if (note) note.textContent = query ? `${shown.length} of ${places.length} match` : '';

    const body = $('scheduler-locations-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No locations match “${query}”.` : 'No locations yet.');
      td.colSpan = 2;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const p of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = p.id;

      const where = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', p.name);
      link.href = `locations.html?id=${encodeURIComponent(p.id)}`;
      lines.append(link, el('span', 'scheduler-pair-cell__detail', p.address));
      cell.appendChild(lines);
      where.appendChild(cell);

      const used = usesOf(p);
      const who = el('td', used.length ? null : 'scheduler-pair-note',
        used.length ? used.map(c => c.name).join(', ') : '—');
      tr.append(where, who);
      body.appendChild(tr);
    }
  }

  // A click anywhere on a row opens its location; the name is the link a
  // keyboard reaches.
  $('scheduler-locations-rows')?.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || e.target.closest('a')) return;
    location.href = `locations.html?id=${encodeURIComponent(tr.dataset.id)}`;
  });

  // Carbon's three-step sort: ascending, descending, then back to A to Z.
  const NEXT = { none: 'ascending', ascending: 'descending', descending: 'none' };
  document.querySelector('#scheduler-locations-list thead')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const dir = sortKey === th.dataset.sort ? NEXT[sortDir] : 'ascending';
    sortKey = th.dataset.sort;
    sortDir = dir;
    for (const other of document.querySelectorAll('#scheduler-locations-list th[data-sort]')) {
      const on = other === th && dir !== 'none';
      other.setAttribute('aria-sort', on ? dir : 'none');
      const button = other.querySelector('.rux--table-sort');
      button.classList.toggle('rux--table-sort--active', on);
      button.classList.toggle('rux--table-sort--descending', on && dir === 'descending');
    }
    drawList();
  });

  const searchInput = $('scheduler-locations-search');
  const searchClear = $('scheduler-locations-search-clear');
  searchInput?.addEventListener('input', () => {
    query = searchInput.value.trim();
    searchClear.classList.toggle('rux--search-close--hidden', !searchInput.value);
    drawList();
  });
  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchInput.value) { e.preventDefault(); searchClear.click(); }
  });

  async function loadList() {
    const [rows, used] = await Promise.all([readLocations(), readUses().catch(() => new Map())]);
    places = rows;
    uses = used;
    $('scheduler-locations-h').hidden = false;
    $('scheduler-locations-table').hidden = false;
    drawList();
  }

  /* ══ One location ═══════════════════════════════════════════════════════ */
  const form = $('scheduler-location-form');
  const nameField = $('scheduler-l-name');
  nameField?.addEventListener('input', () => { autoName = null; });

  // Cancel and Save stack on a phone, as Carbon's stacked button set does.
  const narrow = matchMedia('(max-width: 41.98rem)');
  const stackButtons = () => document.querySelector('.scheduler-pair-buttons')
    ?.classList.toggle('rux--btn-set--stacked', narrow.matches);
  stackButtons();
  narrow.addEventListener('change', stackButtons);

  let loaded = null;      // the row as the page read it
  let place = null;       // the address picked: { address, lat, lng, mapbox_id }
  let typed = '';         // the address field's text
  let autoName = null;    // the name the last pick filled in, until one is typed
  let baseline = '';

  const readForm = () => ({
    name: nameField.value.trim() || null,
    address: place?.address ?? (typed || null),
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    mapbox_id: place?.mapbox_id ?? null,
  });
  const snapshot = () => JSON.stringify(readForm());
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  // The address search is built each time the form is filled, holding the
  // place it opens with.
  function drawAddress() {
    const slot = $('scheduler-l-address-slot');
    const wrap = window.SchedulerPlaces.field('scheduler-l-address', 'Address', place, (picked, text) => {
      typed = text;
      if (picked) {
        place = { address: picked.address || picked.name, lat: picked.lat, lng: picked.lng, mapbox_id: picked.mapbox_id };
        // A place takes the name the map knows it by, until one is typed.
        if (!nameField.value.trim() || nameField.value === autoName) {
          nameField.value = picked.name;
          autoName = picked.name;
        }
      } else {
        place = null;
      }
      noteAddress();
    });
    const req = el('div', 'rux--form-requirement');
    req.id = 'scheduler-l-address-error';
    wrap.appendChild(req);
    // Design's list-box.js listens on the document, so a field built now works.
    slot.replaceChildren(wrap);
    noteAddress();
  }

  // An address with no map point cannot be saved, so when the search cannot
  // run the field says why at once, rather than after Save.
  function noteAddress() {
    showAddressError(place?.lat == null ? window.SchedulerPlaces.unavailable() ?? '' : '');
  }

  function fillForm(p) {
    nameField.value = p.name ?? '';
    autoName = null;
    place = p.address ? { address: p.address, lat: p.lat, lng: p.lng, mapbox_id: p.mapbox_id ?? null } : null;
    typed = p.address ?? '';
    drawAddress();
    showNameError('');
  }

  function drawTitle() {
    $('scheduler-location-h').textContent = loaded?.name || 'New location';
    document.title = `${loaded?.name || 'New location'} — Scheduler`;
    drawDelete();
  }

  // ── validation ──
  function showNameError(message) {
    const input = nameField;
    const wrap = input.closest('.rux--text-input__field-wrapper');
    const on = !!message;
    input.classList.toggle('rux--text-input--invalid', on);
    input.toggleAttribute('data-invalid', on);
    wrap.toggleAttribute('data-invalid', on);
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', 'scheduler-l-name-error');
    let icon = wrap.querySelector('.rux--text-input__invalid-icon');
    if (on && !icon) {
      icon = svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--text-input__invalid-icon');
      wrap.prepend(icon);
    }
    if (!on) icon?.remove();
    $('scheduler-l-name-error').textContent = message;
  }
  function showAddressError(message) {
    const input = $('scheduler-l-address');
    const root = input?.closest('.rux--list-box');
    const req = $('scheduler-l-address-error');
    if (!root || !req) return;
    const on = !!message;
    root.toggleAttribute('data-invalid', on);
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', req.id);
    let icon = root.querySelector('.rux--list-box__invalid-icon');
    if (on && !icon) {
      icon = svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--list-box__invalid-icon');
      root.querySelector('.rux--list-box__field').appendChild(icon);
    }
    if (!on) icon?.remove();
    req.textContent = message;
  }
  function validate() {
    showNameError('');
    showAddressError('');
    let first = null;
    if (!nameField.value.trim()) { showNameError('Enter a name.'); first ??= nameField; }
    if (!place || place.lat == null) {
      showAddressError(window.SchedulerPlaces.unavailable() ?? (typed
        ? 'Pick the address from the list, so it has a place on the map.'
        : 'Search for the address and pick it from the list.'));
      first ??= $('scheduler-l-address');
    } else {
      // The same place twice would offer two answers for one stop.
      const same = places.find(p => p.id !== loaded?.id
        && ((place.mapbox_id && p.mapbox_id === place.mapbox_id) || folded(p.address) === folded(place.address)));
      if (same) {
        showAddressError(`This place is already saved as “${same.name}”.`);
        first ??= $('scheduler-l-address');
      }
    }
    first?.focus();
    return !first;
  }

  // ── delete ──
  function drawDelete() {
    const section = $('scheduler-location-delete-section');
    section.hidden = !loaded;
    if (!loaded) return;
    const used = usesOf(loaded);
    $('scheduler-location-delete').disabled = used.length > 0;
    $('scheduler-location-delete-text').textContent = used.length
      ? `The usual pickup for ${used.map(c => c.name).join(', ')}, so it can't be deleted.`
      : 'No customer takes this location as their usual pickup.';
  }
  // The Delete button opens its modal from markup, `data-rux-open`.
  $('scheduler-location-delete-confirm')?.addEventListener('click', async () => {
    const button = $('scheduler-location-delete-confirm');
    button.disabled = true;
    try {
      // Asked again at the moment of deleting, since a customer may have
      // taken it as their usual pickup since the page loaded.
      const now = await client.from('customers').select('id').eq('usual_location_id', loaded.id).limit(1);
      if (now.error) throw now.error;
      window.Rux?.modal?.close?.('scheduler-location-delete-modal');
      if (now.data?.length) {
        uses = await readUses();
        drawDelete();
        result('error', 'A customer takes this location as their usual pickup now, so it stays.');
        return;
      }
      const gone = await client.from('locations').delete().eq('id', loaded.id);
      if (gone.error) throw gone.error;
      leaving = true;
      location.href = 'locations.html';
    } catch {
      window.Rux?.modal?.close?.('scheduler-location-delete-modal');
      result('error', "The location wasn't deleted. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  // ── load, save ──
  async function loadLocation() {
    result(null);
    // Every location is read either way: a place is checked against them all
    // before it is saved twice.
    [places, uses] = await Promise.all([readLocations(), readUses().catch(() => new Map())]);
    await window.SchedulerPlaces.init(client);
    if (!locationId) {
      loaded = null;
      fillForm({});
    } else {
      loaded = places.find(p => String(p.id) === locationId) || null;
      if (!loaded) return false;
      fillForm(loaded);
    }
    drawTitle();
    baseline = snapshot();
    $('scheduler-location').hidden = false;
    return true;
  }

  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-location-save');
    saveBtn.disabled = true;
    let wrote = false;
    try {
      let id = loaded?.id;
      if (id && !force) {
        const now = await client.from('locations').select('updated_at').eq('id', id).maybeSingle();
        if (now.error) throw now.error;
        if (!now.data || now.data.updated_at !== loaded.updated_at) {
          window.Rux?.modal?.open?.('scheduler-location-conflict-modal');
          return false;
        }
      }
      // The write hands back the row as saved, so `loaded` holds its real
      // updated_at even when the read-back below fails, and a second Save
      // updates this row rather than finding a conflict or saving it twice.
      const written = id
        ? await client.from('locations').update(row).eq('id', id).select(COLUMNS).single()
        : await client.from('locations').insert({ id: crypto.randomUUID(), ...row }).select(COLUMNS).single();
      if (written.error) throw written.error;
      loaded = written.data;
      id = loaded.id;
      wrote = true;
      history.replaceState(null, '', `locations.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch {
      if (wrote) {
        // What the form holds is what was saved, so leaving asks nothing.
        baseline = snapshot();
        drawTitle();
        result('error', "The location saved, but the page didn't read it back. Reload the page to see it.");
        return true;
      }
      result('error', "The location wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = locationId;
  async function reload(id = currentId) {
    const { data, error } = await client.from('locations').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Location not found');
    loaded = data;
    places = [...places.filter(p => p.id !== id), data];
    fillForm(loaded);
    drawTitle();
    baseline = snapshot();
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  $('scheduler-location-conflict-save')?.addEventListener('click', async () => {
    const next = afterSave;
    keepAfter = true;
    window.Rux?.modal?.close?.('scheduler-location-conflict-modal');
    keepAfter = false;
    afterSave = null;
    if (await save(true)) next?.();
  });
  $('scheduler-location-conflict-modal')?.addEventListener('rux:modal-closed', () => {
    if (!keepAfter) afterSave = null;
  });
  $('scheduler-location-conflict-reload')?.addEventListener('click', async () => {
    window.Rux?.modal?.close?.('scheduler-location-conflict-modal');
    afterSave = null;
    try { await reload(); result('info', 'Showing the location as it is now.'); } catch { result('error', "The location didn't reload. Reload the page."); }
  });

  // ── leaving with unsaved changes ──
  let afterSave = null;
  let leaving = false;
  const unsavedModal = $('scheduler-location-unsaved-modal');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !editing || leaving || !dirty()) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault();
    afterSave = () => { leaving = true; location.href = a.href; };
    window.Rux?.modal?.open?.(unsavedModal);
  });
  $('scheduler-location-unsaved-discard')?.addEventListener('click', () => {
    const next = afterSave;
    afterSave = null;
    window.Rux?.modal?.close?.(unsavedModal);
    next?.();
  });
  // Save keeps the leaving action through the close, so a conflict found by
  // the save can still finish it; any other close drops it.
  let keepAfter = false;
  $('scheduler-location-unsaved-save')?.addEventListener('click', async () => {
    const next = afterSave;
    keepAfter = true;
    window.Rux?.modal?.close?.(unsavedModal);
    keepAfter = false;
    afterSave = next;
    if (await save()) { afterSave = null; next?.(); }
  });
  unsavedModal?.addEventListener('rux:modal-closed', () => { if (!keepAfter) afterSave = null; });
  window.addEventListener('beforeunload', e => {
    if (editing && !leaving && dirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ══ Start ══════════════════════════════════════════════════════════════
     The same staff gate as the schedule: the page waits for the staff
     profile, and an account without one, a profile that would not load, or a
     local preview other than the cloud preview gets a notice instead. */
  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      say('info', 'This preview has no log-in', 'Open http://localhost:8641/, the cloud preview, to load the locations.');
      return;
    }
    let staff;
    try { staff = await account.staffProfile(); } catch {
      say('error', "The locations didn't load", 'Reload the page to try again.');
      return;
    }
    if (!staff) {
      say('info', "This account isn't set up as staff yet", 'Ask the owner to set it up.');
      return;
    }
    client = account.client;
    try {
      if (!editing) { await loadList(); return; }
      if (!(await loadLocation())) {
        say('info', 'That location is not in the list', 'Pick a location from the list below.');
        history.replaceState(null, '', 'locations.html');
        await loadList();
      }
    } catch {
      say('error', "The locations didn't load", 'Reload the page to try again.');
    }
  })();
})();
