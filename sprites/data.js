/* ==========================================================================
   data.js — what Sprites draws with, and the drawing kept in this browser
   --------------------------------------------------------------------------
   PALETTES. Each palette has one home, a JSON file beside what it is for,
   which this fetches and never copies. Sprites' own is sprites/palette.json,
   70 colours in ramps, and leaves free colour open beside it. Emu consoles
   is emu/brand/consoles/palette.json, which emu/tools/build-consoles.mjs
   reads too: twenty colours, each bound to an --emu-console-* property, and
   nothing else may be drawn with, so a console Sprites saves never stops
   the converter. Both come back in one shape: ramps of { hex, label }.

   PRESETS are the sizes the Size window offers. A console is 24 high: a
   home console 36 wide, a handheld as wide as it needs up to 36.

   THE DRAFT is the drawing as it stands, kept in localStorage on every step,
   so a reload or a closed tab loses nothing. It is this browser's only;
   what is meant to last is saved into the checkout.
   ========================================================================== */
(() => {
  'use strict';

  const PALETTES = [
    { id: 'sprites', name: 'Sprites', url: '/sprites/palette.json', free: true, folder: '' },
    {
      id: 'emu-consoles', name: 'Emu consoles', url: '/emu/brand/consoles/palette.json', free: false,
      folder: 'emu/brand/consoles/',
      // The size build-consoles.mjs takes, which it checks again by the file's name.
      fits: (w, h) => h === 24 && w <= 36,
      rule: 'A console is 24 high and at most 36 wide.',
      after: 'Run node emu/tools/build-consoles.mjs to draw it into consoles.svg.',
    },
  ];

  const PRESETS = {
    home: { w: 36, h: 24 },
    handheld: { w: 16, h: 24 },
    icon16: { w: 16, h: 16 },
    icon32: { w: 32, h: 32 },
  };

  const hexOf = n => `#${n.toString(16).padStart(6, '0')}`;
  const numOf = hex => parseInt(hex.slice(1), 16);

  // A palette's ramps, fetched once.
  const loaded = new Map();
  const palette = id => {
    const p = PALETTES.find(x => x.id === id) ?? PALETTES[0];
    if (!loaded.has(p.id)) {
      loaded.set(p.id, fetch(p.url).then(r => {
        if (!r.ok) throw new Error(`${p.url}: ${r.status}`);
        return r.json();
      }).then(json => {
        const ramps = json.ramps
          ? json.ramps.map(r => ({ name: r.name, colours: r.colours.map((hex, i) => ({ hex, label: `${r.name} ${i + 1}` })) }))
          : [{ name: json.name, colours: json.colours.map(c => ({ hex: c.hex, label: `${c.property}, ${c.purpose}` })) }];
        const all = new Set(ramps.flatMap(r => r.colours.map(c => numOf(c.hex))));
        return { ...p, ramps, has: n => n === -1 || all.has(n) };
      }));
    }
    return loaded.get(p.id);
  };

  const DRAFT = 'sprites-draft';
  const draft = {
    load() {
      try {
        const d = JSON.parse(localStorage.getItem(DRAFT) ?? 'null');
        if (!d || !(d.w > 0 && d.h > 0) || d.px?.length !== d.w * d.h) return null;
        return { ...d, px: Int32Array.from(d.px) };
      } catch { return null; }
    },
    save(d) {
      try { localStorage.setItem(DRAFT, JSON.stringify({ ...d, px: Array.from(d.px) })); } catch { /* a full or blocked store keeps the last draft */ }
    },
  };

  // The folder the last save went to, to start the next one in.
  const FOLDER = 'sprites-folder';
  const folder = {
    get() { try { return localStorage.getItem(FOLDER) ?? ''; } catch { return ''; } },
    set(f) { try { localStorage.setItem(FOLDER, f); } catch { /* the next save starts in the palette's folder */ } },
  };

  window.Sprites = Object.assign(window.Sprites || {}, { PALETTES, PRESETS, palette, draft, folder, hexOf, numOf });
})();
