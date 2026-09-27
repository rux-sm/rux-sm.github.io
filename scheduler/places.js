/* ==========================================================================
   places.js — PLACES: SEARCH, DRIVES AND THE MAP, ON GEOAPIFY
   --------------------------------------------------------------------------
   Every lookup of a place goes through Geoapify, whose free plan lets a place
   found be kept and shared: `search(text)` for the places matching what is
   typed, `drive(a, b)` for the drive between two map points, and `map(host,
   point, onSet)` for a map a point is tapped on. Its key and the yard, which
   ranks nearby places first, are read from `settings` by `init(client)`, or
   handed over by `use(key, yard)` from a page that reads them itself.

   `.field(id, label, place, onPick)` is Carbon's combo box over the search,
   as the trip editor's Route tab draws it: the place's name over its
   address, asked a quarter second after typing stops. `onPick` gets the
   place picked, or null and the text when the field is typed in.
   `.unavailable()` says why the search cannot run, a settings read that
   failed or no key, or null when it can. `.credit()` is the line the free
   plan asks for under what Geoapify found. Design's `js/list-box.js` opens
   and closes the menu. `.nameIsAddress(name, address)` says a saved
   location's name is missing or only a street address, and `.NAME_HELP`
   asks for a real one.
   ========================================================================== */
(() => {
  'use strict';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const API = 'https://api.geoapify.com/v1';
  let key = null;
  let yard = null;
  let reading = null;
  let why = null;         // why the search cannot run, once the settings are read

  function use(k, y) {
    key = typeof k === 'string' && k ? k : null;
    yard = y?.lat != null && y?.lng != null ? y : null;
    why = key ? null : 'The address search has no Geoapify key in Settings, so no address can be looked up.';
  }

  function init(client) {
    reading ??= client.from('settings').select('key,value')
      .in('key', ['geoapify-key-v1', 'yard-location-v1'])
      .then(({ data, error }) => {
        if (error) throw error;
        const byKey = new Map((data || []).map(row => [row.key, row.value]));
        use(byKey.get('geoapify-key-v1'), byKey.get('yard-location-v1'));
      })
      .catch(() => {
        why = "The address search didn't load, so no address can be looked up. Reload the page to try again.";
      });
    return reading;
  }

  const unavailable = () => why;

  async function geoapify(path, params) {
    const q = new URLSearchParams({ ...params, apiKey: key });
    const r = await fetch(`${API}/${path}?${q}`);
    if (!r.ok) throw new Error(`Geoapify answered ${r.status}.`);
    return r.json();
  }

  const US = /,\s*United States of America$/;
  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Metres between two points, near enough at the distances compared here.
  const apart = (a, b) => Math.hypot((a.lat - b.lat) * 111320,
    (a.lng - b.lng) * 111320 * Math.cos(a.lat * Math.PI / 180));

  /* A result as a place. A venue is its name over its street address; an
     address is its street line over the whole address. The country is left
     off an address in the United States, as every one of them would say it. */
  function placeOf(p) {
    const line1 = p.address_line1 || p.formatted || '';
    const line2 = (p.address_line2 || '').replace(US, '');
    const venue = p.result_type === 'amenity' && !!p.name;
    return {
      name: venue ? p.name : line1,
      address: venue ? line2 || null : [line1, line2].filter(Boolean).join(', ') || null,
      lat: p.lat ?? null,
      lng: p.lon ?? null,
      mapbox_id: null,
      street: !!p.housenumber,
      importance: p.rank?.importance ?? 0,
      venue,
    };
  }

  /* A well-known venue, which Geoapify rates at 0.05 or more, goes first, so
     a theme park comes before the hotels named for it; the rest keep
     Geoapify's order, which rates most places not at all. One venue listed
     twice, the same name within 3 km, shows once, as the entry with a street
     address. */
  const KNOWN = 0.05;
  function tidy(found) {
    const known = found.filter(p => p.venue && p.importance >= KNOWN).sort((a, b) => b.importance - a.importance);
    const ordered = [...known, ...found.filter(p => !known.includes(p))];
    const out = [];
    for (const p of ordered) {
      const twin = out.findIndex(o => folded(o.name) === folded(p.name) && apart(o, p) < 3000);
      if (twin < 0) out.push(p);
      else if (p.street && !out[twin].street) out[twin] = p;
    }
    return out.map(({ street, importance, venue, ...place }) => place);
  }

  /* Autocomplete first, as it is made for text still being typed. It finds
     nothing for a house number and road with no town, which the full search
     does, so an empty answer asks that once. */
  async function search(text) {
    if (!key || text.trim().length < 3) return [];
    const params = { text: text.trim(), filter: 'countrycode:us,mx', limit: '6', lang: 'en' };
    if (yard) params.bias = `proximity:${yard.lng},${yard.lat}`;
    let data = await geoapify('geocode/autocomplete', params);
    if (!data.features?.length) data = await geoapify('geocode/search', params);
    return tidy((data.features || []).map(f => placeOf(f.properties || {}))
      .filter(p => p.name && p.lat != null));
  }

  // The drive between two places, in whole minutes and miles to a tenth,
  // asked once for each pair of points.
  const drives = new Map();
  function drive(a, b) {
    if (!key || a?.lat == null || b?.lat == null) return Promise.resolve(null);
    const pair = `${a.lat},${a.lng}|${b.lat},${b.lng}`;
    if (!drives.has(pair)) {
      drives.set(pair, geoapify('routing', { waypoints: pair, mode: 'drive' })
        .then(d => {
          const p = d.features?.[0]?.properties;
          return p ? { min: Math.round(p.time / 60), miles: Math.round(p.distance / 160.934) / 10 } : null;
        })
        .catch(e => { drives.delete(pair); throw e; }));
    }
    return drives.get(pair);
  }

  // The line the free plan asks for wherever Geoapify's answers are shown.
  function credit() {
    const line = el('span', 'scheduler-place-credit');
    const link = el('a', 'rux--link rux--link--sm', 'Geoapify');
    link.href = 'https://www.geoapify.com/';
    link.target = '_blank';
    link.rel = 'noopener';
    const osm = el('a', 'rux--link rux--link--sm', 'OpenStreetMap');
    osm.href = 'https://www.openstreetmap.org/copyright';
    osm.target = '_blank';
    osm.rel = 'noopener';
    line.append('Powered by ', link, ' · © ', osm, ' contributors');
    return line;
  }
  // The credit as the last row of a search's list, which is not an option.
  function creditRow() {
    const li = el('li', 'scheduler-place-credit-row');
    li.setAttribute('role', 'presentation');
    li.appendChild(credit());
    return li;
  }

  /* A map to set a place's point on, Leaflet over Geoapify's street map. It
     opens on the point, or on the yard at a region's scale when there is none,
     and a tap puts the pin there and hands `onSet` the point. `.show(point)`
     moves the pin and the view to a point, or takes the pin away for null. */
  function map(host, point, onSet) {
    if (!window.L || !key) return null;
    const L = window.L;
    const m = L.map(host, { attributionControl: true, scrollWheelZoom: false });
    m.attributionControl.setPrefix(false);
    L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`, {
      maxZoom: 20,
      attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a> · '
        + '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(m);
    /* The pin is the sprite's location glyph copied in, since Chrome paints
       no `<use>` of the hidden sprite inside Leaflet's layers. */
    const glyph = document.getElementById('m-location_on')?.innerHTML ?? '';
    const icon = L.divIcon({
      className: 'scheduler-map-pin',
      html: `<svg width="32" height="32" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">${glyph}</svg>`,
      iconSize: [32, 32],
      iconAnchor: [16, 30],
    });
    // The map is drawn while its page is still hidden, so it measures itself
    // again whenever its box changes.
    new ResizeObserver(() => m.invalidateSize()).observe(host);
    let pin = null;
    const show = p => {
      if (p?.lat == null) {
        pin?.remove();
        pin = null;
        if (yard) m.setView([yard.lat, yard.lng], 8);
        return;
      }
      if (pin) pin.setLatLng([p.lat, p.lng]);
      else pin = L.marker([p.lat, p.lng], { icon, keyboard: false }).addTo(m);
      m.setView([p.lat, p.lng], Math.max(m.getZoom() || 0, 16));
    };
    m.on('click', e => {
      const p = { lat: Math.round(e.latlng.lat * 1e6) / 1e6, lng: Math.round(e.latlng.lng * 1e6) / 1e6 };
      if (pin) pin.setLatLng([p.lat, p.lng]);
      else pin = L.marker([p.lat, p.lng], { icon, keyboard: false }).addTo(m);
      onSet(p);
    });
    if (!point?.lat && !yard) m.setView([31, -99], 5);
    show(point);
    return { show };
  }

  // The box holds the place's address, since the name has a field of its own.
  function field(id, label, place, onPick) {
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const root = el('div', 'rux--combo-box rux--list-box');
    const box = el('div', 'rux--list-box__field');
    const input = el('input', place?.address ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = id;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    // A token Chrome does not recognise, so it offers no saved address here.
    input.autocomplete = 'scheduler-place-field';
    input.placeholder = key ? 'Search places' : 'Address';
    input.value = place?.address ?? '';
    box.append(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    root.append(box, menu);
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);

    let found = [];
    let timer = 0;
    let asked = 0;
    const draw = () => {
      menu.replaceChildren(...found.map((p, i) => {
        const option = el('li', 'rux--list-box__menu-item scheduler-contact-option');
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.dataset.placeIndex = String(i);
        option.dataset.ruxText = p.address || p.name;
        const body = el('div', 'rux--list-box__menu-item__option scheduler-contact-option__body');
        body.appendChild(el('span', 'scheduler-contact-option__name', p.name));
        if (p.address) body.appendChild(el('span', 'scheduler-contact-option__detail', p.address));
        option.appendChild(body);
        return option;
      }));
      if (found.length) menu.appendChild(creditRow());
      // `list-box.js` shows the list only if it had options when it opened.
      menu.hidden = !found.length || !root.classList.contains('rux--list-box--expanded');
    };
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const text = input.value;
      onPick(null, text.trim());
      timer = setTimeout(async () => {
        const n = ++asked;
        try {
          const got = await search(text);
          if (n === asked) { found = got; draw(); }
        } catch { if (n === asked) { found = []; draw(); } }
      }, 250);
    });
    root.addEventListener('rux:listbox-selected', e => {
      const index = e.detail?.option?.dataset.placeIndex;
      if (index === undefined) return;
      onPick(found[Number(index)] ?? null, input.value.trim());
    });
    return wrap;
  }

  /* A saved location's name says what the place is, the school or the venue.
     One that is blank, or only a street address, whether its own address's
     street line or a house number with a street word after it, says nothing
     the address does not, so every place that saves a location asks for a
     real one. The street word keeps a name like "3M Arena" a name. */
  const STREET = /^\d+[a-z]?\s.*\b(st|street|ave|avenue|avenida|rd|road|dr|drive|ln|lane|bl|blvd|boulevard|hwy|highway|pkwy|parkway|way|route|interstate|fm|us|ct|court|pl|place|cir|circle|trl|trail|loop|expy|expressway|fwy|freeway)\b/;
  function nameIsAddress(name, address) {
    const fold = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const n = fold(name);
    const a = fold(address);
    return !n || n === a || n === a.split(',')[0].trim() || STREET.test(n);
  }
  const NAME_HELP = "Enter the place's name, such as the school or venue, not its street address.";

  window.SchedulerPlaces = { init, use, search, drive, map, field, credit, creditRow, unavailable, nameIsAddress, NAME_HELP };
})();
