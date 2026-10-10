// The Edge Functions' rule. The Scheduler has two functions that run on
// Supabase and not in the page, so nothing else in the check reads them: the
// connector, the Claude app's door to the trips, and trip-document-link.
// This holds them to three things.
//
//   They parse. Each is TypeScript; its types are taken off and what is left
//   is parsed as the module it is.
//   Every import names one exact version. A range bundles whatever it has
//   come to mean on the day of a deploy, which nobody tried.
//   Every field a draft may fill has a place in the editor. The connector's
//   list and the editor's table are two lists of one thing, and a field in
//   one and not the other is a field Claude fills and the editor drops, or a
//   place nothing can fill.
//
// It fails when it cannot find a function, a list or a table to read.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const SCHEDULER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(SCHEDULER, '..');
const FUNCTIONS = ['connector', 'trip-document-link'];

let failed = 0;
const fail = words => { failed++; console.log(`  FAIL  ${words}`); };

// ── they parse, and their imports are exact ─────────────────────────────────
const EXACT = /^(npm|jsr):(@[a-z0-9._-]+\/)?[a-z0-9._-]+@\d+\.\d+\.\d+(\/[^@]*)?$/i;
const scratch = mkdtempSync(join(tmpdir(), 'check-connector-'));
let files = 0, imports = 0;
try {
  for (const name of FUNCTIONS) {
    const dir = join(SCHEDULER, name);
    let sources = [];
    try { sources = readdirSync(dir).filter(f => f.endsWith('.ts')); } catch { /* said below */ }
    if (!sources.includes('index.ts')) { fail(`scheduler/${name}/ has no index.ts`); continue; }
    for (const file of sources) {
      const path = join(dir, file);
      const shown = relative(ROOT, path);
      const src = readFileSync(path, 'utf8');
      files++;
      let js = null;
      try { js = stripTypeScriptTypes(src); } catch (e) { fail(`${shown} does not parse: ${e.message.split('\n')[0]}`); }
      if (js !== null) {
        const out = join(scratch, `${name}-${file}.mjs`);
        writeFileSync(out, js);
        const r = spawnSync(process.execPath, ['--check', out], { encoding: 'utf8' });
        if (r.status !== 0) fail(`${shown} does not parse: ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) ?? 'see node --check'}`);
      }
      // Every import from outside the folder, with or without names.
      for (const m of src.matchAll(/^\s*import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm)) {
        const from = m[1];
        if (from.startsWith('./') || from.startsWith('../')) continue;
        imports++;
        if (!EXACT.test(from)) fail(`${shown} imports ${from}, which names no exact version`);
      }
    }
  }
} finally { rmSync(scratch, { recursive: true, force: true }); }

// ── every draft field has a place ───────────────────────────────────────────
const between = (text, open, close) => {
  const a = text.indexOf(open);
  const b = a < 0 ? -1 : text.indexOf(close, a + open.length);
  return a < 0 || b < 0 ? null : text.slice(a + open.length, b);
};
const plain = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const connector = readFileSync(join(SCHEDULER, 'connector', 'index.ts'), 'utf8');
const editor = readFileSync(join(SCHEDULER, 'data.js'), 'utf8');
const listed = between(connector, 'const DRAFT_FIELDS = new Set([', '])');
const table = between(editor, 'const DRAFT_CONTROLS = {', '\n  };');
const fields = listed === null ? [] : [...plain(listed).matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]);
const places = table === null ? [] : [...plain(table).matchAll(/^\s{4}([a-z0-9_]+):\s*\{/gm)].map(m => m[1]);
if (!fields.length) fail('the connector\'s DRAFT_FIELDS could not be read');
if (!places.length) fail('the editor\'s DRAFT_CONTROLS could not be read');
if (fields.length && places.length) {
  // The stops are laid out on the Route tab by their own code, not by a row of the table.
  const hasPlace = new Set([...places, 'stops']);
  for (const f of fields) if (!hasPlace.has(f)) fail(`a draft may fill ${f}, and the editor has no place for it`);
  for (const p of places) if (!fields.includes(p)) fail(`the editor has a place for ${p}, and no draft may fill it`);
}

console.log(failed ? `\n  ${failed} fault(s) in the Edge Functions`
  : `   ok   functions  ${files} files of ${FUNCTIONS.length} functions parse, ${imports} imports each name one version, ${fields.length} draft fields each have a place`);
process.exit(failed ? 1 : 0);
