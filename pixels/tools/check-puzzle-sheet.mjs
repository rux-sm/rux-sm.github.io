#!/usr/bin/env node
//
// THE PUZZLE SHEET, READ BACK. Compares pixels/art/source/puzzles.aseprite
// with the course as the database holds it, checks every cell that differs
// as the Pixelator would, and writes the one statement that saves those
// that pass. Nothing here touches the database: the statement is run
// through the Supabase connection once rux has read the list and said yes.
//
//   node pixels/tools/check-puzzle-sheet.mjs <course.json> [--rift 3] [--sql out.sql]
//
// course.json is as build-puzzle-sheet.mjs takes it, read fresh before
// each import. A cell is the slice whose data is a puzzle's id.
//
// A CELL IS DRAWN when its `squares` layer has a square in it. One that
// differs from the database is checked: its picture paints every square
// or none, since a puzzle with no picture finishes in black and white;
// and app.js's own line solver must reach every square, as the Pixelator
// asks before it saves. One that passes is listed with how hard it is, how
// much the first look gives and how much is filled. A cell left empty is
// still a placeholder and is skipped, and one that empties a drawn puzzle
// is reported and never written.
//
// THE STATEMENT writes a puzzle's squares and colours over its row, by id,
// for the owner's puzzles alone, and leaves its name, rift, place and
// whether it is on as they are. It returns how many rows it changed.
//
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pixels } from './lib/pixels-solver.mjs';

const PIXELS = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHEET = join(PIXELS, 'art', 'source', 'puzzles.aseprite');
const ASEPRITE = process.env.ASEPRITE || '/Applications/Aseprite.app/Contents/MacOS/aseprite';
const fail = text => { console.error(`  ${text}`); process.exit(1); };

const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : args.splice(i, 2)[1]; };
const onlyRift = flag('--rift'), sqlOut = flag('--sql');
if (!args[0]) fail('Name the course: check-puzzle-sheet.mjs <course.json> [--rift N] [--sql out.sql]');
if (!existsSync(SHEET)) fail('art/source/puzzles.aseprite is not there; run build-puzzle-sheet.mjs.');
const course = JSON.parse(readFileSync(args[0], 'utf8'));
const P = pixels();

// The inks, in the palette's order after its clear colour.
const make = readFileSync(join(PIXELS, 'make.js'), 'utf8');
const INKS = [...make.match(/const INKS = \[([\s\S]*?)\n {2}\];/)[1].matchAll(/\['(\w)', '[^']*'\]/g)].map(m => m[1]);

// Every cell of the sheet: its slice's id and the two layers under it, an
// ink or a dot a square.
const dir = mkdtempSync(join(tmpdir(), 'pixels-sheet-'));
writeFileSync(join(dir, 'run.lua'), `
local s = Sprite{ fromFile = ${JSON.stringify(SHEET)} }
local ids = ${JSON.stringify(INKS.join(''))}
local layer = {}
for _, l in ipairs(s.layers) do layer[l.name] = l end
local function read(l, r)
  local out = {}
  local c = l and l:cel(1)
  for y = r.y, r.y + r.height - 1 do for x = r.x, r.x + r.width - 1 do
    local n = ${INKS.length}
    if c then
      local ix, iy = x - c.position.x, y - c.position.y
      if ix >= 0 and iy >= 0 and ix < c.image.width and iy < c.image.height then n = c.image:getPixel(ix, iy) end
    end
    out[#out + 1] = n < ${INKS.length} and ids:sub(n + 1, n + 1) or '.'
  end end
  return table.concat(out)
end
for _, sl in ipairs(s.slices) do
  print(json.encode{ id = sl.data, name = sl.name, side = sl.bounds.width, squares = read(layer.squares, sl.bounds), picture = read(layer.picture, sl.bounds) })
end`);
let cells;
try {
  cells = execFileSync(ASEPRITE, ['-b', '--script', join(dir, 'run.lua')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
} finally { rmSync(dir, { recursive: true }); }

const held = new Map();
for (const [n, rift] of course.rifts.entries()) for (const [id, name, side, squares, colours] of rift.puzzles) held.set(id, { rift: n + 1, name, side, squares: squares || null, colours: colours || null });

const rows = [], save = [];
for (const cell of cells) {
  const was = held.get(cell.id);
  if (!was) { rows.push(['?', cell.name, '', 'not in the course', '']); continue; }
  if (onlyRift && String(was.rift) !== onlyRift) continue;
  const drawn = /[^.]/.test(cell.squares);
  const squares = [...cell.squares].map(s => (s === '.' ? '0' : '1')).join('');
  const painted = cell.picture.replace(/\./g, '').length;
  const colours = painted ? cell.picture : null;
  if (!drawn) {
    if (was.squares) rows.push([was.rift, was.name, `${was.side}×${was.side}`, 'emptied: a drawn puzzle is not erased from the sheet', '']);
    continue;
  }
  if (squares === was.squares && colours === was.colours) continue;
  const label = [was.rift, was.name, `${was.side}×${was.side}`];
  if (painted && painted < cell.picture.length) { rows.push([...label, `picture misses ${cell.picture.length - painted} squares`, '']); continue; }
  const g = P.grid(squares, was.side);
  const guesses = P.unreached(g).flat().filter(Boolean).length;
  if (guesses) { rows.push([...label, `${guesses} to guess`, '']); continue; }
  const filled = Math.round(squares.split('').filter(s => s === '1').length * 100 / squares.length);
  rows.push([...label, 'passes', `${P.grade(P.rounds(g))}, ${Math.round(P.firstLook(g) * 100)}% first look, ${filled}% filled${colours ? '' : ', no picture'}`]);
  save.push({ id: cell.id, squares, colours });
}

if (!rows.length) { console.log('  The sheet and the database agree.'); process.exit(0); }
const widths = [4, 18, 7, 24];
for (const r of [['Rift', 'Puzzle', 'Size', 'Check', ''], ...rows]) console.log('  ' + r.map((v, i) => String(v).padEnd(widths[i] || 0)).join('  ').trimEnd());
console.log(`\n  ${save.length} to save, ${rows.length - save.length} held back.`);

if (sqlOut && save.length) {
  const q = v => (v === null ? 'null' : `'${v.replace(/'/g, "''")}'`);
  const sql = `with v(id, squares, colours) as (values\n${save.map(s => `  (${q(s.id)}::uuid, ${q(s.squares)}, ${q(s.colours)})`).join(',\n')}\n), saved as (\n  update public.pixels_puzzles p set squares = v.squares, colours = v.colours, updated_at = now()\n  from v where p.id = v.id and p.maker is null\n  returning p.id\n)\nselect count(*) as saved from saved;\n`;
  writeFileSync(sqlOut, sql);
  console.log(`  The statement is in ${sqlOut}.`);
}
