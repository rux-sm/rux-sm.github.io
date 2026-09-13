#!/usr/bin/env node
//
// WHAT IS STILL OPEN, read off docs/log.md rather than kept beside it.
//
// Every pass here records what it did NOT do, in the entry for the day it was
// found -- which is the right place for it, and the reason nothing collected
// them: they are 14 paragraphs spread over 3,600 lines. This prints the list.
//
//   node tools/open.mjs           every open item, newest first
//   node tools/open.mjs --since 2026-09-10
//
// IT READS HEADERS, NEVER PROSE. An item is a paragraph opening `**NOT DONE`
// or `**STILL OPEN`, and its date is the dated entry it sits under. Nothing
// else is interpreted.
//
// IT CANNOT TELL YOU AN OLD ONE WAS CLOSED. A later pass that finished the
// work says so in ITS entry and does not go back to amend the earlier one --
// the log is append-only by design. So an item from a week ago is a question
// to check, not a fact. docs/status.md says the same thing in prose.
//
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const log = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../docs/log.md'), 'utf8').split('\n');
const sinceAt = process.argv.indexOf('--since');
const since = sinceAt > -1 ? process.argv[sinceAt + 1] : null;

let date = '?', out = [];
for (const line of log) {
  const d = /^\*\*(2026-\d\d-\d\d)/.exec(line);
  if (d) date = d[1];
  if (/^\*\*(NOT DONE|STILL OPEN)/.test(line) && (!since || date >= since)) {
    out.push({ date, text: line.replace(/^\*\*/, '').replace(/\*\*/g, '').trim() });
  }
}
for (const o of out) console.log(`  ${o.date}  ${o.text.slice(0, 96)}`);
console.log(`\n  ${out.length} open item(s)${since ? ` since ${since}` : ''}, from docs/log.md`);
console.log('  An item older than the newest pass may have been closed since -- the log');
console.log('  is append-only and no entry goes back to amend another. Check before trusting.');
