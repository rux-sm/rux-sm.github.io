/* ==========================================================================
   app.js — Sprites, a pixel-art editor
   --------------------------------------------------------------------------
   THE DRAWING is files.js's { w, h, px }, drawn on one canvas at a whole
   zoom: each art pixel covers a whole number of screen pixels, worked out
   from the device's pixel ratio, so no edge is ever soft. The zoom starts at
   the largest that fits the stage and + and − change it. Clear pixels show
   the stage's checks, and from a zoom of 8 a grid lines every pixel. All of
   those colours are tokens app.css sets on the canvas, read again when the
   theme changes.

   THE TOOLS. Pencil paints the colour, eraser clears, both along the whole
   drag; fill floods the run of one colour joined edge to edge; the picker
   takes a pixel's colour and goes back to the pencil, and Alt held picks
   with any tool. Mirror repeats the pencil and eraser across the drawing's
   vertical middle, and its axis shows while it is on. Keys: B, E, G, I, M,
   + and −, 0 to fit, Cmd or Ctrl with Z to undo and with Shift to redo, and
   Cmd or Ctrl with S to save.

   UNDO. Each stroke, fill, resize, new drawing and opened file is one step,
   a hundred kept. A step holds the whole drawing and its path, which at 256
   a side at most is small.

   COLOUR comes from the palette, which data.js loads. Sprites' own palette
   leaves the colour field open beside it, and the last eight colours taken
   from outside the palette stand as swatches; Emu consoles allows only its
   twenty, and switching to it refuses while a pixel is another colour.

   SAVING. The Save window takes a path in the checkout and a format, and
   files.js writes it. Emu consoles saves only the 1× PNG, at a console's
   size. The draft, data.js's, is kept on every step, and leaving with
   changes not saved asks first.
   ========================================================================== */
(() => {
  'use strict';

  const S = window.Sprites;
  const $ = id => document.getElementById(id);
  const canvas = $('sprites-canvas'), stage = $('sprites-stage');
  const ctx = canvas.getContext('2d');
  const tools = $('sprites-tools'), mirrorKey = $('sprites-mirror');
  const undoKey = $('sprites-undo'), redoKey = $('sprites-redo');
  const LIMIT = 256, STEPS = 100, RECENT = 8;

  // The state. `dirty` is whether the drawing has changed since it was last
  // saved or opened.
  let drawing = { w: 16, h: 16, px: new Int32Array(256).fill(-1) };
  let path = null, dirty = false;
  let pal = null, colour = 0xe81013, recent = [];
  let tool = 'pencil', mirror = false, zoom = 1, fitted = true;
  let past = [], ahead = [];
  let hover = null;

  // ---- notes: one inline notification at a time, above the bar ----
  const KINDS = {
    success: { box: 'rux--inline-notification rux--inline-notification--success', icon: 'm-check_circle-fill' },
    error: { box: 'rux--inline-notification rux--inline-notification--error', icon: 'm-error-fill' },
    info: { box: 'rux--inline-notification rux--inline-notification--info', icon: 'm-info-fill' },
  };
  function note(kind, title, subtitle = '') {
    const box = $('sprites-notes');
    box.replaceChildren();
    if (!title) return;
    const n = document.createElement('div');
    n.className = KINDS[kind].box;
    n.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    n.innerHTML = `<div class="rux--inline-notification__details">
      <svg class="rux--inline-notification__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#${KINDS[kind].icon}"/></svg>
      <div class="rux--inline-notification__text-wrapper"><div class="rux--inline-notification__title"></div><div class="rux--inline-notification__subtitle"></div></div>
    </div>
    <button type="button" class="rux--inline-notification__close-button" aria-label="Close notification"><svg class="rux--inline-notification__close-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#m-close"/></svg></button>`;
    n.querySelector('.rux--inline-notification__title').textContent = title;
    n.querySelector('.rux--inline-notification__subtitle').textContent = subtitle;
    box.append(n);
  }

  // ---- drawing on the canvas ----
  const css = name => getComputedStyle(canvas).getPropertyValue(name).trim();
  let look = {};
  const readLook = () => { look = { a: css('--sprites-check-a'), b: css('--sprites-check-b'), grid: css('--sprites-grid'), axis: css('--sprites-axis'), hover: css('--sprites-hover') }; };

  // Screen pixels an art pixel covers: whole, so every edge is sharp.
  const cell = () => Math.max(1, Math.round(zoom * (window.devicePixelRatio || 1)));

  function render() {
    const { w, h, px } = drawing;
    const p = cell(), dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * p || canvas.height !== h * p) {
      canvas.width = w * p;
      canvas.height = h * p;
    }
    canvas.style.width = `${(w * p) / dpr}px`;
    canvas.style.height = `${(h * p) / dpr}px`;
    const half = p >= 8 ? Math.floor(p / 2) : p;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = px[y * w + x];
        if (v === -1) {
          // A clear pixel: four checks once it is big enough to show them.
          ctx.fillStyle = look.a;
          ctx.fillRect(x * p, y * p, p, p);
          ctx.fillStyle = look.b;
          if (half < p) {
            ctx.fillRect(x * p + half, y * p, p - half, half);
            ctx.fillRect(x * p, y * p + half, half, p - half);
          } else if ((x + y) % 2) ctx.fillRect(x * p, y * p, p, p);
        } else {
          ctx.fillStyle = S.hexOf(v);
          ctx.fillRect(x * p, y * p, p, p);
        }
      }
    }
    if (zoom >= 8) {
      ctx.fillStyle = look.grid;
      for (let x = 1; x < w; x++) ctx.fillRect(x * p, 0, 1, h * p);
      for (let y = 1; y < h; y++) ctx.fillRect(0, y * p, w * p, 1);
    }
    if (mirror) {
      ctx.fillStyle = look.axis;
      const at = Math.round((w * p) / 2), thick = Math.max(1, Math.round(dpr));
      ctx.fillRect(at - Math.floor(thick / 2), 0, thick, h * p);
    }
    if (hover) {
      ctx.strokeStyle = look.hover;
      ctx.lineWidth = 1;
      const marks = mirror && tool !== 'fill' && tool !== 'picker' ? [hover.x, w - 1 - hover.x] : [hover.x];
      for (const x of marks) ctx.strokeRect(x * p + 0.5, hover.y * p + 0.5, p - 1, p - 1);
    }
  }

  // The largest whole zoom at which the drawing fits the stage.
  function fit() {
    const pad = parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    const room = Math.min((stage.clientWidth - pad) / drawing.w, (stage.clientHeight - pad) / drawing.h);
    zoom = Math.max(1, Math.min(64, Math.floor(room)));
    fitted = true;
  }

  function setZoom(z) {
    zoom = Math.max(1, Math.min(64, z));
    fitted = false;
    show();
  }

  // Everything around the canvas that says what the drawing is.
  function show() {
    render();
    $('sprites-zoom').textContent = `${zoom}×`;
    undoKey.disabled = !past.length;
    redoKey.disabled = !ahead.length;
    const where = hover ? ` · pixel ${hover.x}, ${hover.y}` : '';
    $('sprites-size-text').textContent = `${drawing.w} × ${drawing.h}${where}`;
    $('sprites-path').textContent = path ?? 'Not saved yet';
    $('sprites-where').textContent = dirty ? 'Changes not saved.' : (path ? 'Saved.' : '');
    canvas.setAttribute('aria-label', `The drawing, ${drawing.w} by ${drawing.h} pixels`);
  }

  // ---- steps ----
  const snapshot = () => ({ w: drawing.w, h: drawing.h, px: drawing.px.slice(), path });
  let pending = null;
  const begin = () => { pending = snapshot(); };
  function commit(changed = true) {
    if (pending && changed) {
      past.push(pending);
      if (past.length > STEPS) past.shift();
      ahead = [];
      dirty = true;
      keep();
    }
    pending = null;
    show();
  }
  function move(from, to) {
    if (!from.length) return;
    to.push(snapshot());
    const s = from.pop();
    drawing = { w: s.w, h: s.h, px: s.px };
    path = s.path;
    dirty = true;
    if (fitted) fit();
    keep();
    show();
  }

  const keep = () => S.draft.save({ ...drawing, path, dirty, palette: pal?.id, colour, recent });

  // ---- the tools ----
  let changed = false;
  function put(x, y, v) {
    const { w, h, px } = drawing;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (px[i] !== v) { px[i] = v; changed = true; }
  }
  function paint(x, y) {
    const v = tool === 'eraser' ? -1 : colour;
    put(x, y, v);
    if (mirror) put(drawing.w - 1 - x, y, v);
  }
  // Every pixel on the straight line between two, so a fast drag leaves no gaps.
  function line(a, b) {
    let { x, y } = a;
    const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      paint(x, y);
      if (x === b.x && y === b.y) return;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  function flood(x, y) {
    const { w, h, px } = drawing;
    const from = px[y * w + x];
    if (from === colour) return;
    const todo = [y * w + x];
    while (todo.length) {
      const i = todo.pop();
      if (px[i] !== from) continue;
      px[i] = colour;
      changed = true;
      const cx = i % w, cy = (i - cx) / w;
      if (cx > 0) todo.push(i - 1);
      if (cx < w - 1) todo.push(i + 1);
      if (cy > 0) todo.push(i - w);
      if (cy < h - 1) todo.push(i + w);
    }
  }
  function pick(x, y, back) {
    const v = drawing.px[y * drawing.w + x];
    if (v === -1) setTool('eraser');
    else {
      setColour(v);
      if (back) setTool('pencil');
    }
  }

  function setTool(t) {
    tool = t;
    const option = tools.querySelector(`[data-tool="${t}"]`);
    window.Rux?.contentSwitcher?.select(tools, option, { focus: false, silent: true });
    render();
  }
  tools.addEventListener('rux:content-switcher-selected', e => { tool = e.detail.option.dataset.tool; render(); });

  function setMirror(on) {
    mirror = on;
    mirrorKey.setAttribute('aria-pressed', String(on));
    mirrorKey.classList.toggle('rux--btn--selected', on);
    render();
  }
  mirrorKey.addEventListener('click', () => setMirror(!mirror));

  // The art pixel under a pointer.
  function at(e) {
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor(((e.clientX - r.left) / r.width) * drawing.w), y: Math.floor(((e.clientY - r.top) / r.height) * drawing.h) };
  }
  const inside = c => c.x >= 0 && c.y >= 0 && c.x < drawing.w && c.y < drawing.h;

  let last = null;
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const c = at(e);
    if (!inside(c)) return;
    e.preventDefault();
    const using = e.altKey ? 'picker' : tool;
    if (using === 'picker') { pick(c.x, c.y, !e.altKey); return; }
    begin();
    changed = false;
    if (using === 'fill') { flood(c.x, c.y); commit(changed); return; }
    canvas.setPointerCapture(e.pointerId);
    last = c;
    paint(c.x, c.y);
    render();
  });
  canvas.addEventListener('pointermove', e => {
    const c = at(e);
    hover = inside(c) ? c : null;
    if (last) {
      line(last, c);
      last = c;
    }
    show();
  });
  const end = () => {
    if (!last) return;
    last = null;
    commit(changed);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { hover = null; show(); });

  undoKey.addEventListener('click', () => move(past, ahead));
  redoKey.addEventListener('click', () => move(ahead, past));
  $('sprites-zoom-in').addEventListener('click', () => setZoom(zoom + 1));
  $('sprites-zoom-out').addEventListener('click', () => setZoom(zoom - 1));

  // ---- colour ----
  function swatch(hex, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sprites-swatch';
    b.style.setProperty('--sprites-swatch', hex);
    b.dataset.colour = String(S.numOf(hex));
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${label}, ${hex}`);
    b.title = `${label}, ${hex}`;
    return b;
  }
  function drawSwatches() {
    const box = $('sprites-ramps');
    box.replaceChildren(...pal.ramps.map(r => {
      const row = document.createElement('div');
      row.className = 'sprites-ramp';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', r.name);
      row.append(...r.colours.map(c => swatch(c.hex, c.label)));
      return row;
    }));
    $('sprites-free').hidden = !pal.free;
    drawRecent();
    markColour();
  }
  function drawRecent() {
    $('sprites-recent').replaceChildren(...recent.map(v => swatch(S.hexOf(v), 'Recent')));
  }
  function markColour() {
    document.querySelectorAll('.sprites-swatch[data-colour]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.colour) === colour)));
    const current = $('sprites-current');
    current.style.setProperty('--sprites-swatch', S.hexOf(colour));
    const named = pal?.ramps.flatMap(r => r.colours).find(c => S.numOf(c.hex) === colour);
    $('sprites-current-name').textContent = named ? `${named.label}, ${named.hex}` : S.hexOf(colour);
  }
  function setColour(v, fromField = false) {
    colour = v;
    if (pal && !pal.has(v)) {
      recent = [v, ...recent.filter(r => r !== v)].slice(0, RECENT);
      drawRecent();
    }
    if (!fromField) $('sprites-colour-field').value = S.hexOf(v);
    if (tool === 'eraser' || tool === 'picker') setTool('pencil');
    markColour();
    keep();
  }
  document.querySelector('.sprites-side').addEventListener('click', e => {
    const b = e.target.closest('.sprites-swatch[data-colour]');
    if (b) setColour(Number(b.dataset.colour));
  });
  $('sprites-colour-field').addEventListener('change', e => setColour(S.numOf(e.target.value), true));

  async function usePalette(id, quiet = false) {
    const next = await S.palette(id);
    const stray = drawing.px.filter(v => !next.has(v)).length;
    if (stray) {
      $('sprites-palette').value = pal.id;
      note('error', `${stray} ${stray === 1 ? 'pixel is a colour' : 'pixels are colours'} outside ${next.name}.`, 'Repaint them, or start a new drawing, before switching.');
      return false;
    }
    pal = next;
    $('sprites-palette').value = pal.id;
    if (!pal.has(colour) || colour === -1) colour = S.numOf(pal.ramps[0].colours[0].hex);
    drawSwatches();
    if (!quiet) keep();
    return true;
  }
  $('sprites-palette').addEventListener('change', e => usePalette(e.target.value));

  // ---- size ----
  const presetSelect = $('sprites-preset'), widthField = $('sprites-width'), heightField = $('sprites-height');
  const sizeOf = () => ({ w: Math.round(Number(widthField.value)), h: Math.round(Number(heightField.value)) });
  const presetOf = (w, h) => Object.keys(S.PRESETS).find(k => S.PRESETS[k].w === w && S.PRESETS[k].h === h)
    ?? (h === 24 && w <= 36 ? 'handheld' : 'free');
  presetSelect.addEventListener('change', () => {
    const p = S.PRESETS[presetSelect.value];
    if (p) { widthField.value = p.w; heightField.value = p.h; }
  });
  const syncPreset = () => { const { w, h } = sizeOf(); presetSelect.value = presetOf(w, h); };
  widthField.addEventListener('input', syncPreset);
  heightField.addEventListener('input', syncPreset);
  widthField.addEventListener('change', syncPreset);
  heightField.addEventListener('change', syncPreset);
  $('sprites-size').addEventListener('click', () => {
    widthField.value = drawing.w;
    heightField.value = drawing.h;
    presetSelect.value = presetOf(drawing.w, drawing.h);
  });
  function newSize(blank) {
    const { w, h } = sizeOf();
    if (!(w >= 1 && h >= 1 && w <= LIMIT && h <= LIMIT)) { note('error', `A drawing is 1 to ${LIMIT} pixels a side.`); return; }
    begin();
    const px = new Int32Array(w * h).fill(-1);
    if (!blank) {
      // Anchored to the bottom left, because a console stands on its bottom row.
      const lift = h - drawing.h;
      for (let y = 0; y < drawing.h; y++) {
        for (let x = 0; x < Math.min(w, drawing.w); x++) {
          const ny = y + lift;
          if (ny >= 0 && ny < h) px[ny * w + x] = drawing.px[y * drawing.w + x];
        }
      }
    } else path = null;
    drawing = { w, h, px };
    fit();
    commit(true);
    window.Rux?.modal?.close('sprites-size-modal');
    note('', '');
  }
  $('sprites-resize').addEventListener('click', () => newSize(false));
  $('sprites-new').addEventListener('click', () => newSize(true));

  // ---- open ----
  $('sprites-open').addEventListener('click', async () => {
    try {
      const got = await S.files.open();
      if (!got) return;
      const read = await S.files.read(got.file);
      // A console drawing opens in its palette; anything else that the
      // palette in use cannot draw opens in Sprites' own.
      const emu = await S.palette('emu-consoles');
      const fitsEmu = read.px.every(v => emu.has(v));
      const want = got.path?.startsWith(emu.folder) && fitsEmu ? 'emu-consoles'
        : read.px.every(v => pal.has(v)) ? pal.id : 'sprites';
      begin();
      drawing = { w: read.w, h: read.h, px: read.px };
      path = got.path;
      await usePalette(want, true);
      fit();
      commit(true);
      dirty = false;
      keep();
      show();
      note('success', `Opened ${got.path ?? got.file.name}.`,
        read.soft ? `${read.soft} half-clear ${read.soft === 1 ? 'pixel was' : 'pixels were'} made opaque or clear.` : '');
    } catch (err) {
      if (err.name !== 'AbortError') note('error', 'Could not open it.', err.message);
    }
  });

  // ---- save ----
  const pathField = $('sprites-save-path'), formatField = $('sprites-format');
  const pathError = msg => {
    const wrap = $('sprites-save-path-wrap');
    for (const el of [wrap, pathField]) {
      if (msg) el.setAttribute('data-invalid', ''); else el.removeAttribute('data-invalid');
    }
    $('sprites-save-path-icon').hidden = !msg;
    pathField.classList.toggle('rux--text-input--invalid', !!msg);
    pathField.setAttribute('aria-invalid', String(!!msg));
    $('sprites-save-error').textContent = msg;
  };
  const extFor = f => (f === 'svg' ? 'svg' : 'png');
  function openSave() {
    const formats = [...formatField.options];
    formats.forEach(o => { o.hidden = o.disabled = !pal.free && o.value !== 'png1'; });
    if (!pal.free) formatField.value = 'png1';
    const folder = path ? path.replace(/[^/]*$/, '') : (S.folder.get() || pal.folder);
    const name = path ? path.split('/').at(-1) : 'drawing.png';
    pathField.value = (folder + name).replace(/\.(png|svg)$/, `.${extFor(formatField.value)}`);
    $('sprites-save-help').textContent = S.files.canWrite
      ? (pal.free ? 'Written straight into the checkout.' : `Written straight into the checkout. ${pal.rule}`)
      : 'This browser cannot write into the checkout, so it downloads the file; move it to this path.';
    pathError('');
    window.Rux?.modal?.open('sprites-save-modal', $('sprites-save'));
  }
  $('sprites-save').addEventListener('click', openSave);
  formatField.addEventListener('change', () => {
    pathField.value = pathField.value.replace(/\.(png|svg)$/, `.${extFor(formatField.value)}`);
  });
  pathField.addEventListener('input', () => pathError(''));
  pathField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

  async function save() {
    const target = pathField.value.trim();
    const bad = S.files.checkPath(target);
    if (bad) { pathError(bad); return; }
    const format = formatField.value;
    if (!target.endsWith(`.${extFor(format)}`)) { pathError(`An ${extFor(format).toUpperCase()} ends in .${extFor(format)}.`); return; }
    if (pal.fits && !pal.fits(drawing.w, drawing.h)) { pathError(`This is ${drawing.w} × ${drawing.h}. ${pal.rule}`); return; }
    try {
      const blob = format === 'svg' ? S.files.svg(drawing) : await S.files.png(drawing, Number(format.slice(3)));
      if (S.files.canWrite) await S.files.write(target, blob);
      else S.files.download(target, blob);
      // The path is the drawing's only when the file holds it as drawn.
      if (format === 'png1') path = target;
      dirty = false;
      S.folder.set(target.replace(/[^/]*$/, ''));
      keep();
      show();
      window.Rux?.modal?.close('sprites-save-modal');
      const after = pal.after && target.startsWith(pal.folder) ? pal.after : '';
      note('success', S.files.canWrite ? `Saved ${target}.` : `Downloaded ${target.split('/').at(-1)}.`, after);
    } catch (err) {
      if (err.name !== 'AbortError') pathError(err.message);
    }
  }
  $('sprites-save-go').addEventListener('click', save);

  // ---- keys ----
  const typing = t => t instanceof Element && t.closest('input, select, textarea, [contenteditable]');
  document.addEventListener('keydown', e => {
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); if (!document.querySelector('.rux--modal.is-visible')) openSave(); return; }
    if (typing(e.target) || document.querySelector('.rux--modal.is-visible')) return;
    if (cmd && e.key.toLowerCase() === 'z') { e.preventDefault(); move(e.shiftKey ? ahead : past, e.shiftKey ? past : ahead); return; }
    if (cmd && e.key.toLowerCase() === 'y') { e.preventDefault(); move(ahead, past); return; }
    if (cmd || e.altKey) return;
    const keys = { b: () => setTool('pencil'), p: () => setTool('pencil'), e: () => setTool('eraser'), g: () => setTool('fill'), i: () => setTool('picker'), m: () => setMirror(!mirror), '+': () => setZoom(zoom + 1), '=': () => setZoom(zoom + 1), '-': () => setZoom(zoom - 1), 0: () => { fit(); show(); } };
    const act = keys[e.key.toLowerCase()];
    if (act) { e.preventDefault(); act(); }
  });

  window.addEventListener('beforeunload', e => { if (dirty) e.preventDefault(); });

  // The theme's colours change the canvas's, and a new size or pixel ratio its fit.
  new MutationObserver(() => { readLook(); render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readLook(); render(); });
  new ResizeObserver(() => { if (fitted) fit(); show(); }).observe(stage);

  // ---- start: the draft, or a blank icon ----
  (async () => {
    const d = S.draft.load();
    if (d) {
      drawing = { w: d.w, h: d.h, px: d.px };
      path = d.path ?? null;
      dirty = !!d.dirty;
      colour = Number.isInteger(d.colour) ? d.colour : colour;
      recent = Array.isArray(d.recent) ? d.recent.filter(Number.isInteger).slice(0, RECENT) : [];
    }
    pal = await S.palette('sprites');
    try {
      if (!(await usePalette(d?.palette ?? 'sprites', true))) await usePalette('sprites', true);
    } catch (err) {
      note('error', 'Could not load the palette.', err.message);
    }
    $('sprites-colour-field').value = S.hexOf(colour === -1 ? 0 : colour);
    readLook();
    fit();
    show();
  })();
})();
