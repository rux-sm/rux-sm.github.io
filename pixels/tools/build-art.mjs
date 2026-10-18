#!/usr/bin/env node
//
// THE PICTURES rux DRAWS, between Aseprite and the game. Each picture has an
// Aseprite file in pixels/art/source/, the size it is drawn at and painted
// from the game's sixty inks alone, since the file is indexed to them.
//
//   node pixels/tools/build-art.mjs templates   writes the Aseprite files that are not there
//   node pixels/tools/build-art.mjs             puts every Aseprite file into the game
//
// THE TEMPLATES. `character.aseprite` is the character, 15 squares a side, a
// layer to each of its parts, starting as the placeholder app.js draws.
// `sword.aseprite` and `shield.aseprite` are the switch's two halves, 9 a
// side. `map-1.aseprite` to `map-6.aseprite` and `fog.aseprite` start as the
// placeholders build-placeholders.mjs writes, with a layer over each, Keep
// clear, that marks where the game draws a portal and its words.
// `rift-01.aseprite` to `rift-12.aseprite` are a rift's world, 120 by 40,
// blank. `icons.aseprite` is the game's icons, 12 a side, a frame to each,
// named by a tag, with a Guide layer that marks the middle 10 by 10 where
// the drawing goes; the game draws an icon in the words' colour, so one ink
// is enough. A FILE THAT IS THERE IS LEFT ALONE, because it may be a drawing.
//
// INTO THE GAME. The character's layers and the switch's two pictures are
// written into app.js as the strings it keeps them in, an ink a square. The
// map and the fog are saved over their PNGs in pixels/art/ without Keep
// clear, and a rift's world as `rift-01.png` and on once anything is drawn
// on it.
//
// THE PALETTE is the inks in the Pixelator's order, read from make.js, in
// the colours theme.css gives them, after one clear colour, which is no ink.
// `templates` also writes it as art/source/pixels.gpl, which Aseprite loads
// as a palette for a new file.
//
import { existsSync, mkdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const PIXELS = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(PIXELS, 'art'), SOURCE = join(ART, 'source');
const APP = join(PIXELS, 'app.js');
const ASEPRITE = process.env.ASEPRITE || '/Applications/Aseprite.app/Contents/MacOS/aseprite';
const MAPS = 6, RIFTS = 12, PORTAL = 15, WORDS = [56, 12];

const fail = text => { console.error(`  ${text}`); process.exit(1); };
if (!existsSync(ASEPRITE)) fail(`Aseprite is not at ${ASEPRITE}; set ASEPRITE to where it is.`);

// The inks, in the Pixelator's order, and each one's colour.
const make = readFileSync(join(PIXELS, 'make.js'), 'utf8'), theme = readFileSync(join(PIXELS, 'theme.css'), 'utf8');
const INKS = [...(make.match(/const INKS = \[([\s\S]*?)\n {2}\];/) || fail('make.js has no INKS'))[1].matchAll(/\['(\w)', '[^']*'\]/g)].map(m => m[1]);
const HEX = Object.fromEntries([...theme.matchAll(/--pixels-ink-(\w): #([0-9a-f]{6});/g)].map(m => [m[1], m[2]]));
if (!INKS.length || INKS.length !== Object.keys(HEX).length || INKS.some(id => !HEX[id])) fail('make.js and theme.css do not agree on the inks.');

// The character's layers from the foot of Aseprite's list up, which is the
// order app.js draws them in; each is the layer's name and its key in HERO.
const PARTS = [['skin', 'skin'], ['eyes', 'eyes'], ['hair', 'hair'], ['helmet', 'helmet'], ['body', 'body'], ['body armour', 'armour'],
  ['hands and feet', 'ends'], ['shield', 'shield'], ['sword', 'sword']];
const SWITCH = [['sword', 'SWORD'], ['shield', 'SHIELD']];
// The icons Pixels shows, each a frame of icons.aseprite, by what it is for.
const ICONS = ['back', 'restart', 'undo', 'redo', 'sound-on', 'sound-off', 'puzzles', 'friends', 'pixelator', 'me'];

// A picture in app.js: HERO's parts are `  key: [rows].join(''),` and the
// switch's `const NAME = [rows].join('');`.
let app = readFileSync(APP, 'utf8');
const heroAt = key => new RegExp(`(\\n {4}${key}: )\\[[^\\]]*\\]\\.join\\(''\\),`);
const constAt = name => new RegExp(`(\\n {2}const ${name} = )\\[[^\\]]*\\]\\.join\\(''\\);`);
const rowsOf = found => found && [...found[0].matchAll(/'([^']*)'/g)].map(m => m[1]).slice(0, -1).join('');
const written = (squares, side) => `[${Array.from({ length: side }, (_, y) => `'${squares.slice(y * side, y * side + side)}'`).join(', ')}].join('')`;

// A Lua string, and the Lua that runs it in Aseprite with no window.
const lua = s => JSON.stringify(s);
const PALETTE = `local pal = Palette(${INKS.length + 1})
pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
local ids = ${lua(INKS.join(''))}
${INKS.map((id, n) => `pal:setColor(${n + 1}, Color{ r = ${parseInt(HEX[id].slice(0, 2), 16)}, g = ${parseInt(HEX[id].slice(2, 4), 16)}, b = ${parseInt(HEX[id].slice(4), 16)} })`).join('\n')}
local function ink(id) if id == '.' then return 0 end return ids:find(id, 1, true) end
local function paint(img, squares, w)
  for i = 1, #squares do
    local n = ink(squares:sub(i, i))
    if n and n > 0 then img:drawPixel((i - 1) % w, (i - 1) // w, n) end
  end
end`;
const run = script => {
  const dir = mkdtempSync(join(tmpdir(), 'pixels-art-')), file = join(dir, 'run.lua');
  writeFileSync(file, `${PALETTE}\n${script}`);
  try {
    // Aseprite's extensions may print as it starts, which is no fault here,
    // so what this reads is only its lines of JSON.
    return execFileSync(ASEPRITE, ['-b', '--script', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } finally { rmSync(dir, { recursive: true }); }
};

// A new file of blank or drawn layers, each [name, squares or null, how solid].
const sprite = (file, w, h, layers, grid) => `do
  local spr = Sprite(${w}, ${h}, ColorMode.INDEXED)
  spr:setPalette(pal)
  spr.transparentColor = 0
  spr.gridBounds = Rectangle(0, 0, ${grid}, ${grid})
${layers.map(([name, squares, opacity = 255], n) => `  do
    local layer = ${n ? 'spr:newLayer()' : 'spr.layers[1]'}
    layer.name = ${lua(name)}
    layer.opacity = ${opacity}
    local img = Image(spr.spec)
    ${squares ? `paint(img, ${lua(squares)}, ${w})` : ''}
    ${n ? 'spr:newCel(layer, 1, img, Point(0, 0))' : 'spr.cels[1].image = img'}
  end`).join('\n')}
  spr:saveAs(${lua(file)})
  spr:close()
end`;

// A part of the map, or the fog, from its PNG, its colours each made the
// nearest ink, with Keep clear over it.
const fromPng = (file, png, marks) => `do
  local spr = Sprite{ fromFile = ${lua(png)} }
  app.activeSprite = spr
  if spr.colorMode ~= ColorMode.RGB then app.command.ChangePixelFormat{ format = 'rgb' } end
  spr:setPalette(pal)
  app.command.ChangePixelFormat{ format = 'indexed', dithering = 'none' }
  spr.transparentColor = 0
  spr.gridBounds = Rectangle(0, 0, 10, 10)
  spr.layers[1].name = 'ground'
  ${marks ? `local layer = spr:newLayer()
  layer.name = 'Keep clear'
  layer.opacity = 160
  local img = Image(spr.spec)
  paint(img, ${lua(marks)}, spr.width)
  spr:newCel(layer, 1, img, Point(0, 0))` : ''}
  spr:saveAs(${lua(file)})
  spr:close()
end`;

// Keep clear on a part: a pink square where each portal stands and a box
// where its words lie, dashed for the side place on the first part.
const keepClear = n => {
  const w = 120, h = 80, at = new Array(w * h).fill('.');
  const dot = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) at[y * w + x] = '8'; };
  const frame = (x, y, fw, fh, dashed) => {
    for (let i = 0; i < fw; i++) if (!dashed || i % 2 === 0) { dot(x + i, y); dot(x + i, y + fh - 1); }
    for (let j = 0; j < fh; j++) if (!dashed || j % 2 === 0) { dot(x, y + j); dot(x + fw - 1, y + j); }
  };
  const puzzles = readFileSync(join(PIXELS, 'puzzles.js'), 'utf8');
  const read = name => JSON.parse((puzzles.match(new RegExp(`const ${name} = (\\[[^;]*\\]);`)) || fail(`puzzles.js has no ${name}`))[1]);
  const SPOTS = read('SPOTS'), SIDE = read('SIDE');
  const stand = ([x, y], dashed) => { frame(x, y, PORTAL, PORTAL, dashed); frame(x + 7 - WORDS[0] / 2, y + PORTAL + 1, WORDS[0], WORDS[1], dashed); };
  stand(SPOTS[n * 2]);
  stand(SPOTS[n * 2 + 1]);
  if (n === 0) stand(SIDE, true);
  return at.join('');
};

const pad = n => String(n).padStart(2, '0');

if (process.argv[2] === 'templates') {
  mkdirSync(SOURCE, { recursive: true });
  writeFileSync(join(SOURCE, 'pixels.gpl'), `GIMP Palette\nName: Pixels\nColumns: 5\n#\n${INKS.map(id => {
    const [r, g, b] = [0, 2, 4].map(i => parseInt(HEX[id].slice(i, i + 2), 16));
    return `${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}\t${id}`;
  }).join('\n')}\n`);
  console.log('  written  art/source/pixels.gpl');
  const jobs = [];
  const job = (name, script) => {
    const file = join(SOURCE, name);
    if (existsSync(file)) { console.log(`  kept     art/source/${name}`); return; }
    jobs.push(script(file));
    console.log(`  written  art/source/${name}`);
  };
  job('character.aseprite', file => sprite(file, 15, 15, PARTS.map(([name, key]) => {
    const found = app.match(heroAt(key));
    return [name, found ? rowsOf(found) : null];
  }), 5));
  for (const [name, CONST] of SWITCH) job(`${name}.aseprite`, file => sprite(file, 9, 9, [[name, rowsOf(app.match(constAt(CONST)))]], 3));
  for (let n = 0; n < MAPS; n++) {
    const png = join(ART, `map-${n + 1}.png`);
    if (!existsSync(png)) fail(`art/map-${n + 1}.png is not there; run build-placeholders.mjs first.`);
    job(`map-${n + 1}.aseprite`, file => fromPng(file, png, keepClear(n)));
  }
  job('fog.aseprite', file => fromPng(file, join(ART, 'fog.png'), null));
  job('icons.aseprite', file => `do
  local names = ${lua(JSON.stringify(ICONS))}
  local list = json.decode(names)
  local spr = Sprite(12, 12, ColorMode.INDEXED)
  spr:setPalette(pal)
  spr.transparentColor = 0
  spr.gridBounds = Rectangle(0, 0, 1, 1)
  spr.layers[1].name = 'icon'
  local guide = spr:newLayer()
  guide.name = 'Guide'
  guide.opacity = 96
  local ring = Image(spr.spec)
  for i = 1, 10 do ring:drawPixel(i, 1, ink('8')) ring:drawPixel(i, 10, ink('8')) ring:drawPixel(1, i, ink('8')) ring:drawPixel(10, i, ink('8')) end
  for n = 2, #list do spr:newFrame() end
  for n = 1, #list do
    spr:newCel(guide, n, ring, Point(0, 0))
    local tag = spr:newTag(n, n)
    tag.name = list[n]
  end
  spr:saveAs(${lua(file)})
  spr:close()
end`);
  for (let n = 1; n <= RIFTS; n++) job(`rift-${pad(n)}.aseprite`, file => sprite(file, 120, 40, [['world', null]], 10));
  if (jobs.length) run(jobs.join('\n'));
  process.exit(0);
}

// Each file's layers as squares, an ink or a dot each, one line of JSON to a layer.
const READ = `local function read(file)
  local spr = Sprite{ fromFile = file }
  if spr.colorMode ~= ColorMode.INDEXED then print(json.encode{ file = file, fault = 'is not indexed to the inks' }) spr:close() return end
  for _, layer in ipairs(spr.layers) do
    local out, cel = {}, layer:cel(1)
    for i = 1, spr.width * spr.height do out[i] = '.' end
    if cel then
      for px in cel.image:pixels() do
        local x, y = px.x + cel.position.x, px.y + cel.position.y
        local n = px()
        if n > 0 and x >= 0 and y >= 0 and x < spr.width and y < spr.height then out[y * spr.width + x + 1] = ids:sub(n, n) end
      end
    end
    print(json.encode{ file = file, layer = layer.name, w = spr.width, h = spr.height, squares = table.concat(out) })
  end
  spr:close()
end`;
const read = files => {
  const rows = run(`${READ}\n${files.map(f => `read(${lua(f)})`).join('\n')}`).split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
  const bad = rows.find(r => r.fault);
  if (bad) fail(`${bad.file} ${bad.fault}.`);
  return rows;
};
const missing = name => !existsSync(join(SOURCE, name));
if (missing('character.aseprite')) fail('art/source/ has no templates; run this with templates first.');

// The character and the switch, into app.js.
let changed = [];
const rows = read([join(SOURCE, 'character.aseprite'), ...SWITCH.map(([name]) => join(SOURCE, `${name}.aseprite`))]);
for (const [name, key] of PARTS) {
  const layer = rows.find(r => r.file.endsWith('character.aseprite') && r.layer === name);
  if (!layer) fail(`character.aseprite has no layer named ${name}.`);
  if (layer.w !== 15 || layer.h !== 15) fail('character.aseprite must stay 15 by 15.');
  const now = `$1${written(layer.squares, 15)},`;
  if (heroAt(key).test(app)) {
    if (rowsOf(app.match(heroAt(key))) !== layer.squares) { app = app.replace(heroAt(key), now); changed.push(name); }
  } else if (/[^.]/.test(layer.squares)) {
    // A part app.js does not draw yet is kept after the body, for when it does.
    app = app.replace(heroAt('body'), m => `${m}\n    ${key}: ${written(layer.squares, 15)},`);
    changed.push(name);
  }
}
for (const [name, CONST] of SWITCH) {
  const layer = rows.find(r => r.file.endsWith(`${name}.aseprite`));
  if (layer.w !== 9 || layer.h !== 9) fail(`${name}.aseprite must stay 9 by 9.`);
  const all = rows.filter(r => r.file === layer.file).reduce((a, r) => [...r.squares].map((s, i) => (s === '.' ? a[i] : s)).join(''), '.'.repeat(81));
  if (rowsOf(app.match(constAt(CONST))) !== all) { app = app.replace(constAt(CONST), `$1${written(all, 9)};`); changed.push(`${name} key`); }
}
if (changed.length) writeFileSync(APP, app);
console.log(changed.length ? `  app.js   ${changed.join(', ')}` : '  app.js   as it was');

// The map, the fog and the worlds, into their PNGs.
const saves = [];
for (let n = 1; n <= MAPS; n++) if (!missing(`map-${n}.aseprite`)) saves.push([`map-${n}`, true]);
if (!missing('fog.aseprite')) saves.push(['fog', true]);
for (let n = 1; n <= RIFTS; n++) {
  const name = `rift-${pad(n)}`;
  if (missing(`${name}.aseprite`)) continue;
  if (read([join(SOURCE, `${name}.aseprite`)]).some(r => /[^.]/.test(r.squares))) saves.push([name, false]);
}
run(saves.map(([name]) => `do
  local spr = Sprite{ fromFile = ${lua(join(SOURCE, `${name}.aseprite`))} }
  for _, layer in ipairs(spr.layers) do if layer.name == 'Keep clear' then layer.isVisible = false end end
  spr:saveCopyAs(${lua(join(ART, `${name}.png`))})
  spr:close()
end`).join('\n'));
for (const [name] of saves) console.log(`  saved    art/${name}.png`);
