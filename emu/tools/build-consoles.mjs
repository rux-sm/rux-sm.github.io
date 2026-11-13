#!/usr/bin/env node
/* ==========================================================================
   build-consoles.mjs — a console's pixel drawing into brand/consoles.svg
   --------------------------------------------------------------------------
   A console is drawn in any pixel editor as a PNG in emu/brand/consoles/,
   named for its system, such as snes.png: a home console 36 by 24 pixels, a
   handheld 24 high and as wide as it needs, up to 36. It uses only the
   palette below, whose every colour stands for one --emu-console-*
   property, so the drawing takes the room's theme. This tool turns each
   drawing into its symbol in brand/consoles.svg, a rect for each run of one
   colour, and leaves every console not yet drawn as it was.

       node emu/tools/build-consoles.mjs              every drawing into consoles.svg
       node emu/tools/build-consoles.mjs --template   the palette and blank canvases

   --template writes brand/consoles/palette.gpl, which Aseprite, LibreSprite,
   Pixelorama and GIMP load as a palette, palette.png, a strip of the same
   colours for an editor that takes a palette from a picture, and home.png
   and handheld.png, blank canvases at the two sizes. emu/docs/drawing-consoles.md
   is how to draw one.
   ========================================================================== */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const EMU = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(EMU, 'brand', 'consoles');
const SPRITE = join(EMU, 'brand', 'consoles.svg');

// The palette: each property, the colour it is drawn in, and what it is for.
// app.css sets every property from Design's tokens; a -hi or -lo shade is
// its base mixed lighter or darker, so each material has three shades.
const PALETTE = [
  ['body-hi', 'd6d6d6', 'the plastic, lit edge'],
  ['body', 'a8a8a8', 'the plastic'],
  ['body-lo', '6f6f6f', 'the plastic, shadow'],
  ['shade-hi', '9a9aa8', 'the second plastic, lit edge'],
  ['shade', '6c6c7a', 'the second plastic'],
  ['shade-lo', '444450', 'the second plastic, shadow'],
  ['detail', 'c8bfa8', 'labels, vents and stickers'],
  ['ink', '1e1e1e', 'slots, gaps and the darkest lines'],
  ['screen', '3d5c43', 'a handheld\'s screen, lit while it plays'],
  ['screen-hi', '6f9a74', 'the screen\'s glare'],
  ['red', 'da1e28', 'red parts'],
  ['red-lo', '8a1018', 'red parts, shadow'],
  ['purple', '8a3ffc', 'purple parts'],
  ['purple-lo', '5a24a8', 'purple parts, shadow'],
  ['teal', '009d9a', 'teal parts'],
  ['teal-lo', '005d5d', 'teal parts, shadow'],
  ['blue', '0f62fe', 'blue parts'],
  ['blue-lo', '0a3e9e', 'blue parts, shadow'],
  ['green', '24a148', 'green parts'],
  ['green-lo', '14632c', 'green parts, shadow'],
];
const BY_RGB = new Map(PALETTE.map(([prop, rgb]) => [rgb, prop]));
// The handhelds, which may be narrower than a home console's 36.
const HANDHELD = new Set(['gb', 'gbc', 'gba', 'nds', 'n3ds']);
const HIGH = 24;
const WIDE = 36;

// PNG, read and written here so the tool needs nothing installed. It reads
// 8-bit truecolour, truecolour with alpha and indexed pictures, unlaced.
function readPng(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  let at = 8, width = 0, height = 0, depth = 0, type = 0, laced = 0, plte = null, trns = null;
  const idat = [];
  while (at < buf.length) {
    const len = buf.readUInt32BE(at);
    const kind = buf.toString('latin1', at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (kind === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; type = data[9]; laced = data[12]; }
    else if (kind === 'PLTE') plte = data;
    else if (kind === 'tRNS') trns = data;
    else if (kind === 'IDAT') idat.push(data);
    at += 12 + len;
  }
  const channels = { 2: 3, 6: 4, 3: 1 }[type];
  if (depth !== 8 || !channels || laced) throw new Error(`${file}: save it as an 8-bit RGB, RGBA or indexed PNG, not interlaced`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? px[y * stride + x - channels] : 0;
      const b = y ? px[(y - 1) * stride + x] : 0;
      const c = x >= channels && y ? px[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const add = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      px[y * stride + x] = (line[x] + add) & 255;
    }
  }
  // Each pixel as its colour in hex, or null where it is clear.
  return {
    width, height,
    at(x, y) {
      const i = (y * width + x) * channels;
      if (type === 3) {
        const n = px[i];
        if (trns && n < trns.length && trns[n] < 128) return null;
        return plte.subarray(n * 3, n * 3 + 3).toString('hex');
      }
      if (type === 6 && px[i + 3] < 128) return null;
      return px.subarray(i, i + 3).toString('hex');
    },
  };
}
function chunk(kind, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(kind, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}
// An RGBA picture from a function giving each pixel's hex colour, or null for clear.
function writePng(file, width, height, colourAt) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const hex = colourAt(x, y);
    if (hex) Buffer.from(hex + 'ff', 'hex').copy(raw, y * (width * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  writeFileSync(file, Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

function template() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(join(DIR, 'palette.gpl'), ['GIMP Palette', 'Name: Emu consoles', 'Columns: 2', '#',
    ...PALETTE.map(([prop, rgb]) => `${[0, 2, 4].map(i => String(parseInt(rgb.slice(i, i + 2), 16)).padStart(3)).join(' ')}\t${prop}`)].join('\n') + '\n');
  writePng(join(DIR, 'palette.png'), PALETTE.length, 1, x => PALETTE[x][1]);
  writePng(join(DIR, 'home.png'), WIDE, HIGH, () => null);
  writePng(join(DIR, 'handheld.png'), 16, HIGH, () => null);
  console.log(`wrote palette.gpl, palette.png, home.png and handheld.png in ${DIR}`);
}

// One drawing as a symbol: runs of a colour along each row, and a run the
// same as the one above it joined to it, so a plain area is one rect.
function symbolOf(system, file, title) {
  const png = readPng(file);
  const hand = HANDHELD.has(system);
  if (png.height !== HIGH || (hand ? png.width > WIDE : png.width !== WIDE)) {
    throw new Error(`${file}: ${png.width} by ${png.height}; a ${hand ? `handheld is ${HIGH} high and up to ${WIDE} wide` : `home console is ${WIDE} by ${HIGH}`}`);
  }
  const rects = [];
  let above = new Map();
  for (let y = 0; y < png.height; y++) {
    const here = new Map();
    for (let x = 0; x < png.width;) {
      const hex = png.at(x, y);
      let end = x + 1;
      while (end < png.width && png.at(end, y) === hex) end++;
      if (hex) {
        const prop = BY_RGB.get(hex);
        if (!prop) throw new Error(`${file}: #${hex} at ${x},${y} is not in the palette`);
        const key = `${x},${end},${prop}`;
        const rect = above.get(key);
        if (rect) rect.h++;
        else rects.push({ x, y, w: end - x, h: 1, prop });
        here.set(key, rect ?? rects.at(-1));
      }
      x = end;
    }
    above = here;
  }
  const body = rects.map(r => `  <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" style="fill:var(--emu-console-${r.prop})"/>`).join('\n');
  return `<symbol id="emu-console-${system}" viewBox="0 0 ${png.width} ${png.height}" shape-rendering="crispEdges"><title>${title}</title>\n${body}\n</symbol>`;
}

function build() {
  let sprite = readFileSync(SPRITE, 'utf8');
  const drawn = existsSync(DIR) ? readdirSync(DIR).filter(f => /^[a-z0-9]+\.png$/.test(f) && !['palette.png', 'home.png', 'handheld.png'].includes(f)) : [];
  for (const f of drawn) {
    const system = f.slice(0, -4);
    const old = sprite.match(new RegExp(`<symbol id="emu-console-${system}"[^>]*>(?:<title>([^<]*)</title>)?[\\s\\S]*?</symbol>`));
    if (!old) throw new Error(`${f}: consoles.svg has no symbol emu-console-${system}`);
    sprite = sprite.replace(old[0], symbolOf(system, join(DIR, f), old[1] ?? system));
    console.log(`drew ${system}`);
  }
  writeFileSync(SPRITE, sprite);
  if (!drawn.length) console.log('no drawings yet; --template writes the canvases and the palette');
}

try {
  if (process.argv.includes('--template')) template();
  else build();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
