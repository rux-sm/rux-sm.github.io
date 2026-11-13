/* ==========================================================================
   files.js — opening a PNG, and saving a drawing into the checkout
   --------------------------------------------------------------------------
   A drawing is { w, h, px }: px holds one number a pixel, row by row, the
   colour as 0xRRGGBB or -1 where it is clear. No pixel is half clear.

   INTO THE CHECKOUT. In Chrome the File System Access API writes straight
   into rux's clone: the first save or open asks for the folder with the
   directory picker, checks AGENTS.md and switcher.json stand at its root,
   and keeps the handle in IndexedDB, so later visits ask only for
   permission again. A save names a path in the checkout and writes there,
   making any folder it lacks. It works on :8640 and :8641, both secure
   contexts. A browser without the picker downloads the file instead.

   THE FORMATS. PNG at 1×, or scaled by a whole number, each art pixel a
   square of that many pixels; and SVG, one rect for each run of a colour on
   a row, with crispEdges so it never blurs. A Display P3 drawing's PNG is
   drawn on a P3 canvas, which writes the profile into the file; its SVG
   paints each rect in P3 over an sRGB fill for an app that has no P3. The 1× PNG is 8-bit RGBA, not
   interlaced, with every pixel opaque or clear, which is the picture
   emu/tools/build-consoles.mjs reads; the converter stays the one path from
   a console's drawing into consoles.svg.
   ========================================================================== */
(() => {
  'use strict';

  const S = window.Sprites;
  const canWrite = typeof window.showDirectoryPicker === 'function';

  // The checkout's handle, kept in IndexedDB, the one store a handle survives in.
  const store = (mode, act) => new Promise((resolve, reject) => {
    const open = indexedDB.open('sprites', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('handles');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('handles', mode);
      const req = act(tx.objectStore('handles'));
      tx.oncomplete = () => { db.close(); resolve(req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });

  const NOT_CHECKOUT = 'That folder is not the checkout: pick the rux-sm.github.io folder, where AGENTS.md and switcher.json stand.';

  async function checkout() {
    let root = await store('readonly', s => s.get('checkout')).catch(() => null);
    if (root) {
      const mode = { mode: 'readwrite' };
      if (await root.queryPermission(mode) !== 'granted' && await root.requestPermission(mode) !== 'granted') root = null;
    }
    if (!root) {
      root = await window.showDirectoryPicker({ id: 'sprites-checkout', mode: 'readwrite' });
      for (const name of ['AGENTS.md', 'switcher.json']) {
        try { await root.getFileHandle(name); } catch { throw new Error(NOT_CHECKOUT); }
      }
      await store('readwrite', s => s.put(root, 'checkout'));
    }
    return root;
  }

  // A path in the checkout: folders and a file name, no step up and no slash at either end.
  const PATH = /^(?:[A-Za-z0-9_][A-Za-z0-9._-]*\/)*[A-Za-z0-9_][A-Za-z0-9._@-]*\.(png|svg)$/;
  const checkPath = path => {
    if (!PATH.test(path) || path.split('/').some(p => p === '.' || p === '..')) return 'Write a path in the checkout, such as icons/star.png, ending in .png or .svg.';
    return '';
  };

  async function write(path, blob) {
    const root = await checkout();
    const parts = path.split('/');
    let dir = root;
    for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true });
    const file = await dir.getFileHandle(parts.at(-1), { create: true });
    const out = await file.createWritable();
    await out.write(blob);
    await out.close();
  }

  function download(path, blob) {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: path.split('/').at(-1) });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // A PNG picked from the checkout, or from the file picker elsewhere, with
  // its path in the checkout when the browser can say it.
  async function open() {
    if (canWrite) {
      const root = await checkout();
      const [handle] = await window.showOpenFilePicker({
        id: 'sprites-open', startIn: root,
        types: [{ description: 'PNG pictures', accept: { 'image/png': ['.png'] } }],
      });
      const parts = await root.resolve(handle);
      return { file: await handle.getFile(), path: parts ? parts.join('/') : null };
    }
    return new Promise(resolve => {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/png' });
      input.addEventListener('change', () => resolve(input.files[0] ? { file: input.files[0], path: null } : null));
      input.click();
    });
  }

  // A picture's pixels as stored, or carried into a colour space by its profile.
  async function pixels(file, space) {
    const bitmap = await createImageBitmap(file, { premultiplyAlpha: 'none', colorSpaceConversion: space ? 'default' : 'none' });
    const { width: w, height: h } = bitmap;
    if (w > 256 || h > 256) throw new Error(`${file.name} is ${w} × ${h}; Sprites draws up to 256 a side.`);
    const ctx = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true, colorSpace: space || 'srgb' });
    ctx.drawImage(bitmap, 0, 0);
    return { w, h, data: ctx.getImageData(0, 0, w, h, { colorSpace: space || 'srgb' }).data };
  }
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // A picture as a drawing: a pixel under half opaque is clear, any other is
  // its colour, opaque. `soft` counts the pixels that were neither. Its
  // space is the one its profile names: the stored pixels read the same
  // carried into sRGB for an sRGB file or one with no profile, and the same
  // carried into P3 for a P3 one; a file with any other profile is carried
  // into sRGB, and says so.
  async function read(file) {
    const raw = await pixels(file, null);
    const srgb = await pixels(file, 'srgb');
    let { w, h, data } = raw, space = 'srgb', converted = false;
    if (!same(raw.data, srgb.data)) {
      if (same(raw.data, (await pixels(file, 'display-p3')).data)) space = 'display-p3';
      else { data = srgb.data; converted = true; }
    }
    const px = new Int32Array(w * h);
    let soft = 0;
    for (let i = 0; i < px.length; i++) {
      const a = data[i * 4 + 3];
      if (a !== 0 && a !== 255) soft++;
      px[i] = a < 128 ? -1 : (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
    }
    return { w, h, px, soft, space, converted };
  }

  function png({ w, h, px }, scale = 1, space = 'srgb') {
    const canvas = Object.assign(document.createElement('canvas'), { width: w * scale, height: h * scale });
    const ctx = canvas.getContext('2d', { colorSpace: space });
    const css = S.cssOf(space);
    if (scale === 1) {
      const image = ctx.createImageData(w, h, { colorSpace: space });
      px.forEach((v, i) => {
        if (v === -1) return;
        image.data.set([(v >> 16) & 255, (v >> 8) & 255, v & 255, 255], i * 4);
      });
      ctx.putImageData(image, 0, 0);
    } else {
      px.forEach((v, i) => {
        if (v === -1) return;
        ctx.fillStyle = css(v);
        ctx.fillRect((i % w) * scale, Math.floor(i / w) * scale, scale, scale);
      });
    }
    return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('The browser could not write the PNG.'))), 'image/png'));
  }

  function svg({ w, h, px }, space = 'srgb') {
    const p3 = space === 'display-p3' ? S.cssOf(space) : null;
    const rects = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w;) {
        const v = px[y * w + x];
        let end = x + 1;
        while (end < w && px[y * w + end] === v) end++;
        if (v !== -1) {
          const fill = S.hexOf(S.convert(v, space, 'srgb'));
          rects.push(`  <rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fill}"${p3 ? ` style="fill: ${p3(v)}"` : ''}/>`);
        }
        x = end;
      }
    }
    const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">\n${rects.join('\n')}\n</svg>\n`;
    return new Blob([text], { type: 'image/svg+xml' });
  }

  S.files = { canWrite, checkout, checkPath, write, download, open, read, png, svg };
})();
