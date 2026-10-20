// The Edge Functions' rule. The Scheduler's functions run on Supabase and not
// in the page, so nothing else in the check reads them: the connector, the
// Claude app's door to the trips; trip-document-link; quote-request;
// samsara-miles; samsara-now; and maintenance-status. This holds them to
// three things.
//
//   They parse. Each is TypeScript; its types are taken off and what is left
//   is parsed as the module it is.
//   Every import names one exact version. A range bundles whatever it has
//   come to mean on the day of a deploy, which nobody tried.
//   The connector's rules are the pages' rule files as they are now.
//   connector/rules.ts is built from them, and a stale copy answers Claude
//   by rules the pages no longer keep. It is run, too: each rule it hands
//   the connector is there.
//
// It fails when it cannot find a function to read.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const SCHEDULER = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(SCHEDULER, '..');
const FUNCTIONS = ['connector', 'trip-document-link', 'quote-request', 'samsara-miles', 'samsara-now', 'maintenance-status'];

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

// ── the connector's rules are the pages' ────────────────────────────────────
const { build, FILES } = await import('./build-connector-rules.mjs');
const rulesPath = join(SCHEDULER, 'connector', 'rules.ts');
let rulesNow = '';
try { rulesNow = readFileSync(rulesPath, 'utf8'); } catch { /* said below */ }
if (rulesNow !== build()) fail('scheduler/connector/rules.ts is not the rule files as they are; run npm run build');
const wanted = { SchedulerDraftFields: ['FIELDS', 'problems'], SchedulerBilling: ['placeholder'], SchedulerFollowUp: ['today'],
  SchedulerLegFacts: ['readBasics'], SchedulerToDo: ['read', 'rows', 'handed', 'KINDS'], SchedulerDepartures: ['readDay', 'readTrip', 'gapWords', 'prepDays'] };
const rulesDir = mkdtempSync(join(tmpdir(), 'check-connector-rules-'));
try {
  const out = join(rulesDir, 'rules.mjs');
  writeFileSync(out, stripTypeScriptTypes(rulesNow));
  const rules = (await import(pathToFileURL(out).href)).default;
  for (const [name, parts] of Object.entries(wanted)) {
    for (const part of parts) if (rules[name]?.[part] == null) fail(`the connector's rules have no ${name}.${part}`);
  }
} catch (e) { fail(`the connector's rules do not run: ${e.message.split('\n')[0]}`); }
finally { rmSync(rulesDir, { recursive: true, force: true }); }

console.log(failed ? `\n  ${failed} fault(s) in the Edge Functions`
  : `   ok   functions  ${files} files of ${FUNCTIONS.length} functions parse, ${imports} imports each name one version, the connector's rules are ${FILES.length} rule files as they are`);
process.exit(failed ? 1 : 0);
