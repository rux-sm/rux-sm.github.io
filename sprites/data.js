/* ==========================================================================
   data.js — what Sprites draws with, and the drawing kept in this browser
   --------------------------------------------------------------------------
   PALETTES. Each palette has one home, a JSON file beside what it is for,
   which this fetches and never copies. Sprites' own is sprites/palette.json,
   122 colours in ramps, and leaves free colour open beside it. Every
   palette comes back in one shape: ramps of
   { n, label }, a space, and css(n) to paint a colour with.

   SPRITES P3 is Sprites' own palette made more vivid for a Display P3
   screen, worked out here from palette.json rather than kept beside it.
   Each colour keeps its OKLCH lightness and hue; its chroma grows toward
   P3's edge by the square of how near it stands to sRGB's, so the vivid
   steps gain all the room P3 adds and the muted ramps stay muted. A P3
   drawing's numbers are Display P3 coordinates, not sRGB ones, and its
   colours share their labels with Sprites', which is how a drawing moves
   between the two.

   PRESETS are the sizes the Size window offers. A console is 24 high: a
   home console 36 wide, a handheld as wide as it needs up to 36.

   THE DRAFT is the drawing as it stands, kept on every step in two places.
   The tab's own, in sessionStorage, is what a reload brings back, so two
   tabs each keep the drawing they hold. The browser's, in localStorage, is
   the one drawn last in any tab, and is what a new tab starts from, so a
   closed tab loses nothing. Both are this browser's only; what is meant to
   last is saved into the checkout.

   WHERE DRAWINGS LIVE. Each palette has a folder a new drawing's save
   starts in: sprites/art/ for Sprites' own two, the home of a drawing no
   app has claimed yet. The gallery shows every picture there, and beside
   them the drawings this browser saved or opened anywhere else in the
   checkout, whose paths are kept here.

   ELEMENTS are the places in an app that show a drawing, each a file the
   app reads. Emu has three sets of them, a folder each, holding one picture
   for each of Emu's systems, named for the system: its console, which
   Emu's room shows as it is drawn, its logo and its controller; the
   consoles' set holds the room's TV too. The systems are the ones
   emu/emulators.json names. A drawing is assigned to an element, which
   files.js records and carries out, and the gallery shows each set whole,
   with an empty tile where an element has no drawing yet. `art` is the
   name a drawing started from that tile is given.
   ========================================================================== */
(() => {
  'use strict';

  const PALETTES = [
    { id: 'sprites', name: 'Sprites', url: '/sprites/palette.json', free: true, folder: 'sprites/art/', space: 'srgb' },
    { id: 'sprites-p3', name: 'Sprites P3', url: '/sprites/palette.json', free: true, folder: 'sprites/art/', space: 'display-p3', vivid: true },
  ];

  const PRESETS = {
    home: { w: 36, h: 24 },
    handheld: { w: 16, h: 24 },
    icon16: { w: 16, h: 16 },
    icon32: { w: 32, h: 32 },
  };

  const hexOf = n => `#${n.toString(16).padStart(6, '0')}`;
  const numOf = hex => parseInt(hex.slice(1), 16);

  // ---- colour: sRGB and Display P3, both on sRGB's curve, and OKLCH ----
  const decode = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const encode = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
  const times = (m, [r, g, b]) => m.map(row => row[0] * r + row[1] * g + row[2] * b);
  const SRGB_TO_P3 = [[0.8224621, 0.177538, 0], [0.0331941, 0.9668058, 0], [0.0170827, 0.0723974, 0.9105199]];
  const P3_TO_SRGB = [[1.2249401, -0.2249404, 0], [-0.0420569, 1.0420571, 0], [-0.0196376, -0.0786361, 1.0982735]];
  const linOf = n => [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => decode(v / 255));
  const numOfLin = lin => lin.reduce((n, v) => (n << 8) | Math.round(Math.min(1, Math.max(0, encode(v))) * 255), 0);

  // OKLCH from linear sRGB, and back.
  function oklch(lin) {
    const [l, m, s] = times([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]], lin).map(Math.cbrt);
    const [L, a, b] = times([[0.2104542553, 0.793617785, -0.0040720468], [1.9779984951, -2.428592205, 0.4505937099], [0.0259040371, 0.7827717662, -0.808675766]], [l, m, s]);
    return [L, Math.hypot(a, b), Math.atan2(b, a)];
  }
  function linOfOklch(L, C, h) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const lms = [L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b].map(v => v ** 3);
    return times([[4.0767416621, -3.3077115913, 0.2309699292], [-1.2684380046, 2.6097574011, -0.3413193965], [-0.0041960863, -0.7034186147, 1.707614701]], lms);
  }
  const inside = lin => lin.every(v => v >= -1e-6 && v <= 1 + 1e-6);
  const inSrgb = lin => inside(lin), inP3 = lin => inside(times(SRGB_TO_P3, lin));
  // The most chroma a lightness and hue holds inside a gamut.
  function most(L, h, fits) {
    let lo = 0, hi = 0.5;
    for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(linOfOklch(L, mid, h))) lo = mid; else hi = mid; }
    return lo;
  }
  // A Sprites colour, as Sprites P3's: its chroma grown toward P3's edge.
  function vivid(n) {
    const [L, C, h] = oklch(linOf(n));
    const s = most(L, h, inSrgb), p = most(L, h, inP3);
    const near = s > 0 ? Math.min(1, C / s) : 0;
    return numOfLin(times(SRGB_TO_P3, linOfOklch(L, C + near * near * (p - s), h)));
  }

  // A colour's number from one space into another: exact into P3, clipped into sRGB.
  const convert = (n, from, to) => (n === -1 || from === to ? n
    : numOfLin(times(from === 'srgb' ? SRGB_TO_P3 : P3_TO_SRGB, linOf(n))));
  const cssOf = space => (space === 'srgb' ? hexOf
    : n => `color(display-p3 ${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => +(v / 255).toFixed(4)).join(' ')})`);

  // A palette's ramps, fetched once.
  const loaded = new Map();
  const palette = id => {
    const p = PALETTES.find(x => x.id === id) ?? PALETTES[0];
    if (!loaded.has(p.id)) {
      loaded.set(p.id, fetch(p.url).then(r => {
        if (!r.ok) throw new Error(`${p.url}: ${r.status}`);
        return r.json();
      }).then(json => {
        const ramps = json.ramps.map(r => ({ name: r.name, colours: r.colours.map((hex, i) => ({ n: p.vivid ? vivid(numOf(hex)) : numOf(hex), label: `${r.name} ${i + 1}` })) }));
        const all = new Map(ramps.flatMap(r => r.colours.map(c => [c.n, c])));
        const byLabel = new Map([...all.values()].map(c => [c.label, c.n]));
        return {
          ...p, ramps, css: cssOf(p.space),
          named: n => all.get(n) ?? null,
          has: n => n === -1 || all.has(n),
          // The words a colour is shown with: P3 numbers say so.
          text: n => (p.space === 'srgb' ? hexOf(n) : `P3 ${hexOf(n)}`),
          labelled: label => byLabel.get(label) ?? null,
        };
      }));
    }
    return loaded.get(p.id);
  };

  const DRAFT = 'sprites-draft';
  // The tab's own store first, then the browser's. Reaching for one can
  // throw where storage is blocked, so each is asked for when it is used.
  const STORES = [() => sessionStorage, () => localStorage];
  const draft = {
    load() {
      for (const store of STORES) {
        try {
          const d = JSON.parse(store().getItem(DRAFT) ?? 'null');
          if (d && d.w > 0 && d.h > 0 && d.px?.length === d.w * d.h) return { ...d, px: Int32Array.from(d.px) };
        } catch { /* a blocked or broken store has no draft; the next may */ }
      }
      return null;
    },
    save(d) {
      const text = JSON.stringify({ ...d, px: Array.from(d.px) });
      for (const store of STORES) {
        try { store().setItem(DRAFT, text); } catch { /* a full or blocked store keeps the last draft */ }
      }
    },
  };

  // The folder the last save went to, to start the next one in.
  const FOLDER = 'sprites-folder';
  const folder = {
    get() { try { return localStorage.getItem(FOLDER) ?? ''; } catch { return ''; } },
    set(f) { try { localStorage.setItem(FOLDER, f); } catch { /* the next save starts in the palette's folder */ } },
  };

  // The folders the gallery looks in, and the paths of drawings kept outside them,
  // the newest first.
  const SETS = [
    { name: 'Consoles', folder: 'emu/brand/consoles/', word: 'console', others: ['tv'] },
    { name: 'Logos', folder: 'emu/brand/logos/', word: 'logo', others: [] },
    { name: 'Controllers', folder: 'emu/brand/controllers/', word: 'controller', others: [] },
  ];
  const FOLDERS = [...new Set(PALETTES.map(p => p.folder)), ...SETS.map(s => s.folder)];
  // Emu's systems as its emulators file names them, fetched once.
  let named = null;
  const systems = () => (named ??= fetch('/emu/emulators.json').then(r => {
    if (!r.ok) throw new Error(`/emu/emulators.json: ${r.status}`);
    return r.json();
  }).then(json => Object.keys(json.systems)));
  // Every element, set by set: each system's, then the set's others.
  const elements = async () => {
    const all = await systems();
    return SETS.flatMap(set => [
      ...all.map(name => ({ set: set.name, name, path: `${set.folder}${name}.png`, art: `${name}-${set.word}.png` })),
      ...set.others.map(name => ({ set: set.name, name, path: `${set.folder}${name}.png`, art: `${name}.png` })),
    ]);
  };
  const KNOWN = 'sprites-known', MOST = 60;
  const known = {
    get() {
      try {
        const list = JSON.parse(localStorage.getItem(KNOWN) ?? '[]');
        return Array.isArray(list) ? list.filter(p => typeof p === 'string') : [];
      } catch { return []; }
    },
    set(list) { try { localStorage.setItem(KNOWN, JSON.stringify(list.slice(0, MOST))); } catch { /* the gallery still shows the folders */ } },
    add(path) { known.set([path, ...known.get().filter(p => p !== path)]); },
  };

  window.Sprites = Object.assign(window.Sprites || {}, { PALETTES, PRESETS, SETS, FOLDERS, elements, palette, draft, folder, known, hexOf, numOf, convert, cssOf });
})();
