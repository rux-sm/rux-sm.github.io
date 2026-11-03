/* ==========================================================================
   picture.js — the Pixelator's From a picture
   --------------------------------------------------------------------------
   A picture from the phone or the computer becomes a drawing on the board.
   Picture, beside the Size field, opens the file picker; the picture chosen
   opens in a window of its own, a square cut from it in a frame with the
   board's squares drawn over it. Drag moves the picture and pinch, the wheel
   or a trackpad's pinch zoom it; with the frame focused the arrows move it,
   and + and - zoom it. Under the frame stand the drawing it makes and the
   finished picture, which change as it moves. Use puts them on the board,
   one step that Undo takes back.

   THE DRAWING. The square is shrunk to twelve dots a square, and a square
   is filled where most of its dots are filled, or in Dark parts where
   three in ten are. Shape, above the frame, fills
   what stands apart from the background: the colour most of the frame's
   edge is, or nothing where the edge is clear. A dot is filled where it is
   far enough from the background, and how far is Otsu's cut between the
   distances, so a plain background splits cleanly. Dark parts fills the
   dots darker than Otsu's cut between their lightness, which draws a
   cartoon's lines; a clear dot is never filled.

   THE COLOURS. Every dot takes its nearest ink, by OKLab, from theme.css's
   sixty, and a square takes the ink most of its dots on its own side take;
   a clear dot is white. The picture never leaves the browser: only the
   squares and their inks reach the board.
   ========================================================================== */
(() => {
  'use strict';

  const { CHARS, canvas, tone } = window.Pixels;
  const $ = id => document.getElementById(id);
  const modal = $('pixels-picture-modal'), frame = $('pixels-crop'), result = $('pixels-crop-result'), use = $('pixels-crop-use');
  const file = $('pixels-picture-file');

  // Dots a square is sampled at, a side.
  const DOTS = 12;
  // The longest side a picture is kept at once it is open, which is plenty
  // for a board of twenty and keeps a phone's photo quick to move.
  const KEEP = 1200;
  // Below this OKLab distance from the background a dot is never the shape,
  // so a picture of one colour does not split on its noise.
  const FLOOR = .08;
  // The share of a square's dots that fill it in Dark parts, under half, so
  // a line thinner than a square still draws.
  const THIN = .3;

  // sRGB to OKLab, as Björn Ottosson gives it.
  const linear = v => ((v /= 255) <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  const oklab = (r, g, b) => {
    r = linear(r); g = linear(g); b = linear(b);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  };
  const far = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  // The inks theme.css draws, each as its character and its OKLab.
  let inks = null;
  const inkList = () => inks ||= [...CHARS].flatMap(c => {
    const hex = tone(`--pixels-ink-${c}`);
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return [];
    const n = parseInt(hex.slice(1), 16);
    return [{ c, lab: oklab(n >> 16, (n >> 8) & 255, n & 255) }];
  });
  // The nearest ink to a colour, kept by the colour, since a picture repeats
  // its colours.
  const nearest = new Map();
  const inkOf = (lab, key) => {
    let got = nearest.get(key);
    if (got === undefined) {
      let best = Infinity;
      for (const ink of inkList()) {
        const d = far(lab, ink.lab);
        if (d < best) { best = d; got = ink.c; }
      }
      nearest.set(key, got);
    }
    return got;
  };

  // Otsu's cut: the distance that best splits the distances into two groups.
  const otsu = values => {
    const BINS = 128, top = values.reduce((a, b) => Math.max(a, b), 1e-6), hist = new Array(BINS).fill(0);
    values.forEach(v => hist[Math.min(BINS - 1, Math.floor(v / top * BINS))]++);
    let sum = 0, total = values.length;
    hist.forEach((n, i) => { sum += i * n; });
    let below = 0, belowSum = 0, best = 0, cut = 0;
    hist.forEach((n, i) => {
      below += n;
      if (!below || below === total) return;
      belowSum += i * n;
      const a = belowSum / below, b = (sum - belowSum) / (total - below);
      const between = below * (total - below) * (a - b) ** 2;
      if (between > best) { best = between; cut = i; }
    });
    return (cut + 1) / BINS * top;
  };

  /* THE PICTURE'S PLACE IN THE FRAME: `scale` frame pixels to a picture
     pixel, and where its corner stands. It opens filling the frame, centred. */
  let picture = null, side = 15, view = null, done = null, mode = 'shape';
  const room = () => frame.clientWidth;
  const fit = () => {
    const f = room(), s = f / Math.min(picture.width, picture.height);
    view = { scale: s, x: (f - picture.width * s) / 2, y: (f - picture.height * s) / 2 };
  };
  // From the whole picture inside the frame to ten times filling it.
  const limits = () => {
    const f = room();
    return [f / Math.max(picture.width, picture.height), f / Math.min(picture.width, picture.height) * 10];
  };
  const zoomAt = (by, fx, fy) => {
    const [low, high] = limits(), to = Math.min(high, Math.max(low, view.scale * by));
    view.x = fx - (fx - view.x) * to / view.scale;
    view.y = fy - (fy - view.y) * to / view.scale;
    view.scale = to;
    // Some of the picture always stays in the frame.
    const f = room(), w = picture.width * to, h = picture.height * to;
    view.x = Math.min(f / 2, Math.max(f / 2 - w, view.x));
    view.y = Math.min(f / 2, Math.max(f / 2 - h, view.y));
  };
  const moveBy = (dx, dy) => { view.x += dx; view.y += dy; zoomAt(1, 0, 0); };

  // The frame: the picture where it stands, and the board's lines over it.
  const draw = () => {
    const f = room(), px = devicePixelRatio || 1;
    frame.width = frame.height = Math.round(f * px);
    const ctx = frame.getContext('2d');
    ctx.setTransform(px, 0, 0, px, 0, 0);
    ctx.fillStyle = tone('--rux-layer-01');
    ctx.fillRect(0, 0, f, f);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(picture, view.x, view.y, picture.width * view.scale, picture.height * view.scale);
    ctx.strokeStyle = 'rgb(255 255 255 / .45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < side; i++) {
      const at = Math.round(i * f / side) + .5;
      ctx.moveTo(at, 0); ctx.lineTo(at, f);
      ctx.moveTo(0, at); ctx.lineTo(f, at);
    }
    ctx.stroke();
  };

  // The squares and the inks the frame holds, as the strings a puzzle keeps.
  const convert = () => {
    const n = side * DOTS, k = n / room();
    const work = document.createElement('canvas');
    work.width = work.height = n;
    const ctx = work.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(picture, view.x * k, view.y * k, picture.width * view.scale * k, picture.height * view.scale * k);
    const rgba = ctx.getImageData(0, 0, n, n).data;
    const labs = new Array(n * n).fill(null), keys = new Array(n * n);
    for (let i = 0; i < n * n; i++) {
      if (rgba[i * 4 + 3] < 128) continue;
      const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
      keys[i] = (r >> 2) << 12 | (g >> 2) << 6 | b >> 2;
      labs[i] = oklab(r, g, b);
    }
    // The background: nothing where most of the edge is clear, or else the
    // middle of the edge's colours, each part on its own.
    const edge = [];
    for (let i = 0; i < n; i++) edge.push(i, (n - 1) * n + i, i * n, i * n + n - 1);
    const solid = edge.filter(i => labs[i]);
    let ground = null;
    if (solid.length * 2 > edge.length) {
      const middle = part => solid.map(i => labs[i][part]).sort((a, b) => a - b)[solid.length >> 1];
      ground = [middle(0), middle(1), middle(2)];
    }
    // How filled each dot is, and from how filled a dot counts.
    let distance, cut;
    if (mode === 'dark') {
      distance = labs.map(lab => (lab ? 1 - lab[0] : 0));
      cut = Math.max(FLOOR, otsu(distance.filter((d, i) => labs[i])));
    } else {
      distance = labs.map(lab => (lab ? (ground ? far(lab, ground) : Infinity) : 0));
      cut = ground ? Math.max(FLOOR, otsu(distance.filter((d, i) => labs[i]))) : 1;
    }
    const squares = [], colours = [];
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const shape = {}, plain = {};
      let on = 0;
      for (let dy = 0; dy < DOTS; dy++) for (let dx = 0; dx < DOTS; dx++) {
        const i = (y * DOTS + dy) * n + x * DOTS + dx;
        const ink = labs[i] ? inkOf(labs[i], keys[i]) : '1';
        const into = distance[i] >= cut ? (on++, shape) : plain;
        into[ink] = (into[ink] || 0) + 1;
      }
      const filled = on > DOTS * DOTS * (mode === 'dark' ? THIN : .5);
      const count = filled ? shape : plain;
      squares.push(filled ? '1' : '0');
      colours.push(Object.keys(count).reduce((a, b) => (count[b] > count[a] ? b : a)));
    }
    return { squares: squares.join(''), colours: colours.join('') };
  };

  // Under the frame: the drawing, then the finished picture.
  let made = null;
  const show = () => {
    draw();
    made = convert();
    result.replaceChildren(...[canvas(made.squares), canvas(made.squares, made.colours)].map(el => {
      el.className = 'pixels-picture pixels-canvas';
      el.setAttribute('aria-hidden', 'true');
      return el;
    }));
  };
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; show(); });
  };

  // One finger or the mouse moves the picture, and two zoom it about their middle.
  const pointers = new Map();
  let last = null;
  const spread = () => {
    const [a, b] = [...pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const at = e => {
    const box = frame.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  frame.addEventListener('pointerdown', e => {
    if (!picture) return;
    frame.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, at(e));
    last = pointers.size === 2 ? spread() : null;
  });
  frame.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const was = pointers.get(e.pointerId), now = at(e);
    pointers.set(e.pointerId, now);
    if (pointers.size === 1) moveBy(now.x - was.x, now.y - was.y);
    else if (pointers.size === 2) {
      const next = spread();
      moveBy(next.x - last.x, next.y - last.y);
      zoomAt(next.d / last.d, next.x, next.y);
      last = next;
    } else return;
    later();
  });
  const lift = e => {
    pointers.delete(e.pointerId);
    last = pointers.size === 2 ? spread() : null;
  };
  frame.addEventListener('pointerup', lift);
  frame.addEventListener('pointercancel', lift);
  frame.addEventListener('wheel', e => {
    if (!picture) return;
    e.preventDefault();
    const p = at(e);
    zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .002)), p.x, p.y);
    later();
  }, { passive: false });
  frame.addEventListener('keydown', e => {
    if (!picture) return;
    const step = room() / side, f = room() / 2;
    const moves = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) moveBy(...moves[e.key]);
    else if (e.key === '+' || e.key === '=') zoomAt(1.1, f, f);
    else if (e.key === '-') zoomAt(1 / 1.1, f, f);
    else return;
    e.preventDefault();
    later();
  });

  // A picture is kept at no more than KEEP a side, halved a step at a time
  // so the shrinking stays smooth.
  const keep = image => {
    let w = image.naturalWidth, h = image.naturalHeight, from = image;
    while (Math.max(w, h) > KEEP) {
      const to = Math.max(KEEP / Math.max(w, h), .5);
      const step = document.createElement('canvas');
      step.width = Math.round(w * to);
      step.height = Math.round(h * to);
      const ctx = step.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(from, 0, 0, step.width, step.height);
      from = step; w = step.width; h = step.height;
    }
    return from;
  };

  // A frame that changes width keeps the same square of the picture.
  let shown = 0;
  $('pixels-crop-mode').addEventListener('rux:content-switcher-selected', e => {
    mode = e.currentTarget.querySelector('[aria-selected="true"]').dataset.mode;
    if (picture) later();
  });
  modal.addEventListener('rux:modal-opened', () => { fit(); shown = room(); show(); });
  new ResizeObserver(() => {
    if (!picture || !view || !room() || room() === shown) return;
    const by = room() / shown;
    view = { scale: view.scale * by, x: view.x * by, y: view.y * by };
    shown = room();
    later();
  }).observe(frame);
  use.addEventListener('click', () => {
    if (made) done?.(made);
    window.Rux.modal.close(modal);
  });
  modal.addEventListener('rux:modal-closed', () => { picture = null; made = null; pointers.clear(); file.value = ''; });

  /* Opens the file picker for a board `to` squares a side. `then` is given
     the squares and inks on Use, and `fail` is called for a file that is no
     picture this browser can open. */
  window.Pixels.fromPicture = (to, then, fail) => {
    side = to;
    done = then;
    file.onchange = async () => {
      const chosen = file.files?.[0];
      if (!chosen) return;
      const url = URL.createObjectURL(chosen), image = new Image();
      image.src = url;
      try {
        await image.decode();
        picture = keep(image);
      } catch {
        file.value = '';
        fail();
        return;
      } finally {
        URL.revokeObjectURL(url);
      }
      window.Rux.modal.open(modal, $('pixels-picture'));
    };
    file.click();
  };
})();
