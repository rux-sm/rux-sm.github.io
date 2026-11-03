#!/usr/bin/env node
//
// THE INKS, written from their one table, tools/lib/inks.mjs, into the four
// places that hold them: theme.css, each ink's colour as a variable;
// app.css, a rule to each character naming its variable; app.js, the
// characters and the ramps the Pixelator shows; and art/source/pixels.gpl,
// the palette Aseprite loads, seven to a row, a colour to a row.
//
//   node pixels/tools/build-inks.mjs           writes them
//   node pixels/tools/build-inks.mjs --check   fails if any is not as the table says
//
// Each is written between INKS:BEGIN and INKS:END and nothing else in the
// file is touched; the .gpl is written whole.
//
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INKS, RAMPS, CHARS } from './lib/inks.mjs';

const PIXELS = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const between = (file, open, close, body) => {
  const text = readFileSync(file, 'utf8');
  const start = text.indexOf(open), end = text.indexOf(close);
  if (start < 0 || end < start) { console.error(`  ${relative(PIXELS, file)} has no ${open.trim()} … ${close.trim()}`); process.exit(1); }
  return text.slice(0, start + open.length) + body + text.slice(end);
};
const css = (file, body) => between(file, '/* INKS:BEGIN */\n', '/* INKS:END */', body);
const js = (file, body) => between(file, '  /* INKS:BEGIN */\n', '  /* INKS:END */', body);

const files = {
  'theme.css': css(join(PIXELS, 'theme.css'), `:root {\n${INKS.map(k => `  ${k.variable}: ${k.hex};`).join('\n')}\n}\n`),
  'app.css': css(join(PIXELS, 'app.css'), `${INKS.map(k => `[data-ink="${k.c}"] { --ink: var(${k.variable}); }`).join('\n')}\n`),
  'app.js': js(join(PIXELS, 'app.js'), `  const CHARS = '${CHARS}';
  // Each ramp: its name, then each shade's character, palest to darkest,
  // its name and its variable in theme.css.
  const RAMPS = [
${RAMPS.map(([name], r) => `    ['${name}', [${INKS.filter(k => k.ramp === name).map(k => `['${k.c}', '${k.name}', '${k.variable}']`).join(', ')}]],`).join('\n')}
  ];
`),
  'art/source/pixels.gpl': `GIMP Palette\nName: Pixels\nColumns: 7\n#\n${INKS.map(k => `${[1, 3, 5].map(i => String(parseInt(k.hex.slice(i, i + 2), 16)).padStart(3)).join(' ')}\t${k.name}`).join('\n')}\n`,
};

let stale = 0;
for (const [name, body] of Object.entries(files)) {
  const file = join(PIXELS, name);
  const was = (() => { try { return readFileSync(file, 'utf8'); } catch { return ''; } })();
  if (was === body) continue;
  if (check) { console.log(`  FAIL  pixels/${name} is not as tools/lib/inks.mjs says; run node pixels/tools/build-inks.mjs`); stale++; }
  else { writeFileSync(file, body); console.log(`  written  pixels/${name}`); }
}
if (check) {
  if (stale) process.exit(1);
  console.log(`   ok   inks    ${INKS.length} inks, written as tools/lib/inks.mjs says`);
}
