// Runs trip-document-link's handler, a trip document's id in and a ten-minute
// link to its file out, against invented documents: which ids are answered,
// and how a document's address ends with its trip. The handler is TypeScript
// with no imports; its types are taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

process.removeAllListeners('warning');

const source = readFileSync(new URL('../trip-document-link/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-trip-document-link-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, ended, dayAfter } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const ID = '11111111-2222-3333-4444-555555555555';
const doc = { file_path: 'trip/a.pdf', file_name: 'Itinerary.pdf', ends: '2026-10-17', cancelled: false };
async function ask({ found = doc, today = '2026-10-15', staff = false, id = ID, method = 'POST' } = {}) {
  const deps = { find: async () => found, sign: async path => `https://files.example/${path}`, today: () => today, staff: async () => staff };
  const req = new Request('https://example.supabase.co/functions/v1/trip-document-link', {
    method, headers: { origin: 'https://rux-sm.github.io', 'content-type': 'application/json' },
    body: method === 'POST' ? JSON.stringify({ id }) : undefined,
  });
  const res = await handle(req, deps);
  const text = await res.text();
  return [res.status, text ? JSON.parse(text) : null];
}

expect('two days on from a day', dayAfter('2026-10-30', 2), '2026-11-01');
expect('a trip still to come opens its file', await ask(), [200, { url: 'https://files.example/trip/a.pdf', file_name: 'Itinerary.pdf' }]);
expect('up to two days after its last day it still opens', (await ask({ today: '2026-10-19' }))[0], 200);
expect('the third day after, its address has ended', await ask({ today: '2026-10-20' }), [410, { error: 'ended' }]);
expect('a cancelled trip\'s address has ended at once', (await ask({ found: { ...doc, cancelled: true } }))[0], 410);
expect('staff signed in still open it', (await ask({ today: '2026-12-01', staff: true }))[0], 200);
expect('a trip with no dates never ends', ended({ ...doc, ends: null }, '2030-01-01'), false);
expect('an id with no document is not found', (await ask({ found: null }))[0], 404);
expect('a body with no id is refused', (await ask({ id: 'nope' }))[0], 400);
expect('only a POST is answered', (await ask({ method: 'GET' }))[0], 405);

console.log(failed ? `\n  ${failed} fault(s) in trip-document-link` : '\n  trip-document-link: every case passed');
process.exit(failed ? 1 : 0);
