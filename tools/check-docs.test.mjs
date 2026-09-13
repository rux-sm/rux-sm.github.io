#!/usr/bin/env node
// check-docs.test.mjs -- fires every rule in check-docs.mjs against fixtures,
// and proves a clean fixture stays clean. A check that passes the cleaned
// repository alone has not shown it catches anything.

import { checkDocs } from './check-docs.mjs';

const plan = (tasks = '- [ ] Build `tools/new-tool.mjs`.', drop = '') =>
  ['---\ntype: plan\n---\n\n# Plan\n', '## Goal\n\nA goal.\n', '## Decisions\n\n- One.\n', '## Questions\n\nNone.\n', `## Tasks\n\n${tasks}\n`]
    .filter(part => !drop || !part.startsWith(`## ${drop}`)).join('\n');

const base = () => ({
  'README.md': '# Site\n\n`AGENTS.md` is the policy. `docs/status.md` and `docs/plans/`. The app is `app/`, served at `/`.\n',
  'AGENTS.md': '# Rules\n\n`CLAUDE.md` imports this.\n',
  'CLAUDE.md': '@AGENTS.md\n',
  'docs/status.md': '# Status\n\n- A short item\n  on two lines.\n',
  'docs/plans/build.md': plan(),
  'app/README.md': '# App\n\nSteps are in `docs/steps.md`, and the code is `app.js`.\n',
  'app/docs/steps.md': '---\ntype: how-to\n---\n\n# Steps\n\nRun `app/app.js`. See [the readme](../README.md).\n'
    + 'A block id is `app/page/block`, and the old app is `../other/page.html`.\n'
    + 'A phrase like "corrected on" is quoted, so it stays quiet.\n',
});

const sibling = rel => (rel.startsWith('../other/') ? rel === '../other/page.html' : 'unknown');
const run = (files, { atlas = [], ages = null, outside = sibling } = {}) => {
  const docs = new Map(Object.entries(files));
  return checkDocs({ docs, tracked: [...docs.keys(), 'app/app.js'], atlas, ages, outside });
};
const codes = list => [...new Set(list.map(x => x.code))].sort().join(',');
const steps = extra => ({ ...base(), 'app/docs/steps.md': base()['app/docs/steps.md'] + extra });

const cases = [
  ['a clean repository: a planned file, the root, an id, a sibling path, a quoted phrase', base(), {}, '', '', ''],
  ['a document with no kind', { ...base(), 'app/docs/steps.md': '# Steps\n' }, {}, 'kind', '', ''],
  ['a document with an unknown kind', { ...base(), 'app/docs/steps.md': '---\ntype: notes\n---\n\n# Steps\n' }, {}, 'kind', '', ''],
  ['a plan outside the plans folder', { ...base(), 'app/docs/steps.md': plan() }, {}, 'plan-place', '', ''],
  ['a non-plan inside the plans folder', { ...base(), 'docs/plans/build.md': '---\ntype: how-to\n---\n\n# Steps\n' }, {}, 'plan-place', '', ''],
  ['a document nothing links to', { ...base(), 'app/docs/lost.md': '---\ntype: reference\n---\n\n# Lost\n' }, {}, 'orphan', '', ''],
  ['a named file that does not exist', steps('Also `app/gone.js`.\n'), {}, 'missing', '', ''],
  ['a missing name with atlas absent', steps('Also `app/gone.js`.\n'), { atlas: null }, '', '', 'unchecked'],
  ['a name atlas holds', steps('The contract is `standards/guide-json.md`.\n'), { atlas: ['standards/guide-json.md'] }, '', '', ''],
  ['a sibling repository that is present but lacks the file', steps('Also `../other/gone.html`.\n'), {}, 'missing', '', ''],
  ['a sibling repository that is absent', steps('Also `../away/page.html`.\n'), {}, '', '', 'unchecked'],
  ['a README over the limit', { ...base(), 'README.md': base()['README.md'] + '\n'.repeat(150) + 'end\n' }, {}, 'length', '', ''],
  ['a long document', steps('\n'.repeat(300) + 'end\n'), {}, '', 'length', ''],
  ['a status item over three lines', { ...base(), 'docs/status.md': '# Status\n\n- one\n  two\n  three\n  four\n' }, {}, 'status', '', ''],
  ['a plan missing a part', { ...base(), 'docs/plans/build.md': plan(undefined, 'Questions') }, {}, 'plan-shape', '', ''],
  ['a plan with a ticked box', { ...base(), 'docs/plans/build.md': plan('- [x] Done.\n- [ ] Left.') }, {}, 'plan-done', '', ''],
  ['a plan with no tasks left', { ...base(), 'docs/plans/build.md': plan('Nothing.') }, {}, 'plan-done', '', ''],
  ['a plan left alone', base(), { ages: new Map([['docs/plans/build.md', 31]]) }, '', 'plan-stale', ''],
  ['a history phrase', steps('Corrected on 2026-09-01 after a pass.\n'), {}, '', 'history', ''],
];

let bad = 0;
const fired = new Set();
for (const [name, files, opts, wantFail, wantWarn, wantNote] of cases) {
  const { fails, warns, notes } = run(files, opts);
  const got = [codes(fails), codes(warns), codes(notes)];
  [...fails, ...warns, ...notes].forEach(x => fired.add(x.code));
  if (got.join('|') !== [wantFail, wantWarn, wantNote].join('|')) {
    bad++;
    console.log(`  FAIL  ${name}: expected fail=[${wantFail}] warn=[${wantWarn}] note=[${wantNote}], got fail=[${got[0]}] warn=[${got[1]}] note=[${got[2]}]`);
    for (const x of [...fails, ...warns]) console.log(`          ${x.code} ${x.path} ${x.msg}`);
  }
}
const rules = ['kind', 'plan-place', 'orphan', 'missing', 'unchecked', 'length', 'status', 'plan-shape', 'plan-done', 'plan-stale', 'history'];
const silent = rules.filter(r => !fired.has(r));
if (silent.length) { bad++; console.log(`  FAIL  never fired: ${silent.join(', ')}`); }
console.log(`  ${bad ? 'FAIL' : ' ok '}  fixtures  ${cases.length} cases, ${rules.length - silent.length} of ${rules.length} rules fired${bad ? '' : ', the clean case stayed clean'}`);
process.exit(bad ? 1 : 0);
