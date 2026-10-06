#!/usr/bin/env node
// build-app-icons.mjs -- writes the PNG icons a phone's home screen shows for
// an installed app, because a home screen takes no SVG. Each is drawn from
// the app's own brand/favicon.svg: its squares are the mark, the fill it has
// on a light page is the icon's ground and the fill it has on a dark page is
// the mark's colour, so the icon is the favicon as a dark tab shows it.
//
// A MARK IS WHOLE SQUARES, so no rasteriser is needed: every square becomes a
// whole number of pixels, the same number at every size, and the mark is
// centred on what is left. `share` is how much of the icon's width the mark's
// longer side may take. The maskable icon takes less, because Android may crop
// it to a circle four fifths of the icon wide, and the tool fails a mark whose
// corners would leave that circle.
//
//   node tools/build-app-icons.mjs            write every icon
//   node tools/build-app-icons.mjs --check    fail if a committed icon is not what the favicon draws
//
// `--check` compares pixels, not bytes, so a Node that compresses differently
// still passes.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The apps a phone installs. Each has a manifest.json that names these files.
const APPS = ['pixels'];
const ICONS = [
  { name: 'icon-180.png', size: 180, share: 0.66 },           // an iPhone's
  { name: 'icon-192.png', size: 192, share: 0.66 },           // Android's
  { name: 'icon-512.png', size: 512, share: 0.66 },
  { name: 'icon-maskable-512.png', size: 512, share: 0.52 },  // Android's, to crop
];
const check = process.argv.includes('--check');
const die = message => { console.log(`  FAIL  ${message}`); process.exit(1); };

// The favicon's squares, as rows of booleans, and its two fills.
const read = app => {
  const at = `${app}/brand/favicon.svg`;
  const svg = readFileSync(join(ROOT, at), 'utf8');
  const side = Number(svg.match(/viewBox="0 0 (\d+) \1"/)?.[1]);
  const d = svg.match(/<path d="([^"]*)"/)?.[1];
  const fills = [...svg.matchAll(/svg\{fill:(#[0-9a-f]{6})\}/gi)].map(m => m[1]);
  if (!side || d == null || fills.length !== 2) die(`${at}: it needs a square viewBox, one path, and a fill for a light page and for a dark one`);
  const RECT = /M(\d+) (\d+)L(\d+) (\d+)L(\d+) (\d+)L(\d+) (\d+)Z/g;
  if (d.replace(RECT, '').trim()) die(`${at}: its path is not rectangles on whole squares alone`);
  const grid = Array.from({ length: side }, () => Array(side).fill(false));
  for (const [, ...n] of d.matchAll(RECT)) {
    const xs = [n[0], n[2], n[4], n[6]].map(Number), ys = [n[1], n[3], n[5], n[7]].map(Number);
    for (let y = Math.min(...ys); y < Math.max(...ys); y++)
      for (let x = Math.min(...xs); x < Math.max(...xs); x++) grid[y][x] = true;
  }
  const rows = grid.flatMap((row, y) => (row.includes(true) ? [y] : []));
  const cols = grid[0].flatMap((_, x) => (grid.some(row => row[x]) ? [x] : []));
  if (!rows.length) die(`${at}: its path draws nothing`);
  // Only the squares the mark reaches, so the mark is centred, not its board.
  const mark = grid.slice(rows[0], rows.at(-1) + 1).map(row => row.slice(cols[0], cols.at(-1) + 1));
  return { mark, ground: fills[0], ink: fills[1] };
};

// One icon as a PNG's three parts: two colours, one bit a pixel, a row at a time.
const draw = ({ mark, ground, ink }, { name, size, share }) => {
  const wide = mark[0].length, tall = mark.length;
  const px = Math.floor(size * share / Math.max(wide, tall));
  if (px < 1) die(`${name}: the mark has more squares than the icon has room for`);
  if (Math.hypot(wide * px, tall * px) / 2 > size * 0.4 && name.includes('maskable'))
    die(`${name}: the mark's corners leave the circle Android may crop to; lower its share`);
  const left = Math.floor((size - wide * px) / 2), top = Math.floor((size - tall * px) / 2);
  const stride = 1 + Math.ceil(size / 8);
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const row = mark[Math.floor((y - top) / px)];
    if (y < top || !row) continue;
    for (let x = left; x < left + wide * px; x++)
      if (row[Math.floor((x - left) / px)]) raw[y * stride + 1 + (x >> 3)] |= 0x80 >> (x & 7);
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head.set([1, 3, 0, 0, 0], 8);   // one bit deep, from a palette
  const palette = Buffer.from((ground + ink).replace(/#/g, ''), 'hex');
  return { head, palette, raw };
};

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
};
const encode = ({ head, palette, raw }) => Buffer.concat([
  SIGNATURE, chunk('IHDR', head), chunk('PLTE', palette), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
]);
// A PNG file back to those three parts, or null if it is not one.
const decode = file => {
  if (!file.subarray(0, 8).equals(SIGNATURE)) return null;
  const parts = { IHDR: [], PLTE: [], IDAT: [] };
  for (let at = 8; at + 8 <= file.length;) {
    const length = file.readUInt32BE(at), type = file.toString('latin1', at + 4, at + 8);
    parts[type]?.push(file.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  try { return { head: Buffer.concat(parts.IHDR), palette: Buffer.concat(parts.PLTE), raw: inflateSync(Buffer.concat(parts.IDAT)) }; }
  catch { return null; }
};

let stale = 0, written = 0;
for (const app of APPS) {
  const favicon = read(app);
  for (const icon of ICONS) {
    const name = `${app}/brand/${icon.name}`, path = join(ROOT, name);
    const want = draw(favicon, icon);
    const have = existsSync(path) ? decode(readFileSync(path)) : null;
    const same = !!have && ['head', 'palette', 'raw'].every(part => have[part].equals(want[part]));
    if (same) continue;
    if (check) { stale++; console.log(`  FAIL  ${name}: it is not what ${app}/brand/favicon.svg draws; run node tools/build-app-icons.mjs`); continue; }
    writeFileSync(path, encode(want));
    written++;
    console.log(`  wrote ${name}`);
  }
}
const count = APPS.length * ICONS.length;
if (check) {
  console.log(`  ${stale ? 'FAIL' : ' ok '}  icons   ${count} home screen icons${stale ? '' : ', each what its favicon draws'}`);
  if (stale) process.exit(1);
} else console.log(`   ok   icons   ${count} home screen icons, ${written} written`);
