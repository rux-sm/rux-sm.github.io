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

   SELECT drags a box over part of the drawing; a drag that starts inside
   the box moves what is in it, and the arrow keys move it a pixel. The
   moved pixels leave clear ones behind and cover what they land on, less
   their own clear pixels. They are held apart from the drawing while the
   box stands, so a part dragged past the edge comes back when it is dragged
   in again; any other step, or dropping the box, cuts it at the edge. A
   press outside the box, Escape or another tool drops it. Keys: S, and Cmd
   or Ctrl with A to select the whole drawing, and Delete to clear what the
   box holds. Crop, in the bar while a box stands, makes the box the whole
   drawing, as one step. A press on the canvas gives it the keys, so an
   arrow moves the box and not the tool switcher's choice.

   UNDO. Each stroke, fill, resize, new drawing and opened file is one step,
   a hundred kept. A step holds the whole drawing and its path, which at 256
   a side at most is small.

   COLOUR comes from the palette, which data.js loads. Sprites' own palette
   and Sprites P3 leave the colour field open beside them, and the last
   eight colours taken from outside the palette stand as swatches.
   Switching palettes carries each pixel
   to the colour of the same label, or into the new palette's colour space
   when it allows any colour, and refuses while a pixel has nowhere to go.
   The canvas is a Display P3 one, so a P3 colour shows as itself on a
   screen that can show it.

   THE GALLERY is the first view, and the editor the second, at #draw, so
   a reload stays where it was and Back leaves the editor. The gallery's
   tiles are New drawing, then the drawing with changes no file holds, then
   in Chrome every picture in the palettes' folders and every drawing this
   browser saved or opened elsewhere, the last changed first, less the
   drawings an element shows. Every picture is drawn at one scale, 2× to
   8× from the bar and 3× at first, so drawings show
   their true sizes beside each other. Under them stands each of Emu's sets beneath
   its name, a tile for each element in Emu's order: the drawing assigned
   to it, or an empty tile that starts a new drawing for it. Chrome reads
   the checkout only once it is allowed, which takes a click on each visit
   unless it was allowed for good, so until then a button stands where the
   saved tiles will. Browse is the file picker, for any other file.

   SAVING. The Save window takes a path in the checkout and a format, and
   files.js writes it in the palette's colour space. A 1× PNG or an SVG
   holds the drawing as drawn, so its path becomes the drawing's; a larger
   PNG is a copy, and leaves the drawing's changes not saved. A new drawing
   is offered a name no file has, and a path that holds another file is
   written over only on a second Save. The draft, data.js's, is kept on
   every step.

   A DRAWING'S MENU, from a right click on its tile: Rename, Duplicate,
   Assign to and Delete. Rename keeps the drawing's folder and kind and
   carries its elements with it. Duplicate copies it beside itself under a
   free name, shown by no element. Delete asks first and takes the file
   away; it is not offered on a drawing an element shows, which is
   unassigned first. The drawing in hand follows a rename, and goes with
   its file on a delete, leaving a blank one its size. The Not saved
   tile's menu has Discard changes, which asks, then puts the drawing back
   as its file holds it, or blank where it has none.

   ASSIGNING. Assign to, in a drawing's menu, picks an element, whose file is then written from the drawing; a drawing
   can be several elements'. Unassign, on an element's tile, leaves it with
   no drawing and takes its file away. Saving a drawing writes each of its
   elements' files again, and a drawing started from an empty tile is
   assigned to that element on its first save.

   CHANGES NOT SAVED. Leaving the page asks first, and so do a tile, Browse
   and New drawing, which replace the drawing: undo would bring it back
   only until the page is loaded again. None asks over a drawing with no
   pixels. Going to the gallery replaces nothing, so it asks nothing.
   ========================================================================== */
(() => {
  'use strict';

  const S = window.Sprites;
  const $ = id => document.getElementById(id);
  const canvas = $('sprites-canvas'), stage = $('sprites-stage');
  const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
  const tools = $('sprites-tools'), mirrorKey = $('sprites-mirror');
  const undoKey = $('sprites-undo'), redoKey = $('sprites-redo'), cropKey = $('sprites-crop');
  const LIMIT = 256, STEPS = 100, RECENT = 8;

  // The state. `dirty` is whether the drawing has changed since it was last
  // saved or opened.
  let drawing = { w: 16, h: 16, px: new Int32Array(256).fill(-1) };
  // The drawing's file, and the element its first save assigns it to.
  let path = null, assignTo = null, dirty = false;
  let pal = null, colour = 0xe81013, recent = [];
  let tool = 'pencil', mirror = false, zoom = 1, fitted = true;
  let past = [], ahead = [];
  let hover = null;
  // The selection: its box in art pixels, and once moved the pixels it holds,
  // `piece`, and the drawing without them, `base`.
  let sel = null;

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
          ctx.fillStyle = pal ? pal.css(v) : S.hexOf(v);
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
      const marks = mirror && (tool === 'pencil' || tool === 'eraser') ? [hover.x, w - 1 - hover.x] : [hover.x];
      for (const x of marks) ctx.strokeRect(x * p + 0.5, hover.y * p + 0.5, p - 1, p - 1);
    }
    if (sel) {
      // The box: dashes over a solid line, so it shows on any colour.
      const box = [sel.x * p + 0.5, sel.y * p + 0.5, sel.w * p - 1, sel.h * p - 1];
      ctx.lineWidth = 1;
      ctx.strokeStyle = look.a;
      ctx.strokeRect(...box);
      ctx.strokeStyle = look.hover;
      ctx.setLineDash([Math.max(2, Math.round(dpr * 4))]);
      ctx.strokeRect(...box);
      ctx.setLineDash([]);
    }
    // Crop is there to press only while a box stands, and the box is drawn here.
    cropKey.disabled = !sel;
    // Over the box the pointer says it moves; elsewhere it is app.css's.
    canvas.style.cursor = tool === 'select' && hover && within(hover) ? 'move' : '';
  }

  // The largest whole zoom at which the drawing fits the stage.
  function fit() {
    const pad = parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    const room = Math.min((stage.clientWidth - pad) / drawing.w, (stage.clientHeight - pad) / drawing.h);
    zoom = Math.max(ZOOMS[0], Math.min(ZOOMS[1], Math.floor(room)));
    fitted = true;
  }

  const ZOOMS = [1, 64];
  function setZoom(z) {
    zoom = Math.max(ZOOMS[0], Math.min(ZOOMS[1], z));
    fitted = false;
    show();
  }

  // Everything around the canvas that says what the drawing is.
  function show() {
    render();
    $('sprites-zoom').textContent = `${zoom}×`;
    $('sprites-zoom-out').disabled = zoom <= ZOOMS[0];
    $('sprites-zoom-in').disabled = zoom >= ZOOMS[1];
    undoKey.disabled = !past.length;
    redoKey.disabled = !ahead.length;
    const where = hover ? ` · pixel ${hover.x}, ${hover.y}` : '';
    $('sprites-size-text').textContent = `${drawing.w} × ${drawing.h}${where}`;
    $('sprites-path').textContent = path ?? 'Not saved yet';
    $('sprites-where').textContent = dirty ? 'Changes not saved.' : (path ? 'Saved.' : '');
    canvas.setAttribute('aria-label', `The drawing, ${drawing.w} by ${drawing.h} pixels`);
  }

  // ---- steps ----
  const snapshot = () => ({ w: drawing.w, h: drawing.h, px: drawing.px.slice(), path, assignTo, palette: pal?.id });
  let pending = null;
  // A step begins. Any but a move of the selection ends its hold on its pixels.
  const begin = (moving = false) => { pending = snapshot(); if (!moving) settle(); };
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
    assignTo = s.assignTo ?? null;
    sel = null;
    // A step taken in another palette brings it back, already loaded.
    if (s.palette && s.palette !== pal.id) setPal(palettes.get(s.palette));
    dirty = true;
    if (fitted) fit();
    keep();
    show();
  }

  const keep = () => S.draft.save({ ...drawing, path, assignTo, dirty, palette: pal?.id, colour, recent });

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

  // ---- select ----
  const within = c => sel && c.x >= sel.x && c.y >= sel.y && c.x < sel.x + sel.w && c.y < sel.y + sel.h;
  // The box cut to the drawing, holding no pixels of its own; none where nothing of it is left.
  function settle() {
    if (!sel) return;
    const x = Math.max(0, sel.x), y = Math.max(0, sel.y);
    const w = Math.min(drawing.w, sel.x + sel.w) - x, h = Math.min(drawing.h, sel.y + sel.h) - y;
    sel = w > 0 && h > 0 ? { x, y, w, h } : null;
  }
  // Takes the box's pixels out of the drawing, once, to be carried.
  function lift() {
    if (sel.piece) return;
    const { w, px } = drawing;
    sel.piece = new Int32Array(sel.w * sel.h);
    sel.base = px.slice();
    for (let y = 0; y < sel.h; y++) {
      for (let x = 0; x < sel.w; x++) {
        const i = (sel.y + y) * w + sel.x + x;
        sel.piece[y * sel.w + x] = px[i];
        sel.base[i] = -1;
      }
    }
  }
  // The drawing as its base with the carried pixels over it where the box is.
  function place() {
    const { w, h, px } = drawing;
    px.set(sel.base);
    for (let y = 0; y < sel.h; y++) {
      for (let x = 0; x < sel.w; x++) {
        const v = sel.piece[y * sel.w + x], nx = sel.x + x, ny = sel.y + y;
        if (v !== -1 && nx >= 0 && ny >= 0 && nx < w && ny < h) px[ny * w + nx] = v;
      }
    }
  }
  // The box moved by whole pixels, as one step.
  function nudge(dx, dy) {
    begin(true);
    lift();
    sel.x += dx;
    sel.y += dy;
    place();
    commit(true);
  }
  const dropSel = () => { sel = null; render(); };
  // What the box holds, cleared, as one step; the box stays.
  function clearSel() {
    begin(true);
    lift();
    const had = sel.piece.some(v => v !== -1);
    sel.piece.fill(-1);
    place();
    commit(had);
  }
  // The box becomes the whole drawing: what is outside it goes, and so does
  // any of it past the drawing's edge.
  function crop() {
    begin();
    if (!sel) { commit(false); return; }
    const { x, y, w, h } = sel, from = drawing;
    const px = new Int32Array(w * h);
    for (let row = 0; row < h; row++) px.set(from.px.subarray((y + row) * from.w + x, (y + row) * from.w + x + w), row * w);
    sel = null;
    drawing = { w, h, px };
    fit();
    commit(w !== from.w || h !== from.h);
  }
  cropKey.addEventListener('click', crop);

  function setTool(t) {
    tool = t;
    if (t !== 'select') sel = null;
    const option = tools.querySelector(`[data-tool="${t}"]`);
    window.Rux?.contentSwitcher?.select(tools, option, { focus: false, silent: true });
    render();
  }
  tools.addEventListener('rux:content-switcher-selected', e => { tool = e.detail.option.dataset.tool; if (tool !== 'select') sel = null; render(); });

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

  // A drag of the select tool: `box` draws one from its first corner, `grab`
  // carries the one there from where it stood.
  let last = null, box = null, grab = null;
  const clamp = c => ({ x: Math.max(0, Math.min(drawing.w - 1, c.x)), y: Math.max(0, Math.min(drawing.h - 1, c.y)) });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const c = at(e);
    if (!inside(c)) return;
    e.preventDefault();
    // The keys follow the press, off whatever control had them.
    canvas.focus({ preventScroll: true });
    const using = e.altKey ? 'picker' : tool;
    if (using === 'picker') { pick(c.x, c.y, !e.altKey); return; }
    if (using === 'select') {
      canvas.setPointerCapture(e.pointerId);
      if (within(c)) {
        begin(true);
        lift();
        grab = { from: c, x: sel.x, y: sel.y };
      } else {
        // A press outside drops the box; a drag from there draws the next.
        sel = null;
        box = c;
      }
      render();
      return;
    }
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
    if (grab) {
      sel.x = grab.x + c.x - grab.from.x;
      sel.y = grab.y + c.y - grab.from.y;
      place();
    }
    if (box) {
      const to = clamp(c);
      sel = to.x === box.x && to.y === box.y && !sel ? null
        : { x: Math.min(box.x, to.x), y: Math.min(box.y, to.y), w: Math.abs(to.x - box.x) + 1, h: Math.abs(to.y - box.y) + 1 };
    }
    show();
  });
  const end = () => {
    box = null;
    if (grab) {
      const moved = sel.x !== grab.x || sel.y !== grab.y;
      grab = null;
      commit(moved);
      return;
    }
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
  function swatch(n, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sprites-swatch';
    b.style.setProperty('--sprites-swatch', pal.css(n));
    b.dataset.colour = String(n);
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', `${label}, ${pal.text(n)}`);
    b.title = `${label}, ${pal.text(n)}`;
    return b;
  }
  function drawSwatches() {
    const box = $('sprites-ramps');
    // A ramp shorter than the widest stands in its middle, so Sprites' eight
    // tones sit under the eight greys between black and white.
    const widest = Math.max(...pal.ramps.map(r => r.colours.length));
    box.replaceChildren(...pal.ramps.map(r => {
      const row = document.createElement('div');
      row.className = 'sprites-ramp';
      row.style.setProperty('--sprites-indent', String(Math.floor((widest - r.colours.length) / 2)));
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', r.name);
      row.append(...r.colours.map(c => swatch(c.n, c.label)));
      return row;
    }));
    $('sprites-free').hidden = !pal.free;
    drawRecent();
    markColour();
  }
  function drawRecent() {
    $('sprites-recent').replaceChildren(...recent.map(v => swatch(v, 'Recent')));
  }
  function markColour() {
    document.querySelectorAll('.sprites-swatch[data-colour]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.colour) === colour)));
    const current = $('sprites-current');
    current.style.setProperty('--sprites-swatch', pal.css(colour));
    const named = pal.named(colour);
    $('sprites-current-name').textContent = named ? `${named.label}, ${pal.text(colour)}` : pal.text(colour);
  }
  function setColour(v, fromField = false) {
    colour = v;
    if (pal && !pal.has(v)) {
      recent = [v, ...recent.filter(r => r !== v)].slice(0, RECENT);
      drawRecent();
    }
    if (!fromField) showField();
    if (tool === 'eraser' || tool === 'picker') setTool('pencil');
    markColour();
    keep();
  }
  document.querySelector('.sprites-side').addEventListener('click', e => {
    const b = e.target.closest('.sprites-swatch[data-colour]');
    if (b) setColour(Number(b.dataset.colour));
  });
  // The colour field speaks sRGB, so a P3 colour shows in it clipped, and
  // one picked there is carried into the palette's space.
  const showField = () => { $('sprites-colour-field').value = S.hexOf(S.convert(colour, pal.space, 'srgb')); };
  $('sprites-colour-field').addEventListener('change', e => setColour(S.convert(S.numOf(e.target.value), 'srgb', pal.space), true));

  // Every palette used so far, so undo can step back into one at once.
  const palettes = new Map();
  // A colour of one palette as another's: the colour of the same label,
  // else the same colour in the new space where any colour is allowed;
  // null where it has nowhere to go.
  const carry = (from, to) => v => {
    if (v === -1) return -1;
    const named = from.named(v);
    const twin = named ? to.labelled(named.label) : null;
    if (twin !== null) return twin;
    const same = S.convert(v, from.space, to.space);
    return to.free || to.has(same) ? same : null;
  };

  // The palette in use, and its swatches; the colours in hand follow it.
  function setPal(next, from = pal) {
    palettes.set(next.id, next);
    if (from && from !== next) {
      const shift = carry(from, next);
      colour = shift(colour) ?? -1;
      recent = recent.map(shift).filter(v => v !== null && v !== -1 && !next.has(v));
    }
    pal = next;
    $('sprites-palette').value = pal.id;
    if (colour === -1 || !(pal.free || pal.has(colour))) colour = pal.ramps[0].colours[0].n;
    showField();
    drawSwatches();
  }

  async function usePalette(id) {
    const next = await S.palette(id);
    if (next === pal) return;
    const move = carry(pal, next);
    const px = Array.from(drawing.px, move);
    const stray = px.filter(v => v === null).length;
    if (stray) {
      $('sprites-palette').value = pal.id;
      note('error', `${stray} ${stray === 1 ? 'pixel is a colour' : 'pixels are colours'} outside ${next.name}.`, 'Repaint them, or start a new drawing, before switching.');
      return;
    }
    begin();
    drawing = { ...drawing, px: Int32Array.from(px) };
    setPal(next);
    commit(drawing.px.some((v, i) => v !== pending.px[i]));
    keep();
    note('', '');
    gamutNote();
  }

  // A P3 palette on a screen that cannot show P3 says what it is drawing.
  function gamutNote() {
    if (pal.space === 'display-p3' && !window.matchMedia('(color-gamut: p3)').matches) {
      note('info', 'This screen shows only sRGB.', `${pal.name}'s most vivid colours look duller here than on a P3 screen, and some steps look alike.`);
    }
  }
  $('sprites-palette').addEventListener('change', e => usePalette(e.target.value));

  // ---- size ----
  const presetSelect = $('sprites-preset'), widthField = $('sprites-width'), heightField = $('sprites-height');
  const sizeOf = () => ({ w: Math.round(Number(widthField.value)), h: Math.round(Number(heightField.value)) });
  const presetOf = (w, h) => Object.keys(S.PRESETS).find(k => S.PRESETS[k].w === w && S.PRESETS[k].h === h)
    ?? (h === 24 && w >= 1 && w <= 36 ? 'handheld' : 'free');
  presetSelect.addEventListener('change', () => {
    const p = S.PRESETS[presetSelect.value];
    if (p) { widthField.value = p.w; heightField.value = p.h; syncPreset(); }
  });
  const syncPreset = () => { const { w, h } = sizeOf(); presetSelect.value = presetOf(w, h); sizeError(widthField, w, true); sizeError(heightField, h, true); };
  // A side out of range says so under its own field; `clear` only takes the
  // words away once it is in range again. True where the side is good.
  function sizeError(field, n, clear = false) {
    const good = n >= 1 && n <= LIMIT;
    if (good || !clear) {
      const box = field.closest('.rux--number');
      if (good) box.removeAttribute('data-invalid'); else box.setAttribute('data-invalid', '');
      field.setAttribute('aria-invalid', String(!good));
      box.querySelector('.rux--form-requirement').textContent = good ? '' : `1 to ${LIMIT} pixels.`;
    }
    return good;
  }
  widthField.addEventListener('input', syncPreset);
  heightField.addEventListener('input', syncPreset);
  widthField.addEventListener('change', syncPreset);
  heightField.addEventListener('change', syncPreset);
  // What a new drawing starts with: an empty tile's path and element, or none.
  let start = null;
  function sizeFor(resizing, at = null) {
    start = at;
    widthField.value = drawing.w;
    heightField.value = drawing.h;
    sizeError(widthField, drawing.w);
    sizeError(heightField, drawing.h);
    presetSelect.value = presetOf(drawing.w, drawing.h);
    $('sprites-resize').hidden = !resizing;
  }
  $('sprites-size').addEventListener('click', () => sizeFor(true));
  $('sprites-new-tile').addEventListener('click', () => {
    sizeFor(false);
    window.Rux?.modal?.open('sprites-size-modal', $('sprites-new-tile'));
  });
  // ---- changes not saved ----
  // Runs a step that replaces the drawing, asking first when that would
  // lose pixels no file holds.
  let after = null;
  function sure(then, trigger) {
    if (!unsaved()) { then(); return; }
    after = then;
    window.Rux?.modal?.open('sprites-discard-modal', trigger);
  }
  $('sprites-discard-go').addEventListener('click', () => {
    const then = after;
    after = null;
    window.Rux?.modal?.close('sprites-discard-modal');
    then?.();
  });

  function newSize(blank) {
    const { w, h } = sizeOf();
    if (![sizeError(widthField, w), sizeError(heightField, h)].every(ok => ok)) return;
    if (blank) {
      window.Rux?.modal?.close('sprites-size-modal');
      sure(() => resize(w, h, true), editor.hidden ? $('sprites-new-tile') : $('sprites-size'));
    } else resize(w, h, false);
  }
  function resize(w, h, blank) {
    begin();
    sel = null;
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
    } else { path = start?.path ?? null; assignTo = start?.element ?? null; }
    drawing = { w, h, px };
    view('draw');
    fit();
    commit(true);
    window.Rux?.modal?.close('sprites-size-modal');
    note('', '');
  }
  $('sprites-resize').addEventListener('click', () => newSize(false));
  $('sprites-new').addEventListener('click', () => newSize(true));

  // ---- open ----
  // A picked file becomes the drawing.
  async function load(got) {
    if (!got) return;
    const read = await S.files.read(got.file);
    // A P3 file opens in Sprites P3. An sRGB file stays in the palette in
    // use when that can draw it, and otherwise opens in Sprites' own.
    const want = read.space === 'display-p3' ? (pal.space === 'display-p3' ? pal.id : 'sprites-p3')
      : pal.space === 'srgb' && read.px.every(v => pal.free || pal.has(v)) ? pal.id : 'sprites';
    begin();
    sel = null;
    drawing = { w: read.w, h: read.h, px: read.px };
    path = got.path;
    assignTo = null;
    if (path) S.known.add(path);
    setPal(await S.palette(want));
    view('draw');
    // An SVG is saved as an SVG again, where its palette saves one.
    if (/\.svg$/i.test(got.file.name) && pal.free) formatField.value = 'svg';
    fit();
    commit(true);
    dirty = false;
    keep();
    show();
    const changes = [
      read.soft ? `${read.soft} half-clear ${read.soft === 1 ? 'pixel was' : 'pixels were'} made opaque or clear.` : '',
      read.converted ? 'Its colour profile is neither sRGB nor Display P3, so its colours were carried into sRGB.' : '',
    ].filter(Boolean).join(' ');
    note('success', `Opened ${got.path ?? got.file.name}.`, changes);
  }
  const opening = act => async (...args) => {
    try { await act(...args); } catch (err) {
      if (err.name !== 'AbortError') note('error', 'Could not open it.', err.message);
    }
  };

  // ---- the gallery ----
  const editor = $('sprites-editor'), galleryView = $('sprites-gallery-view'), gallery = $('sprites-gallery');
  // A tile: a picture and a name, the whole path in its title, and the menu
  // a right click opens. An empty one, with no picture yet, is drawn as the
  // New drawing tile is.
  function tile(blob, name, title, act, menu = null) {
    const b = blob ? document.createElement('button') : $('sprites-new-tile').cloneNode(true);
    b.removeAttribute('id');
    b.type = 'button';
    b.className = `rux--tile rux--tile--clickable sprites-tile${blob ? '' : ' sprites-tile--empty'}`;
    b.title = title;
    if (blob) {
      const frame = Object.assign(document.createElement('span'), { className: 'sprites-tile__picture' });
      frame.append(Object.assign(document.createElement('img'), { className: 'sprites-tile__art', alt: '', src: URL.createObjectURL(blob) }));
      const text = Object.assign(document.createElement('span'), { className: 'rux--type-body-compact-01 sprites-tile__name' });
      b.append(frame, text);
    }
    b.lastElementChild.textContent = name;
    b.addEventListener('click', () => act(b));
    if (menu) b.addEventListener('contextmenu', e => { e.preventDefault(); openMenu(menu, b); });
    return b;
  }
  // A TILE'S MENU, Design's, under the tile: each item a label and what it runs.
  const tileMenu = $('sprites-tile-menu');
  const part = (cls, text = '') => Object.assign(document.createElement('div'), { className: cls, textContent: text });
  function openMenu(items, trigger) {
    window.Rux.menu.close(tileMenu);
    tileMenu.replaceChildren(...items.map(({ label, run, danger }) => {
      const li = document.createElement('li');
      li.className = `rux--menu-item${danger ? ' rux--menu-item--danger' : ''}`;
      li.setAttribute('role', 'menuitem');
      li.setAttribute('aria-haspopup', 'false');
      li.tabIndex = 0;
      li.append(part('rux--menu-item__selection-icon'), part('rux--menu-item__icon'), part('rux--menu-item__label', label));
      li.addEventListener('click', () => { window.Rux.menu.close(tileMenu); run(trigger); });
      return li;
    }));
    window.Rux.menu.open(tileMenu, trigger);
  }
  const fileOf = p => p.split('/').at(-1);
  // A text field's error under it, Carbon's way: the field id's -wrap,
  // -icon and -error beside it. No words clears it.
  function fieldError(id, msg) {
    const field = $(id), wrap = $(`${id}-wrap`);
    for (const el of [wrap, field]) {
      if (msg) el.setAttribute('data-invalid', ''); else el.removeAttribute('data-invalid');
    }
    $(`${id}-icon`).hidden = !msg;
    field.classList.toggle('rux--text-input--invalid', !!msg);
    field.setAttribute('aria-invalid', String(!!msg));
    $(`${id}-error`).textContent = msg;
  }
  const forget = within => { for (const img of within.querySelectorAll('img')) URL.revokeObjectURL(img.src); };
  // The drawing in hand, where it has pixels no file holds.
  const unsaved = () => dirty && drawing.px.some(v => v !== -1);
  let drawn = 0;
  async function showGallery(ask = false) {
    const turn = ++drawn;
    const tiles = new DocumentFragment();
    if (unsaved()) {
      tiles.append(tile(await S.files.png(drawing, 1, pal.space), 'Not saved', path ?? 'Not saved yet', () => view('draw'),
        [{ label: 'Discard changes', danger: true, run: b => sure(opening(discard), b) }]));
    }
    let allowed = false;
    if (S.files.canWrite && (ask || await S.files.allowed())) {
      const kept = S.known.get();
      const map = await S.files.assigned();
      const elements = await S.elements();
      const found = await S.files.gallery(S.FOLDERS, [...kept, ...Object.values(map)]);
      allowed = true;
      // A drawing whose file has gone is no longer kept.
      const there = new Set(found.map(g => g.path));
      if (kept.some(p => !there.has(p))) S.known.set(kept.filter(p => there.has(p)));
      const byPath = new Map(found.map(got => [got.path, got]));
      const open = got => b => sure(opening(() => load(got)), b);
      // A drawing's menu; one an element shows, from that element's tile,
      // ends with Unassign where another ends with Delete.
      const menuOf = (got, element = null) => [
        { label: 'Rename…', run: b => askRename(got, b) },
        { label: 'Duplicate', run: () => duplicate(got) },
        { label: 'Assign to…', run: b => askAssign(got, elements, map, b) },
        element ? { label: 'Unassign', danger: true, run: () => unassign(element) }
          : { label: 'Delete…', danger: true, run: b => askDelete(got, b) },
      ];
      // The drawings no element shows: neither an element's own file nor one assigned.
      const theirs = new Set(elements.flatMap(e => [e.path, map[e.path]]));
      tiles.append(...found.filter(got => !theirs.has(got.path)).map(got => tile(got.file, fileOf(got.path), got.path, open(got), menuOf(got))));
      // Each set under its name: an element's drawing, or its own file where
      // none is assigned, or an empty tile that starts its drawing.
      const folder = S.PALETTES[0].folder;
      for (const set of S.SETS) {
        tiles.append(Object.assign(document.createElement('h2'), { className: 'rux--type-heading-compact-01 sprites-gallery__heading', textContent: set.name }));
        for (const e of elements.filter(x => x.set === set.name)) {
          const art = byPath.get(map[e.path]);
          const got = art ?? byPath.get(e.path);
          if (got) {
            tiles.append(tile(got.file, fileOf(e.path), art ? `${e.path}, from ${art.path}` : e.path, open(got),
              art ? menuOf(art, e) : null));
            continue;
          }
          // The new drawing's name: the element's, or the next one free.
          const free = n => `${folder}${e.art.replace(/\.png$/, n ? `-${n + 1}.png` : '.png')}`;
          let n = 0;
          while (byPath.has(free(n))) n++;
          tiles.append(tile(null, fileOf(e.path), e.path, b => {
            sizeFor(false, { path: free(n), element: e.path });
            window.Rux?.modal?.open('sprites-size-modal', b);
          }));
        }
      }
    }
    // Each picture's own width in pixels, for the shared scale.
    await Promise.all([...tiles.querySelectorAll('img')].map(img => img.decode().then(() => img.style.setProperty('--sprites-w', img.naturalWidth), () => {})));
    if (turn !== drawn) { forget(tiles); return; }
    forget(gallery);
    gallery.replaceChildren($('sprites-new-tile'), tiles);
    scaleGallery();
    $('sprites-allow').hidden = !S.files.canWrite || allowed;
  }
  // ONE SCALE for every picture in the gallery, so drawings sit at their true
  // sizes beside each other: the screen pixels per drawing pixel picked in
  // the bar, 3 unless this browser picked another.
  const SCALE = 'sprites-gallery-scale', scales = $('sprites-scale');
  let scale = 3;
  try { scale = Number(localStorage.getItem(SCALE)) || 3; } catch {}
  const saved = scales.querySelector(`[data-scale="${scale}"]`);
  if (saved) window.Rux?.contentSwitcher?.select(scales, saved, { focus: false, silent: true }); else scale = 3;
  scales.addEventListener('rux:content-switcher-selected', e => {
    scale = Number(e.detail.option.dataset.scale);
    try { localStorage.setItem(SCALE, String(scale)); } catch {}
    scaleGallery();
  });
  function scaleGallery() { gallery.style.setProperty('--sprites-scale', scale); }
  $('sprites-allow').addEventListener('click', opening(() => showGallery(true)));

  // ---- assign ----
  // The Assign window: every element, set by set, saying which have a drawing.
  const assignField = $('sprites-assign-to');
  let assigning = null;
  function askAssign(got, elements, map, trigger) {
    assigning = got;
    assignField.replaceChildren(...S.SETS.map(set => {
      const group = Object.assign(document.createElement('optgroup'), { label: `Emu ${set.name.toLowerCase()}` });
      group.append(...elements.filter(e => e.set === set.name).map(e => Object.assign(document.createElement('option'), {
        className: 'rux--select-option', value: e.path,
        textContent: map[e.path] ? `${e.name}, now ${fileOf(map[e.path])}` : e.name,
        selected: map[e.path] === got.path,
      })));
      return group;
    }));
    $('sprites-assign-what').textContent = fileOf(got.path);
    window.Rux?.modal?.open('sprites-assign-modal', trigger);
  }
  // An element's file, written from a drawing as a 1× PNG.
  const writeTo = async (element, d, space) => S.files.write(element, await S.files.png(d, 1, space));
  const assigningTo = act => async (...args) => {
    try { await act(...args); } catch (err) {
      if (err.name !== 'AbortError') note('error', 'Could not assign it.', err.message);
    }
    opening(showGallery)();
  };
  $('sprites-assign-go').addEventListener('click', assigningTo(async () => {
    const got = assigning, element = assignField.value;
    window.Rux?.modal?.close('sprites-assign-modal');
    const read = await S.files.read(got.file);
    await writeTo(element, read, read.space);
    await S.files.assign(element, got.path);
    note('success', `Assigned ${fileOf(got.path)}.`, `${element} shows it.`);
  }));
  const unassign = assigningTo(async e => {
    await S.files.assign(e.path, null);
    await S.files.remove(e.path);
    note('success', `Unassigned ${fileOf(e.path)}.`, `${e.path} is gone, and the drawing is kept.`);
  });
  // ---- a drawing's file ----
  const folderOf = p => p.replace(/[^/]*$/, '');
  const extOf = p => p.match(/\.(png|svg)$/i)[0];
  // A path in a folder no file has: the name, else it with -2, -3 and on.
  async function freePath(folder, name, ext) {
    for (let n = 1; ; n++) {
      const at = `${folder}${name}${n === 1 ? '' : `-${n}`}${ext}`;
      if (!await S.files.exists(at)) return at;
    }
  }
  const filing = (what, act) => async (...args) => {
    try { await act(...args); } catch (err) {
      if (err.name !== 'AbortError') note('error', `Could not ${what} it.`, err.message);
    }
    opening(showGallery)();
  };

  // Rename: a new name in the same folder, the kind kept.
  const renameField = $('sprites-rename-name');
  let renaming = null;
  function askRename(got, trigger) {
    renaming = got;
    renameField.value = fileOf(got.path).replace(/\.(png|svg)$/i, '');
    $('sprites-rename-ext').textContent = extOf(got.path);
    fieldError('sprites-rename-name', '');
    window.Rux?.modal?.open('sprites-rename-modal', trigger);
    renameField.select();
  }
  renameField.addEventListener('input', () => fieldError('sprites-rename-name', ''));
  renameField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('sprites-rename-go').click(); } });
  $('sprites-rename-go').addEventListener('click', async () => {
    const from = renaming.path, name = renameField.value.trim();
    const to = `${folderOf(from)}${name}${extOf(from)}`;
    if (to === from) { window.Rux?.modal?.close('sprites-rename-modal'); return; }
    const bad = /^[A-Za-z0-9_][A-Za-z0-9._@-]*$/.test(name) ? S.files.checkPath(to) : 'Use letters, numbers, dots, dashes and underscores, starting with a letter or number.';
    if (bad) { fieldError('sprites-rename-name', bad); return; }
    if (await S.files.exists(to)) { fieldError('sprites-rename-name', `${fileOf(to)} is already a file here.`); return; }
    window.Rux?.modal?.close('sprites-rename-modal');
    await filing('rename', async () => {
      await S.files.rename(from, to);
      S.known.set(S.known.get().map(p => (p === from ? to : p)));
      if (path === from) { path = to; keep(); }
      note('success', `Renamed ${fileOf(from)} to ${fileOf(to)}.`);
    })();
  });

  // Duplicate: a copy beside it, under a free name, shown by no element.
  const duplicate = filing('duplicate', async got => {
    const to = await freePath(folderOf(got.path), `${fileOf(got.path).replace(/\.(png|svg)$/i, '')}-copy`, extOf(got.path));
    await S.files.copy(got.path, to);
    S.known.add(to);
    note('success', `Made ${fileOf(to)}.`);
  });

  // A blank drawing the size of the one in hand, saved nowhere, as a step.
  function blank() {
    begin();
    sel = null;
    drawing = { w: drawing.w, h: drawing.h, px: new Int32Array(drawing.w * drawing.h).fill(-1) };
    path = null;
    assignTo = null;
    commit(true);
    dirty = false;
    keep();
    show();
  }
  // The drawing in hand as its file holds it, or blank where it has none.
  // Opening the file shows the editor, so from the gallery it goes back there.
  async function discard() {
    const fromGallery = editor.hidden;
    const [got] = path && S.files.canWrite && await S.files.allowed() ? await S.files.gallery([], [path]) : [];
    if (got) await load(got); else blank();
    if (fromGallery) view('gallery'); else opening(showGallery)();
    note('success', 'Changes discarded.');
  }

  // Delete, after asking: the file goes, and the drawing in hand with it.
  let deleting = null;
  function askDelete(got, trigger) {
    deleting = got;
    $('sprites-delete-what').textContent = fileOf(got.path);
    $('sprites-delete-open').hidden = got.path !== path;
    window.Rux?.modal?.open('sprites-delete-modal', trigger);
  }
  $('sprites-delete-go').addEventListener('click', () => {
    window.Rux?.modal?.close('sprites-delete-modal');
    filing('delete', async () => {
      const gone = deleting.path;
      await S.files.remove(gone);
      S.known.set(S.known.get().filter(p => p !== gone));
      if (path === gone) blank();
      note('success', `Deleted ${fileOf(gone)}.`);
    })();
  });

  // A saved drawing's elements, each written again; a drawing started for an
  // element is assigned to it first.
  async function spread(art) {
    if (assignTo) { await S.files.assign(assignTo, art); assignTo = null; }
    const map = await S.files.assigned();
    const mine = Object.keys(map).filter(e => map[e] === art);
    for (const element of mine) await writeTo(element, drawing, pal.space);
    return mine;
  }
  $('sprites-browse').addEventListener('click', () => sure(opening(async () => load(await S.files.browse())), $('sprites-browse')));
  $('sprites-to-gallery').addEventListener('click', () => view('gallery'));

  // One view at a time; the address says which, so a reload keeps it.
  function view(name) {
    const draw = name === 'draw';
    if ((location.hash === '#draw') !== draw) {
      if (draw) location.hash = 'draw';
      else history.pushState(null, '', location.pathname + location.search);
    }
    if (!editor.hidden === draw && galleryView.hidden === draw) return;
    editor.hidden = !draw;
    galleryView.hidden = draw;
    if (draw) { fit(); show(); } else { note('', ''); opening(showGallery)(); }
  }
  window.addEventListener('hashchange', () => view(location.hash === '#draw' ? 'draw' : 'gallery'));
  window.addEventListener('popstate', () => view(location.hash === '#draw' ? 'draw' : 'gallery'));

  // ---- save ----
  const pathField = $('sprites-save-path'), formatField = $('sprites-format');
  const pathError = msg => fieldError('sprites-save-path', msg);
  const extFor = f => (f === 'svg' ? 'svg' : 'png');
  // The path another file holds that the next Save may write over.
  let replacing = null;
  // A new drawing's name in a folder: `drawing`, or the next no file has,
  // where the checkout can be read without asking.
  async function freeName(folder) {
    if (!S.files.canWrite || !await S.files.allowed()) return 'drawing.png';
    for (let n = 1; ; n++) {
      const name = n === 1 ? 'drawing' : `drawing-${n}`;
      if (!await S.files.exists(`${folder}${name}.png`) && !await S.files.exists(`${folder}${name}.svg`)) return `${name}.png`;
    }
  }
  async function openSave() {
    const formats = [...formatField.options];
    formats.forEach(o => { o.hidden = o.disabled = !pal.free && o.value !== 'png1'; });
    if (!pal.free) formatField.value = 'png1';
    const folder = path ? path.replace(/[^/]*$/, '') : (S.folder.get() || pal.folder);
    const name = path ? path.split('/').at(-1) : await freeName(folder);
    replacing = null;
    pathField.value = (folder + name).replace(/\.(png|svg)$/, `.${extFor(formatField.value)}`);
    $('sprites-save-help').textContent = S.files.canWrite
      ? ['Written straight into the checkout.', pal.space === 'display-p3' ? 'A PNG carries a Display P3 profile; an SVG gives each colour an sRGB one too, for an app that cannot show P3.' : ''].filter(Boolean).join(' ')
      : 'This browser cannot write into the checkout, so it downloads the file; move it to this path.';
    pathError('');
    window.Rux?.modal?.open('sprites-save-modal', $('sprites-save'));
  }
  $('sprites-save').addEventListener('click', openSave);
  formatField.addEventListener('change', () => {
    pathField.value = pathField.value.replace(/\.(png|svg)$/, `.${extFor(formatField.value)}`);
  });
  pathField.addEventListener('input', () => { replacing = null; pathError(''); });
  pathField.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });

  async function save() {
    const target = pathField.value.trim();
    const bad = S.files.checkPath(target);
    if (bad) { pathError(bad); return; }
    const format = formatField.value;
    if (!target.endsWith(`.${extFor(format)}`)) { pathError(`An ${extFor(format).toUpperCase()} ends in .${extFor(format)}.`); return; }
    try {
      // Another file at that path is written over only when Save is pressed again.
      if (S.files.canWrite && target !== path && target !== replacing && await S.files.exists(target)) {
        replacing = target;
        pathError(`${target} is already a file. Save again to replace it.`);
        return;
      }
      const blob = format === 'svg' ? S.files.svg(drawing, pal.space) : await S.files.png(drawing, Number(format.slice(3)), pal.space);
      if (S.files.canWrite) await S.files.write(target, blob);
      else S.files.download(target, blob);
      // The path is the drawing's only when the file holds it as drawn.
      let shown = [];
      if (format === 'png1' || format === 'svg') {
        path = target;
        if (S.files.canWrite) { S.known.add(target); shown = await spread(target); }
        dirty = false;
      }
      S.folder.set(target.replace(/[^/]*$/, ''));
      keep();
      show();
      window.Rux?.modal?.close('sprites-save-modal');
      note('success', S.files.canWrite ? `Saved ${target}.` : `Downloaded ${target.split('/').at(-1)}.`, shown.length ? `Written to ${shown.join(' and ')} too.` : '');
    } catch (err) {
      if (err.name !== 'AbortError') pathError(err.message);
    }
  }
  $('sprites-save-go').addEventListener('click', save);

  // ---- keys ----
  const typing = t => t instanceof Element && t.closest('input, select, textarea, [contenteditable]');
  document.addEventListener('keydown', e => {
    if (editor.hidden) return;
    const cmd = e.metaKey || e.ctrlKey;
    if (cmd && e.key.toLowerCase() === 's') { e.preventDefault(); if (!document.querySelector('.rux--modal.is-visible')) openSave(); return; }
    if (typing(e.target) || document.querySelector('.rux--modal.is-visible')) return;
    if (cmd && e.key.toLowerCase() === 'z') { e.preventDefault(); move(e.shiftKey ? ahead : past, e.shiftKey ? past : ahead); return; }
    if (cmd && e.key.toLowerCase() === 'y') { e.preventDefault(); move(ahead, past); return; }
    if (cmd && e.key.toLowerCase() === 'a') { e.preventDefault(); setTool('select'); sel = { x: 0, y: 0, w: drawing.w, h: drawing.h }; render(); return; }
    if (cmd || e.altKey) return;
    if (sel && tool === 'select') {
      const by = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (by) { e.preventDefault(); nudge(...by); return; }
      if (e.key === 'Escape') { e.preventDefault(); dropSel(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); clearSel(); return; }
    }
    const keys = { s: () => setTool('select'), b: () => setTool('pencil'), p: () => setTool('pencil'), e: () => setTool('eraser'), g: () => setTool('fill'), i: () => setTool('picker'), m: () => setMirror(!mirror), '+': () => setZoom(zoom + 1), '=': () => setZoom(zoom + 1), '-': () => setZoom(zoom - 1), 0: () => { fit(); show(); } };
    const act = keys[e.key.toLowerCase()];
    if (act) { e.preventDefault(); act(); }
  });

  window.addEventListener('beforeunload', e => { if (unsaved()) e.preventDefault(); });

  // The theme's colours change the canvas's, and a new size or pixel ratio its fit.
  new MutationObserver(() => { readLook(); render(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readLook(); render(); });
  new ResizeObserver(() => { if (fitted) fit(); show(); }).observe(stage);

  // ---- start: the draft, or a blank icon, in the view the address names ----
  (async () => {
    const d = S.draft.load();
    if (d) {
      drawing = { w: d.w, h: d.h, px: d.px };
      path = d.path ?? null;
      assignTo = d.assignTo ?? null;
      dirty = !!d.dirty;
      colour = Number.isInteger(d.colour) ? d.colour : colour;
      recent = Array.isArray(d.recent) ? d.recent.filter(Number.isInteger).slice(0, RECENT) : [];
    }
    try {
      // The draft's numbers are in its own palette's space, so it opens there.
      setPal(await S.palette(d?.palette ?? 'sprites'), null);
      gamutNote();
    } catch (err) {
      note('error', 'Could not load the palette.', err.message);
    }
    readLook();
    galleryView.hidden = true;
    view(location.hash === '#draw' ? 'draw' : 'gallery');
  })();
})();
