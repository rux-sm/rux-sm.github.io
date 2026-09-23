/* ==========================================================================
   places.js — THE ADDRESS SEARCH FOR A PAGE OF ITS OWN
   --------------------------------------------------------------------------
   Carbon's combo box over Mapbox's Search Box, as the trip editor's Route tab
   draws it: the place's name over its address, asked a quarter second after
   typing stops. A place picked here has its map point, which is what a saved
   location needs. The Mapbox token and the yard, which ranks nearby places
   first, are read once from `settings`.

   `window.SchedulerPlaces.init(client)` reads them; `.field(id, label, place,
   onPick)` returns the field, and `onPick` gets the place picked, or null and
   the text when the field is typed in. Design's `js/list-box.js` opens and
   closes the menu.
   ========================================================================== */
(() => {
  'use strict';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  let token = null;
  let yard = null;
  let reading = null;

  function init(client) {
    reading ??= client.from('settings').select('key,value')
      .in('key', ['mapbox-token-v1', 'yard-location-v1'])
      .then(({ data, error }) => {
        if (error) return;
        const byKey = new Map((data || []).map(row => [row.key, row.value]));
        if (typeof byKey.get('mapbox-token-v1') === 'string') token = byKey.get('mapbox-token-v1');
        const y = byKey.get('yard-location-v1');
        if (y?.lat != null && y?.lng != null) yard = y;
      });
    return reading;
  }

  async function search(text) {
    if (!token || text.trim().length < 3) return [];
    const q = new URLSearchParams({ q: text.trim(), auto_complete: 'true', limit: '6',
                                    country: 'us,mx', access_token: token });
    if (yard) q.set('proximity', `${yard.lng},${yard.lat}`);
    const r = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${q}`);
    if (!r.ok) throw new Error(`Mapbox answered ${r.status}.`);
    const data = await r.json();
    return (data.features || []).map(f => {
      const p = f.properties || {};
      return { name: p.name || p.full_address || '', address: p.full_address || p.place_formatted || null,
               lat: p.coordinates?.latitude ?? null, lng: p.coordinates?.longitude ?? null,
               mapbox_id: p.mapbox_id || null };
    }).filter(p => p.name && p.lat != null);
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
    input.placeholder = token ? 'Search places' : 'Address';
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

  window.SchedulerPlaces = { init, search, field };
})();
