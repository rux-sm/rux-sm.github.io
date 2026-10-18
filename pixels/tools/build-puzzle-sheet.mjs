#!/usr/bin/env node
//
// THE PUZZLE SHEET: every puzzle of the course in one Aseprite file,
// pixels/art/source/puzzles.aseprite, for rux to draw a rift's fifteen side
// by side. check-puzzle-sheet.mjs reads it back.
//
//   node pixels/tools/build-puzzle-sheet.mjs <course.json>
//
// course.json is the owner's course as the database holds it, read through
// the Supabase connection: `rifts`, each a `level`, a `name` and `puzzles`,
// a puzzle being [id, name, side, squares, colours], the last two only
// where it is drawn. A FILE THAT IS THERE IS LEFT ALONE, because it is the
// drawing.
//
// A ROW TO EACH RIFT, rift 1 at the top: its number and name in small
// letters, then fifteen cells at its puzzles' size, in the course's own
// order, which is the order they were made in, the boss last. A cell is a slice named for its enemy, with the puzzle's id
// as the slice's data, so two puzzles of one name stay apart.
//
// THREE LAYERS. `picture` is the finished picture, every square of a cell
// painted. `squares` is the answer, any ink a square to fill, drawn half
// seen over the picture. `Guide` frames each cell, the boss's in red, and
// says each row's name; nothing reads it.
//
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PIXELS = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(PIXELS, 'art', 'source', 'puzzles.aseprite');
const ASEPRITE = process.env.ASEPRITE || '/Applications/Aseprite.app/Contents/MacOS/aseprite';
const fail = text => { console.error(`  ${text}`); process.exit(1); };

if (!process.argv[2]) fail('Name the course: build-puzzle-sheet.mjs <course.json>');
if (existsSync(SHEET)) { console.log('  kept     art/source/puzzles.aseprite'); process.exit(0); }
const course = JSON.parse(readFileSync(process.argv[2], 'utf8'));

// The inks, in the palette's order after its clear colour.
const make = readFileSync(join(PIXELS, 'make.js'), 'utf8'), theme = readFileSync(join(PIXELS, 'theme.css'), 'utf8');
const INKS = [...make.match(/const INKS = \[([\s\S]*?)\n {2}\];/)[1].matchAll(/\['(\w)', '[^']*'\]/g)].map(m => m[1]);
const HEX = Object.fromEntries([...theme.matchAll(/--pixels-ink-(\w): #([0-9a-f]{6});/g)].map(m => [m[1], m[2]]));

// Small capitals, three squares wide and five tall, for the rows' names.
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111',
  9: '111101111001110', ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', "'": '010010000000000',
};

// Where everything stands, in squares.
const EDGE = 2, GAP = 3, LABEL = 5;
const rows = [];
let y = EDGE, width = 0;
for (const [n, rift] of course.rifts.entries()) {
  const puzzles = rift.puzzles.map(([id, name, side, squares, colours]) => ({ id, name, width: side, squares, colours, drawn: !!squares }));
  const tall = Math.max(...puzzles.map(p => p.width));
  const top = y + LABEL + 2;
  let x = EDGE + 1;
  const cells = puzzles.map(p => {
    const cell = { ...p, x, y: top + 1 };
    x += p.width + GAP;
    return cell;
  });
  width = Math.max(width, x - GAP + 1 + EDGE);
  rows.push({ label: `${n + 1} ${rift.name}`.toUpperCase(), y, cells });
  y = top + 1 + tall + 1 + GAP;
}
const height = y - GAP + EDGE;

const lua = s => JSON.stringify(s);
const ink = id => INKS.indexOf(id), CLEAR = INKS.length;
const script = `
local spr = Sprite(${width}, ${height}, ColorMode.INDEXED)
local pal = Palette(${CLEAR + 1})
${INKS.map((id, n) => `pal:setColor(${n}, Color{ r = ${parseInt(HEX[id].slice(0, 2), 16)}, g = ${parseInt(HEX[id].slice(2, 4), 16)}, b = ${parseInt(HEX[id].slice(4), 16)} })`).join('\n')}
pal:setColor(${CLEAR}, Color{ r = 0, g = 0, b = 0, a = 0 })
spr:setPalette(pal)
spr.transparentColor = ${CLEAR}
spr.gridBounds = Rectangle(0, 0, 5, 5)
local picture = spr.layers[1]
picture.name = 'picture'
local squares = spr:newLayer()
squares.name = 'squares'
squares.opacity = 128
local guide = spr:newLayer()
guide.name = 'Guide'
guide.opacity = 192
local pi, si, gi = Image(spr.spec), Image(spr.spec), Image(spr.spec)
pi:clear(${CLEAR}) si:clear(${CLEAR}) gi:clear(${CLEAR})
local function put(img, x, y, n) img:drawPixel(x, y, n) end
${rows.map(r => {
  const out = [];
  [...r.label].forEach((ch, i) => {
    const g = FONT[ch] || FONT[' '];
    [...g].forEach((b, k) => { if (b === '1') out.push(`put(gi, ${EDGE + i * 4 + (k % 3)}, ${r.y + Math.floor(k / 3)}, ${ink('w')})`); });
  });
  r.cells.forEach((c, i) => {
    const frame = ink(i === r.cells.length - 1 ? '2' : 'y');
    for (let k = -1; k <= c.width; k++) out.push(`put(gi, ${c.x + k}, ${c.y - 1}, ${frame}) put(gi, ${c.x + k}, ${c.y + c.width}, ${frame})`);
    for (let k = 0; k < c.width; k++) out.push(`put(gi, ${c.x - 1}, ${c.y + k}, ${frame}) put(gi, ${c.x + c.width}, ${c.y + k}, ${frame})`);
    if (c.drawn) {
      [...c.squares].forEach((s, k) => { if (s === '1') out.push(`put(si, ${c.x + (k % c.width)}, ${c.y + Math.floor(k / c.width)}, ${ink('0')})`); });
      if (c.colours) [...c.colours].forEach((s, k) => out.push(`put(pi, ${c.x + (k % c.width)}, ${c.y + Math.floor(k / c.width)}, ${ink(s)})`));
    }
    out.push(`do local sl = spr:newSlice(Rectangle(${c.x}, ${c.y}, ${c.width}, ${c.width})) sl.name = ${lua(c.name)} sl.data = ${lua(c.id)} end`);
  });
  return out.join('\n');
}).join('\n')}
spr.cels[1].image = pi
spr:newCel(squares, 1, si, Point(0, 0))
spr:newCel(guide, 1, gi, Point(0, 0))
spr:saveAs(${lua(SHEET)})
`;
const dir = mkdtempSync(join(tmpdir(), 'pixels-sheet-'));
writeFileSync(join(dir, 'run.lua'), script);
try { execFileSync(ASEPRITE, ['-b', '--script', join(dir, 'run.lua')], { stdio: ['ignore', 'ignore', 'ignore'] }); }
finally { rmSync(dir, { recursive: true }); }
if (!existsSync(SHEET)) fail('Aseprite wrote no sheet.');
console.log(`  written  art/source/puzzles.aseprite, ${width} by ${height}, ${rows.reduce((n, r) => n + r.cells.length, 0)} cells`);
