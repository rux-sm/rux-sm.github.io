#!/usr/bin/env node
//
// THE MAP'S PLACEHOLDERS, which are also the templates its pictures are drawn
// on. Writes pixels/art/map-1.png to map-6.png, the six parts of the world
// map from the foot up, and pixels/art/fog.png, the band that lies over the
// highest part shown. Each is pixel art, one pixel to a square.
//
//   node pixels/tools/build-placeholders.mjs   writes the files that are not there
//
// A FILE THAT IS THERE IS LEFT ALONE, because once a part is drawn its file
// is the drawing and this would paint a template over it. To make a
// placeholder again, delete its file and run this.
//
// WHERE THINGS STAND IS READ FROM puzzles.js, which draws the rifts over
// these pictures: its SPOTS and its SIDE. So a spot is moved there, the
// part's placeholder is deleted, and this is run again.
//
// A PART is 120 squares wide and 80 tall: plain ground, a path three squares
// wide from the middle of its foot to the middle of its top through its two
// rifts, a square marking where each portal stands, and under it a box
// marking where the rift's words lie, so a drawing keeps both clear. The first part also
// marks the side place, where the rifts outside the course are reached.
//
// THE FOG is 120 wide and 24 tall. Its last 8 rows thin out to nothing,
// because they lie over the top of the part below.
//
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIXELS = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(PIXELS, 'art');
const W = 120, H = 80, FOG = 24, MELT = 8, PORTAL = 15, WORDS = [56, 12];

const source = readFileSync(join(PIXELS, 'puzzles.js'), 'utf8');
const read = name => {
  const found = source.match(new RegExp(`const ${name} = (\\[[^;]*\\]);`));
  if (!found) { console.error(`  puzzles.js has no ${name}`); process.exit(1); }
  return JSON.parse(found[1]);
};
const SPOTS = read('SPOTS'), SIDE = read('SIDE');

// A picture is its squares, four numbers each: red, green, blue and how solid.
const canvas = (w, h) => ({ w, h, at: new Uint8Array(w * h * 4) });
const dot = (c, x, y, [r, g, b, a = 255]) => {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  c.at.set([r, g, b, a], (y * c.w + x) * 4);
};
const fill = (c, x, y, w, h, ink) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) dot(c, i, j, ink); };
const frame = (c, x, y, w, h, ink, dashed) => {
  for (let i = 0; i < w; i++) if (!dashed || i % 2 === 0) { dot(c, x + i, y, ink); dot(c, x + i, y + h - 1, ink); }
  for (let j = 0; j < h; j++) if (!dashed || j % 2 === 0) { dot(c, x, y + j, ink); dot(c, x + w - 1, y + j, ink); }
};
const png = c => {
  const chunk = (type, body) => {
    const out = Buffer.alloc(body.length + 12);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'latin1');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, body.length + 8)), body.length + 8);
    return out;
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(c.w, 0);
  head.writeUInt32BE(c.h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  // Each row starts with the byte that says it is written as it is.
  const rows = Buffer.alloc((c.w * 4 + 1) * c.h);
  for (let y = 0; y < c.h; y++) rows.set(c.at.subarray(y * c.w * 4, (y + 1) * c.w * 4), y * (c.w * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
};

// A part's ground, one to a rank from E to S.
const GROUND = [[63, 125, 69], [36, 73, 47], [90, 95, 102], [47, 108, 143], [91, 74, 122], [122, 59, 46]];
const PATH = [217, 191, 138];
const shade = ([r, g, b], by) => [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v * by))));

const part = n => {
  const c = canvas(W, H), ground = GROUND[n];
  fill(c, 0, 0, W, H, ground);
  const [a, b] = [SPOTS[n * 2], SPOTS[n * 2 + 1]].map(([x, y]) => [x + 7, y + 7]);
  // The path turns square corners, so no box of words lies on it.
  const road = (x1, y1, x2, y2) => fill(c, Math.min(x1, x2) - 1, Math.min(y1, y2) - 1, Math.abs(x2 - x1) + 3, Math.abs(y2 - y1) + 3, PATH);
  [[60, H - 1, 60, a[1]], [60, a[1], a[0], a[1]], [a[0], a[1], a[0], b[1]], [a[0], b[1], b[0], b[1]], [b[0], b[1], b[0], 5], [b[0], 5, 60, 5], [60, 5, 60, 0]]
    .forEach(leg => road(...leg));
  const stand = ([x, y], solid) => {
    fill(c, x, y, PORTAL, PORTAL, shade(ground, .78));
    frame(c, x, y, PORTAL, PORTAL, shade(ground, .5), !solid);
    frame(c, x + 7 - WORDS[0] / 2, y + PORTAL + 1, WORDS[0], WORDS[1], shade(ground, 1.35), true);
  };
  stand(SPOTS[n * 2], true);
  stand(SPOTS[n * 2 + 1], true);
  if (n === 0) {
    stand(SIDE, false);
    // The side place is a tent until it is drawn.
    for (let i = 0; i < 6; i++) fill(c, SIDE[0] + 7 - i, SIDE[1] + 3 + i, i * 2 + 1, 1, [244, 244, 244]);
    fill(c, SIDE[0] + 7, SIDE[1] + 6, 1, 3, shade(ground, .5));
  }
  return c;
};

// How soon a square of a four by four patch drops out as a pattern thins.
const THIN = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const fog = () => {
  const c = canvas(W, FOG);
  for (let x = 0; x < W; x++) {
    // Rounded tops, 12 squares across, against nothing.
    const hump = Math.round(3 * Math.abs(Math.sin((x + 3) * Math.PI / 12)));
    for (let y = 4 - hump; y < FOG; y++) {
      // Each of the last rows keeps two squares in sixteen fewer than the row above.
      const melting = y - (FOG - MELT);
      if (melting >= 0 && THIN[y % 4][x % 4] < (melting + 1) * 2) continue;
      dot(c, x, y, y < 7 - hump ? [244, 244, 244] : y % 6 === 5 ? [198, 198, 198] : [224, 224, 224]);
    }
  }
  return c;
};

mkdirSync(ART, { recursive: true });
const files = [...GROUND.map((_, n) => [`map-${n + 1}.png`, () => part(n)]), ['fog.png', fog]];
for (const [name, draw] of files) {
  const file = join(ART, name);
  if (existsSync(file)) { console.log(`  kept     art/${name}`); continue; }
  writeFileSync(file, png(draw()));
  console.log(`  written  art/${name}`);
}
