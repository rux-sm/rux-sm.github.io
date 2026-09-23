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

  const { $, el, svgUse } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'locations', one: 'location' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const locationId = params.get('id');
  const editing = !!locationId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-locations-h').hidden = true;

  const COLUMNS = 'id,name,address,lat,lng,mapbox_id,updated_at';
  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  let client = null;

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

  const usesOf = p => uses.get(p.id) || [];
  const byName = (a, b) => folded(a.name).localeCompare(folded(b.name)) || folded(a.address).localeCompare(folded(b.address));
  const SORTS = {
    name: byName,
    customers: (a, b) => usesOf(a).length - usesOf(b).length,
  };
  const matches = (p, q) => !q || `${p.name} ${p.address}`.toLowerCase().includes(q.toLowerCase());

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const shown = places
      .filter(p => matches(p, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byName(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byName(a, b);
      });

    view.count(shown.length, places.length);

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

  // Search, sort and a row's click, which opens its location.
  const view = pair.table({ sortKey: 'name', draw: drawList });

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

  let loaded = null;       // the row as the page read it
  // A new record's id, made once, so a Save sent again cannot insert it twice.
  const newId = crypto.randomUUID();
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
  const showNameError = message => pair.textError(nameField, 'scheduler-l-name-error', message);
  const showAddressError = message => pair.comboError($('scheduler-l-address'), 'scheduler-l-address-error', message);
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
      guard.leave('locations.html');
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
          guard.conflict();
          return false;
        }
      }
      // The write hands back the row as saved, so `loaded` holds its real
      // updated_at even when the read-back below fails, and a second Save
      // updates this row rather than finding a conflict or saving it twice.
      loaded = await window.SchedulerPair.saveRecord(client, 'locations',
        { id: id ?? newId, creating: !id, row, columns: COLUMNS });
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

  // Leaving with unsaved changes, and a conflict found by Save.
  const guard = pair.guard({ editing, dirty, save, reload });

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  pair.start(async signedIn => {
    client = signedIn;
    if (!editing) { await loadList(); return; }
    if (!(await loadLocation())) {
      say('info', 'That location is not in the list', 'Pick a location from the list below.');
      history.replaceState(null, '', 'locations.html');
      await loadList();
    }
  });
})();
