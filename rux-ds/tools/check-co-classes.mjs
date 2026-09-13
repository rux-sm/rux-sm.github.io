#!/usr/bin/env node
//
// A Carbon modifier used without the base class that supplies its appearance is
// invisible to every other gate: the class resolves, the component is "covered",
// and the element silently renders with the browser's default chrome
// (roadmap §4.1.5 — the UI-shell hamburger and the time-picker field).
//
// docs/carbon-co-classes.json records which classes @carbon/web-components ALWAYS
// emits together, extracted once from 219 rendered components. This checker is
// plain Node: the browser was needed to produce the map, not to use it.
//
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pageFiles } from './lib/sources.mjs';

const map = JSON.parse(readFileSync('docs/carbon-co-classes.json', 'utf8'));
const ROOTS = pageFiles();

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (extname(p) === '.html') out.push(p);
  return out;
}

const toCds = c => c.replace(/^rux--/, 'cds--');
let findings = 0;

for (const file of ROOTS.flatMap(r => walk(r))) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    const own = m[1].split(/\s+/).filter(c => c.startsWith('rux--'));
    if (!own.length) continue;
    const set = new Set(own.map(toCds));
    for (const c of set) {
      const req = map.required[c];
      if (!req) continue;
      const missing = req.filter(r => !set.has(r));
      if (missing.length) {
        // NAME THE FILE. This printed the class attribute and nothing else
        // until 2026-08-29, which was survivable while the only root was the
        // assembled sink — one file, and the attribute identified the element
        // well enough. It stopped being survivable when templates and the
        // portal joined ROOTS: a finding could be in any of eight files and the
        // output said which of them only by accident. Every other gate here
        // prints a path you can open.
        console.log(`  ${file}`);
        console.log(`      ${toCds(c)} used without ${missing.join(' + ')}`);
        console.log(`      in: ${m[1].slice(0, 88)}`);
        findings++;
      }
    }
  }
}

const n = Object.keys(map.required).length;
console.log(`\n  ${n} required-co-class rules · ${Object.keys(map._ignored).length} ignored as sample artifacts · ${findings} violation${findings === 1 ? '' : 's'}`);
process.exit(findings ? 1 : 0);
