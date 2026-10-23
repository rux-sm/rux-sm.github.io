#!/usr/bin/env node
// build-views.mjs -- writes LN Guide's pages from data/atlas/, one file each:
// index.html, Home, which asks what the reader is doing; do/<task>.html, a task as a
// Document with Guided, one step at a time, inside it; follow/<process>.html,
// a process as one Document of all its tasks; screens/<code>.html and ideas/<id>.html;
// an index for each of those three folders; and search.json, the one file
// search.html reads.
//
// docs/plans/ln-guide.md is what the pages are for. Everything on a page
// comes from the export under atlas's contract 17; nothing is placed or linked
// by hand here, so a correction is made in atlas and the next run redraws it.
// The one thing decided here is the Start here order, which the plan decided.
//
// THE BUILD SAYS WHAT IT COULD NOT PLACE and still builds: a task on no map
// tile, a decision with no screen to read its answer on, and a screen with no
// page are each listed at the end of the run.
//
//   node tools/build-views.mjs

import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shellAt } from './shell.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'atlas');
const MAP = 'order-to-shipment-overview';
const GAP = 'Not documented for this release.';

const read = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));
const files = readdirSync(DATA).filter((f) => f.endsWith('.json'));
const docs = files.map(read);
const tasks = docs.filter((j) => j.kind === 'task');
const taskById = new Map(tasks.map((t) => [t.id, t]));
// The Start here order: the concrete warehousing processes before the
// planning ones, and the AI commands last. A process the list does not name
// follows, in the order atlas derives from the handover chain.
const START = ['check-item-inventory', 'ship-from-stock', 'purchase-order-to-warehouse-receipt',
  'transfer-item-between-warehouses', 'create-basic-test-items-and-defaults',
  'manual-production-order-existing-master-data', 'run-order-planning-for-one-item',
  'demand-to-shipment-via-planning', 'set-up-a-genai-prompt', 'use-the-ai-commands'];
const rank = (s) => (START.indexOf(s.id) + 1) || 100 + s.order;
const processes = docs.filter((j) => j.kind === 'process').sort((a, b) => rank(a) - rank(b));
const processById = new Map(processes.map((s) => [s.id, s]));
const tasksOf = (s) => s.tasks.map((x) => taskById.get(x.id));
// A task no process names -- a side task of atlas's tasks map -- is drawn as
// if the task index were its process, with no strip and no next.
const loose = tasks.filter((t) => !t.process).sort((a, b) => a.title.localeCompare(b.title));
const looseOf = new Map(loose.map((t) => [t.id, { id: null, title: 'Tasks', tasks: [{ id: t.id, n: 0 }], before: [] }]));
const hrefUp = (s) => (s.id ? hrefProcess(s.id) : at('do/index.html'));
const { diagram } = read(MAP + '.json');
const screens = read('screens.json').entries;
const cards = new Map(screens.filter((e) => e.purpose).map((e) => [e.code, e]));
const noCard = screens.filter((e) => !e.purpose);
const concepts = files.includes('glossary.json') ? read('glossary.json').entries : [];
// Side tasks: things done beside the chain, each a tile in atlas's task map.
const allSide = files.includes('tasks.json') ? read('tasks.json').diagram.nodes : [];
const side = allSide.filter((n) => (n.steps ?? []).some((x) => x.text.trim() !== GAP));
const commit = /commit\s+([0-9a-f]{40})/.exec(readFileSync(join(DATA, 'PIN'), 'utf8'))?.[1];
if (!commit) throw new Error('data/atlas/PIN names no commit -- run sh tools/sync-export.sh');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// An account atlas ends without a full stop gets one, unless its last
// sentence is one the export wrote in place of a gap.
const sentence = (html) => cap(html).replace(/\.?(<\/strong>)?$/, (m, close) => (close ? '.' + close : '.'));
const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const report = [];

// ---- where a page is, and where it links ----------------------------------
// A page under do/, follow/, screens/ or ideas/ reaches the app's files and
// the other folders a level up. `base` is set while each page is drawn.
let base = '';
const at = (path) => base + path;
const hrefHome = () => base || './';
const hrefTask = (id, k) => at(`do/${id}.html`) + (k ? `#step-${k}` : '');
const hrefProcess = (id) => at(`follow/${id}.html`);
const hrefScreen = (code) => at(`screens/${code}.html`);
const hrefIdea = (id) => at(`ideas/${id}.html`);
const drawn = (prefix, fn) => { base = prefix; try { return fn(); } finally { base = ''; } };

// ---- verified status, in the reader's words --------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (d) => { const [y, m] = d.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
// Each status carries its tag colour and Carbon's progress icon for it.
const verified = (status, walked) => status === 'approved' && walked.every(Boolean) ? ['Verified', 'green', 'checkmark--filled']
  : walked.every(Boolean) ? [`Walked in LN, ${month(walked.sort().at(-1))}`, 'teal', 'checkmark--outline']
  : walked.some(Boolean) ? [`Walked ${walked.filter(Boolean).length} of ${walked.length}`, 'teal', 'incomplete'] : ['Not walked yet', 'outline', 'circle-dash'];
const COLOUR = { green: 'rux--tag--green', teal: 'rux--tag--teal', outline: 'rux--tag--outline', 'cool-gray': 'rux--tag--cool-gray' };
const tag = ([label, colour]) => `<div class="rux--tag rux--layout--size-sm ${COLOUR[colour]} rux--tag--sm"><span class="rux--tag__label">${esc(label)}</span></div>`;
// Home says a status quietly: the icon and the words in the line's own grey.
const quiet = ([label, , icon]) => `<span class="ln-status"><svg width="16" height="16" viewBox="${icon === 'checkmark--filled' ? '0 0 16 16' : '0 0 32 32'}" fill="currentColor" aria-hidden="true"><use href="#i-${icon}"/></svg>${esc(label.replace('Walked in LN, ', 'Walked '))}</span>`;
const statusOf = (s) => verified(s.status, s.tasks.map((t) => t.walked));
const taskStatus = (t) => verified(t.status, [t.walked]);

// ---- text ----------------------------------------------------------------
// Atlas sends prose as typed tokens. Four registers carry them: a control you
// press, a name on the screen, a string to type or match exactly, and a state.
// A type this file does not know stops the build, because a dropped token is a
// step with a hole in it and nothing on the page would say so.

const ARROW = ' ➔ ';
const route = (raw) => `<span class="ln-t-route">${raw.split(ARROW).map((x, i, all) =>
  (i ? '<span class="sep">➔</span>' : '') + `<span${i === all.length - 1 ? ' class="dest"' : ''}>${esc(x)}</span>`).join('')}</span>`;
const named = (v) => `<span class="ln-t-named">${esc(v)}</span>`;
const exact = (v) => `<span class="ln-t-exact">${esc(v)}</span>`;
const screenLink = (code, text) => cards.has(code) ? `<a class="rux--link" href="${hrefScreen(code)}">${text}</a>` : text;

// ATLAS NUMBERS FROM 0 AND THE READER COUNTS FROM 1. Atlas's own text points
// at steps by id, "see 2.6", and at tasks as "phase 2". While a task or a
// process is being drawn, each of those is rewritten to what the reader sees:
// a step by its place on the page, a step in another task with that task's
// title, and a phase by its task's title. Phase numbers written straight after
// a link to a process are that process's, on any page, and their tasks follow
// the process's name after a dot.
let ctx = null;        // { s: the process, now: the task being drawn, or null }
let linking = true;    // false while the text sits inside a link
const drawing = (s, now, fn) => { ctx = { s, now, ids: idsOf(s) }; try { return fn(); } finally { ctx = null; } };
const plainly = (fn) => { linking = false; try { return fn(); } finally { linking = true; } };
const rowsOf = (t) => t.blocks.filter((b) => b.kind === 'steps').flatMap((b) => b.rows);
const idsOf = (s) => new Map(tasksOf(s).flatMap((t) => rowsOf(t).map((r, k) => [r.id, [t, k + 1]])));
const taskOf = (s, n) => tasksOf(s).find((t) => t.process.n === n);
const refs = (html, to) => {
  if (!ctx && !to) return html;
  const s = to ?? ctx.s, ids = to ? idsOf(to) : ctx.ids;
  const link = (href, text) => (linking ? `<a class="rux--link" href="${href}">${text}</a>` : text);
  const where = (t) => (!to && t === ctx.now ? '' : `${esc(t.title)}, `);
  const stepAt = ([t, k]) => (!to && t === ctx.now ? `#step-${k}` : hrefTask(t.id, k));
  const after = to ? '· ' : '';
  return html
    .replace(/\b[Pp]hases (\d+(?:, \d+)+)\b/g, (m, list) => {
      const ts = list.split(', ').map((n) => taskOf(s, Number(n)));
      return to && ts.every(Boolean) ? after + ts.map((t) => link(hrefTask(t.id), esc(t.title))).join(', ') : m;
    })
    .replace(/(?:\bsteps? )?\b(\d+)\.(\d+)[–-](\d+)\.(\d+)\b/g, (m, a, b, c, d) => {
      const from = ids.get(`${a}.${b}`), upto = ids.get(`${c}.${d}`);
      return from && upto && from[0] === upto[0] ? link(stepAt(from), `${where(from[0])}steps ${from[1]}–${upto[1]}`) : m;
    })
    .replace(/(?:\bstep )?\b(\d+)\.(\d+)\b|\b([Pp])hase (\d+)\b/g, (m, a, b, cased, n) => {
      if (a != null) {
        const x = ids.get(`${a}.${b}`);
        return x ? link(stepAt(x), `${where(x[0])}step ${x[1]}`) : m;
      }
      const t = taskOf(s, Number(n));
      if (!t) return m;
      return !to && t === ctx.now ? 'this task' : after + link(hrefTask(t.id), esc(t.title));
    });
};

function token(t) {
  switch (t.t) {
    case 'text': return refs(esc(t.v));
    // A gap is a line of its own, never appended to an answer.
    case 'strong': return t.v.trim() === GAP ? `<span class="ln-gap">${esc(GAP)}</span>` : `<strong>${esc(t.v)}</strong>`;
    case 'em': return `<em>${esc(t.v)}</em>`;
    case 'chip': case 'field': return named(t.v);
    case 'value': case 'literal': return exact(t.v);
    case 'button': return `<span class="ln-t-press">${esc(t.label)}</span>`;
    case 'status': return `<span class="rux--tag rux--tag--teal rux--layout--size-sm"><span class="rux--tag__label">${esc(t.v)}</span></span>`;
    case 'command': case 'path': return route(t.route);
    // The link wraps the name alone: Carbon's link is a flex box, and a space
    // between two things inside one collapses. In a step's headline a screen
    // is its name alone where it has a page, because the page holds the code.
    case 'session': return t.name ? `${screenLink(t.code, named(t.name))}${t.bare && cards.has(t.code) ? '' : ` ${exact(t.code)}`}` : screenLink(t.code, exact(t.code));
    case 'dest': return named(t.v);
    case 'pencil': return '<svg class="ln-pencil" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" role="img" aria-label="worth noting down"><use href="#i-edit"/></svg>';
    // A link names another atlas document. A process or a task opens its
    // page; any other keeps its words and has nowhere to go yet.
    case 'link': {
      const id = /^(.+)\.md$/.exec(t.href)?.[1];
      return processById.has(id) ? `<a class="rux--link" href="${hrefProcess(id)}">${esc(t.v)}</a>`
        : taskById.has(id) ? `<a class="rux--link" href="${hrefTask(id)}">${esc(t.v)}</a>` : esc(t.v);
    }
    default: throw new Error(`no rendering for token type "${t.t}": ${JSON.stringify(t)}`);
  }
}
// Step numbers written straight after a link to another process are that
// process's, so they are counted and linked there.
// While a Document is drawn, "step 9 of [Model the dataset]" is numbered as
// the page numbers it, as docText does for a task's own text.
const tokens = (list) => {
  let html = '';
  for (let i = 0; i < list.length; i++) {
    const t = list[i], next = list[i + 1];
    const task = doc && t.t === 'text' && next?.t === 'link' ? taskById.get(/^(.+)\.md$/.exec(next.href)?.[1]) : null;
    const m = task ? /\b([Ss]teps?) (\d+)(?:([–-]| and )(\d+))? of\s*$/.exec(t.v) : null;
    if (m) { html += refs(esc(t.v.slice(0, m.index))) + stepRef(task, m[2], m[4], m[1], m[3]); i++; continue; }
    const other = t.t === 'text' && list[i - 1]?.t === 'link' && processById.get(/^(.+)\.md$/.exec(list[i - 1].href)?.[1]);
    html += other ? refs(esc(t.v), other) : token(t);
  }
  return html;
};
const plain = (list) => list.map((t) => t.v ?? t.label ?? t.route ?? t.name ?? t.code ?? '').join('');

// ---- a step's headline ---------------------------------------------------------
// A step is read at a glance, so its headline carries the action and nothing
// else. Three things atlas writes inline move out of it: a menu route, which
// goes on a quiet line of its own unless it is the task's; a screen's code,
// which is on the screen's page; and a second sentence, or what follows a
// dash or a semicolon, which goes underneath in ordinary type.
function headline(list, taskRoute) {
  const routes = [], out = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    if (t.t === 'session' && t.name) { out.push({ ...t, bare: true }); continue; }
    if (t.t !== 'command' && t.t !== 'path') { out.push(t); continue; }
    if (t.route !== taskRoute) routes.push(t.route);
    const dest = t.route.split(ARROW).at(-1), last = out.at(-1), before = out.at(-2);
    // A menu command that opens the step, or follows "In the header,", is the
    // thing to choose, so its last word does not stand alone as the headline.
    if (t.t === 'command' && (!last || (last.t === 'text' && /(^|,)\s*$/.test(last.v)))) out.push({ t: 'text', v: last ? 'choose ' : 'Choose ' });
    // "Open Name code at Route", "Open Name, Route": the route names the screen already said.
    if ((before?.name ?? before?.v) === dest && last?.t === 'text' && /^(at|,)$/.test(last.v.trim())) { out.pop(); continue; }
    // "Route (code)": the code names the route's last stop, so it becomes a screen.
    const [open, code, close] = list.slice(i + 1, i + 4);
    if (open?.t === 'text' && /^\s*\(\s*$/.test(open.v) && code?.t === 'session' && !code.name && close?.t === 'text' && /^\s*\)/.test(close.v)) {
      out.push({ t: 'session', code: code.code, name: dest, bare: true }, { ...close, v: close.v.replace(/^\s*\)/, '') });
      i += 3;
    } else out.push({ t: 'dest', v: dest });
  }
  // Where the action ends: a full stop before a new sentence, a dash, or a
  // semicolon.
  const cut = out.findIndex((t) => t.t === 'text' && /\. (?=[A-Z])| [—–] |; /.test(t.v));
  let head = out, note = [];
  if (cut >= 0) {
    const m = /\. (?=[A-Z])| [—–] |; /.exec(out[cut].v);
    head = [...out.slice(0, cut), { t: 'text', v: out[cut].v.slice(0, m.index) }];
    note = [{ t: 'text', v: cap(out[cut].v.slice(m.index + m[0].length)) }, ...out.slice(cut + 1)];
  }
  if (head[0]?.t === 'text') head[0] = { ...head[0], v: cap(head[0].v.trimStart()) };
  return { head: tokens(head), note: note.length ? tokens(note) : '', routes: [...new Set(routes)].map(route) };
}
const see = (r) => !r.cells[2] || r.cells[2].text.trim() === '—' ? '' : tokens(r.cells[2].tokens);
// What a guided step shows below its action: what you should see, then the
// figures to write down under a label of their own, as paper labels them.
function seeBox(r) {
  const cell = r.cells[2];
  if (!cell || cell.text.trim() === '—') return '';
  const at = cell.tokens.findIndex((t) => t.t === 'pencil');
  const lead = tokens(at < 0 ? cell.tokens : cell.tokens.slice(0, at)).replace(/\s*[—–-]\s*$/, '').trim();
  const notes = [];
  for (const t of at < 0 ? [] : cell.tokens.slice(at)) {
    if (t.t === 'pencil') notes.push([]);
    else notes.at(-1).push(t.t === 'value' || t.t === 'literal' ? { t: 'text', v: t.v } : t);
  }
  const written = notes.map((seg) => tokens(seg).replace(/^[\s,]+|[\s,]+$/g, '')).filter(Boolean);
  return `
    <div class="ln-step__see">${lead ? `<span class="ln-quiet">You should see</span><p>${lead}</p>` : ''}${written.length ? `<span class="ln-quiet ln-step__write">Write down</span><p>${written.join(', ')}</p>` : ''}</div>`;
}
// What atlas wrote around a task's steps, drawn on the guided step it belongs
// to: what comes before them on the first, what follows them on the last.
const guidedProse = (list) => list.filter((b) => b.kind === 'prose').map((b) => {
  const c = calloutOf(b.tokens);
  const html = c ? '' : tokens(b.tokens).trim();
  return c ? notice(c) : html ? `<p>${html}</p>` : '';
}).join('');

// ---- the map's decisions ---------------------------------------------------
// A process's path is its tasks in order, with the decisions the map puts
// between two of them. Atlas links a tile to the phases it opens; the tiles in
// between are found by following the map's own lines from one task's tile to
// the next, and a decision passed on the way is a fork on the path.

const node = new Map(diagram.nodes.map((n) => [n.id, n]));
const out = (id) => diagram.edges.filter((e) => e.from === id && e.kind !== 'feed');
const order = new Map(diagram.nodes.map((n, i) => [n.id, (n.n ?? 100) * 100 + i]));
const tilesOf = (s) => {
  const by = new Map();
  for (const n of diagram.nodes) for (const o of n.opens ?? []) if (o.walkthrough === s.id) for (const p of o.phases) (by.get(p) ?? by.set(p, []).get(p)).push(n.id);
  for (const ids of by.values()) ids.sort((a, b) => order.get(a) - order.get(b));
  return by;
};
function between(from, to, taken) {
  const queue = [[from]];
  const seen = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    for (const e of out(path.at(-1))) {
      if (e.to === to) return [...path, to];
      if (seen.has(e.to) || taken.has(e.to)) continue;
      seen.add(e.to);
      queue.push([...path, e.to]);
    }
  }
  return null;
}
function routeOf(s) {
  const tile = tilesOf(s);
  const taken = new Set([...tile.values()].flat());
  const after = new Map();   // task n -> the tiles the route passes straight after it
  let last = null;
  for (const t of s.tasks) for (const id of tile.get(t.n) ?? []) {
    if (last && last.id !== id) {
      const path = between(last.id, id, taken);
      if (path && path.length > 2) after.set(last.n, [...(after.get(last.n) ?? []), ...path.slice(1, -1)]);
    }
    last = { id, n: t.n };
  }
  return { tile, after };
}
const routes = new Map(processes.map((s) => [s.id, routeOf(s)]));
for (const s of processes) {
  const off = s.tasks.filter((t) => !routes.get(s.id).tile.has(t.n));
  if (off.length) report.push(`off the map ${s.title}: ${off.length} of ${s.tasks.length} tasks are on no map tile (${off.map((t) => t.n).join(', ')})`);
}

const decides = (n) => n.kind === 'decision' || n.kind === 'gate';
const branches = (id) => diagram.edges.filter((e) => e.from === id && e.kind === 'branch');
const firstScreen = (field) => field?.tokens.find((t) => t.t === 'session');
const sideUnder = (ids) => side.filter((n) => n.under?.map === MAP && ids.includes(n.under.node));
const opener = (label, field) => {
  const screen = firstScreen(field);
  return screen ? `<p>${label}: ${screenLink(screen.code, esc(screen.name ?? screen.code))}</p>` : '';
};
const sideBody = (n) => `<p>${sentence(tokens(n.does.tokens))}</p>
        <ol class="ln-side">${n.steps.map((x) => x.text.trim() === GAP
    ? `<li class="ln-side__note">${GAP}</li>` : `<li>${tokens(x.tokens)}</li>`).join('')}</ol>`;
// The decisions a task meets: a fork the route passes after it, which the
// process page draws; and every other check, which is a case on the task.
function extrasOf(s, t) {
  const r = routes.get(s.id);
  const tiles = r.tile.get(t.n) ?? [];
  const asked = [];
  const ask = (id) => {
    const n = node.get(id);
    if (!decides(n) || asked.includes(n)) return;
    asked.push(n);
    for (const e of diagram.edges) if (e.to === id && e.kind === 'feed') ask(e.from);
  };
  const passed = r.after.get(t.n) ?? [];
  for (const id of passed) ask(id);
  for (const id of tiles) for (const e of branches(id)) ask(e.to);
  const forks = asked.filter((n) => passed.includes(n.id) && branches(n.id).length);
  for (const n of forks) if (!firstScreen(n.read)) report.push(`no screen   ${s.title} · ${t.n}: "${n.session}" names no screen to read its answer on`);
  const cases = [
    ...asked.filter((n) => !forks.includes(n)).map((n) => ({ title: esc(n.session),
      body: `<p>${sentence(tokens(n.does.tokens))}</p>${opener('Read it on', n.read)}${opener('Set in', n.setting)}` })),
    ...sideUnder([...tiles, ...asked.map((n) => n.id)]).map((n) => ({ title: esc(n.session), body: sideBody(n) })),
    ...t.variants.rows.map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` })),
  ];
  return { forks, cases };
}

// ---- pieces every page shares ------------------------------------------------

const list = (items) => `<ul class="ln-list">${items.map((q) => `
  <li>${q.lead ? `<small class="ln-quiet">${q.lead}</small>` : ''}<b>${q.title}</b>${q.body}</li>`).join('')}
</ul>`;
const problems = (rows, lead) => rows.map((row) => ({ lead: lead?.(row), title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` }));
const accordion = (items) => `<ul class="rux--accordion rux--accordion--end rux--layout--size-md">${items.filter(Boolean).map(([id, title, body]) => `
  <li class="rux--accordion__item" id="${id}">
    <button type="button" class="rux--accordion__heading" aria-expanded="false">
      <svg class="rux--accordion__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--right"/></svg>
      <div class="rux--accordion__title">${title}</div>
    </button>
    <div class="rux--accordion__wrapper"><div class="rux--accordion__content ln-fold">${body}</div></div>
  </li>`).join('')}
</ul>`;
const copyChip = (v, label = v) => `<button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm ln-task__code" data-copy="${esc(v)}" aria-label="Copy ${esc(label)}">${esc(v)}</button>`;
const codeChip = (code) => copyChip(code, `the code ${code}`);
// A value whose exact text is a chip that copies it, as Guided shows it.
const valueOf = (cell) => cell.tokens.map((t) => t.t === 'literal' ? copyChip(t.v) : token(t)).join('');
const searchBox = (id) => `<form class="ln-find" action="${at('search.html')}" method="get" role="search">
  <div class="rux--search rux--layout--size-lg">
    <div class="rux--search-magnifier"><svg class="rux--search-magnifier-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-search"/></svg></div>
    <label class="rux--label" for="${id}">Search</label>
    <input id="${id}" class="rux--search-input" type="text" name="q" role="searchbox" placeholder="A task, a screen or a problem" autocomplete="off" data-search>
    <button type="button" class="rux--search-close rux--search-close--hidden" aria-label="Clear" data-clear>
      <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg>
    </button>
  </div>
</form>`;
// A page reads in all 16 columns.
const SPAN = { full: 'rux--lg:col-span-16' };
const column = (inner, span, cls, attrs) => `<div class="rux--css-grid-column rux--sm:col-span-4 rux--md:col-span-8 ${SPAN[span]}${cls ? ` ${cls}` : ''}"${attrs ? ` ${attrs}` : ''}>
<div class="rux--stack-vertical rux--stack-scale-6">
${inner}
</div>
</div>`;
const navItem = (href, label, current) => `<li class="rux--side-nav__item${current ? ' rux--side-nav__item--active' : ''}"><a class="rux--side-nav__link" href="${href}"${current ? ' aria-current="page"' : ''}><span class="rux--side-nav__link-text">${esc(label)}</span></a></li>`;
const nav = (active) => `<ul class="rux--side-nav__items">
      ${navItem(hrefHome(), 'Home', active === 'home')}${processes.map((s) => `
      ${navItem(hrefProcess(s.id), s.title, active === s.id)}`).join('')}
      ${navItem(at('screens/index.html'), 'Screens', active === 'screens')}
      ${navItem(at('ideas/index.html'), 'Ideas', active === 'ideas')}
    </ul>`;

const page = (title, active, body, head = '') => `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<script src="/funnel.js"></script>
<style>html:not([data-rux-unlocked]){visibility:hidden}</style>
<!-- GENERATED by tools/build-views.mjs. The next build overwrites this file,
     and a fix belongs in the generator or in atlas. -->
<link rel="icon" href="${at('brand/favicon.svg')}" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-Regular-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexMono-Regular-Latin1.woff2">
<link rel="stylesheet" href="/design/assets/fonts/plex.css">
<link rel="stylesheet" href="/design/css/rux.css">
<link rel="stylesheet" href="/design/css/rux-theme.css">
<link rel="stylesheet" href="/design/css/rux-overrides.css">
<link rel="stylesheet" href="${at('theme.css')}">
<link rel="stylesheet" href="${at('overrides.css')}">
<link rel="stylesheet" href="${at('app.css')}">
<link rel="stylesheet" href="${at('print.css')}" media="print">
<script src="/design/js/custom-themes.js"></script>
<script src="/design/js/theme.js"></script>${head}
</head>
<body>
<!-- SPRITE:BEGIN -->
<!-- SPRITE:END -->
${shellAt(base, nav(active))}
<main id="main-content" class="rux--content ln-pages" data-ln-commit="${commit}">
<div class="rux--css-grid">
${body}
</div>
</main>
<script src="/design/js/overlay.js"></script>
<script src="/design/js/form-controls.js"></script>
<script src="/design/js/ui-shell.js"></script>
<script src="/design/js/dismiss.js"></script>
<script src="/design/js/profile.js"></script>
<script src="/switcher.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>
<script src="/account.js"></script>
<script src="/design/js/accordion.js"></script>
<script src="${at('data.js')}"></script>
<script src="${at('app.js')}"></script>
</body>
</html>
`;

// ---- what nobody has confirmed -----------------------------------------------
// A task atlas has no walked date for says so, and the owner can answer on the
// spot, step by step in Guided: it matched, or it was different, with a line
// and a screenshot. The answer is evidence for atlas and changes nothing here.
// A row is keyed as atlas's sync reads it: the task's id and the step's.
let boxes = 0;
const confirmBox = (scenario) => `<div class="ln-confirm" data-confirm="${esc(scenario)}">
  <p class="ln-quiet" data-said>Nobody has confirmed this step in LN yet.</p>
  <div class="ln-confirm__ask" data-owner hidden>
    <button type="button" class="rux--btn rux--btn--tertiary rux--btn--sm rux--layout--size-sm" data-say="matched">It matched</button>
    <button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm" data-say="different">It was different</button>
  </div>
  <form class="ln-confirm__form" data-different hidden>
    <div class="rux--form-item rux--text-input-wrapper">
      <div class="rux--text-input__label-wrapper"><label class="rux--label" for="diff-${++boxes}">What was different?</label></div>
      <div class="rux--text-input__field-outer-wrapper"><div class="rux--text-input__field-wrapper">
        <input id="diff-${boxes}" class="rux--text-input rux--layout--size-md" type="text" name="note" autocomplete="off">
      </div></div>
    </div>
    <label class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm"><span data-file-name>Add a screenshot</span><input class="rux--visually-hidden" type="file" name="shot" accept="image/png,image/jpeg"></label>
    <button type="submit" class="rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm">Send</button>
  </form>
</div>`;
const waitingTasks = processes.flatMap((s) => tasksOf(s).filter((t) => !t.walked).map((t) => ({ s, t, scenario: t.id, steps: rowsOf(t).map((r) => r.id) })));
const waitingSide = loose.filter((t) => !t.walked).map((t) => ({ n: { id: t.id, session: t.title }, scenario: t.id, steps: rowsOf(t).map((r) => r.id) }));
const waiting = waitingTasks.length + waitingSide.length;
const waitingJson = () => `<script type="application/json" id="waiting">${JSON.stringify([...waitingTasks, ...waitingSide].map((w) => ({ scenario: w.scenario, steps: w.steps }))).replace(/</g, '\\u003c')}</script>`;
function confirmPage() {
  const body = `<div>
<h1 class="rux--type-productive-heading-05">Still to confirm</h1>
<p class="rux--type-body-long-01">Nobody has checked these in LN yet.<span data-owner hidden> Open one, walk it in LN, and say at each step whether it matched.</span></p>
</div>${processes.filter((s) => waitingTasks.some((w) => w.s === s)).map((s) => `
<div>
<h2 class="rux--type-productive-heading-03" id="${esc(s.id)}">${esc(s.title)}</h2>
</div>
<ul class="ln-list">${waitingTasks.filter((w) => w.s === s).map((w) => `
  <li data-wait="${esc(w.scenario)}" data-steps="${esc(w.steps.join(' '))}"><b><a class="rux--link" href="${hrefTask(w.t.id)}?walk=1"><span>${esc(w.t.title)}</span></a></b><p class="ln-quiet">${count(w.steps.length, 'step')} <span data-answered></span></p></li>`).join('')}
</ul>`).join('')}${waitingSide.length ? `
<div>
<h2 class="rux--type-productive-heading-03" id="other">Other tasks</h2>
</div>
<ul class="ln-list">${waitingSide.map((w) => `
  <li data-wait="${esc(w.scenario)}" data-steps="${esc(w.steps.join(' '))}"><b><a class="rux--link" href="${hrefTask(w.n.id)}?walk=1"><span>${esc(w.n.session)}</span></a></b><p class="ln-quiet">${count(w.steps.length, 'step')} <span data-answered></span></p></li>`).join('')}
</ul>` : ''}`;
  return page('Still to confirm \u2014 LN Guide', 'confirm', column(body, 'full'));
}

// ---- Home --------------------------------------------------------------------
const home = () => page('LN Guide', 'home', column(`<h1 class="ln-ask">What are you doing?</h1>
${searchBox('ask')}
<div class="ln-resume" data-resume hidden><a class="rux--tile rux--tile--clickable" href="${hrefHome()}"><span class="ln-quiet">Carry on</span><b></b></a><button type="button" class="rux--btn rux--layout--size-md rux--btn--ghost rux--btn--icon-only ln-resume__forget" aria-label="Forget where I stopped" data-forget><svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg></button></div>
<section class="ln-start">
<h2 class="rux--type-productive-heading-03">Start here</h2>
<div class="ln-cards">${processes.map((s) => `
<a class="rux--tile rux--tile--clickable" href="${hrefProcess(s.id)}"><b>${esc(s.title)}</b><span class="ln-quiet">${count(s.tasks.length, 'task')} · ${quiet(statusOf(s))}</span></a>`).join('')}
</div>
</section>${waiting ? `
<div class="ln-cards ln-cards--one" data-owner hidden><a class="rux--tile rux--tile--clickable" href="${at('confirm.html')}"><span class="ln-quiet">Still to confirm</span><b data-waiting="${waiting}">${count(waiting, 'task')} nobody has walked in LN yet</b></a></div>
${waitingJson()}` : ''}`, 'full'));

// ---- a process -----------------------------------------------------------------
// A reference section is what a reader looks up and does not walk: each
// numbered section of the walkthrough that holds a reference table, with its
// paragraphs. A table is drawn as a list, and one whose rows are text to type
// as that text with a Copy button.
const looked = (s) => {
  const groups = [];
  for (const x of s.sections) {
    if (!x.under) continue;
    if (groups.at(-1)?.title !== x.under) groups.push({ title: x.under, blocks: [] });
    groups.at(-1).blocks.push(x);
  }
  return groups.filter((g) => g.blocks.some((x) => x.kind === 'reference'));
};
const typed = (x) => x.rows.every((r) => r.cells.at(-1).tokens.length === 1 && r.cells.at(-1).tokens[0].t === 'literal');
function looking(x) {
  if (!typed(x)) return `<ul class="ln-list">${x.rows.map((r) => `
  <li><b>${tokens(r.cells[0].tokens)}</b>${r.cells.slice(1).map((c, i) => c.text.trim() ? `<p><span class="ln-quiet">${esc(x.columns[i + 1])}</span><br>${tokens(c.tokens)}</p>` : '').join('')}</li>`).join('')}
</ul>`;
  const texts = [];
  for (const r of x.rows) {
    const name = r.cells[0].text, line = r.cells.at(-1).tokens[0].v;
    if (texts.at(-1)?.name === name) texts.at(-1).lines.push(line); else texts.push({ name, lines: [line] });
  }
  return texts.map((t) => `<div class="ln-type">
  <p class="ln-type__name"><b>${esc(t.name)}</b><button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm" data-copy="${esc(t.lines.join('\n'))}">Copy</button></p>
  <div class="ln-type__text">${t.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
</div>`).join('');
}
// A callout arrives as "> ", its kind in bold, " > " and then the sentence.
const calloutOf = (l) => l[0]?.t === 'text' && l[0].v.trim() === '>' && l[1]?.t === 'strong' && l[2]?.t === 'text'
  ? { kind: l[1].v.trim(), rest: [{ t: 'text', v: l[2].v.replace(/^\s*>\s*/, '') }, ...l.slice(3)] }
  : null;
// In a reference the kind opens the paragraph.
const said = (l) => { const c = calloutOf(l); return c ? `<b>${esc(c.kind)}.</b> ${tokens(c.rest)}` : tokens(l); };
// Beside a task's steps it is Carbon's inline notification, a warning as a
// warning and any other kind as information.
const notice = (c, html = tokens(c.rest)) => {
  const [variant, icon] = c.kind === 'Warning' ? ['rux--inline-notification--warning', 'warning--filled'] : ['rux--inline-notification--info', 'information--filled'];
  return `<div class="rux--inline-notification ${variant} rux--inline-notification--low-contrast rux--inline-notification--hide-close-button" role="status">
  <div class="rux--inline-notification__details">
    <svg class="rux--inline-notification__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-${icon}"/></svg>
    <div class="rux--inline-notification__text-wrapper">
      <div class="rux--inline-notification__title">${esc(c.kind)}</div>
      <div class="rux--inline-notification__subtitle">${html}</div>
    </div>
  </div>
</div>`;
};
const section = (s, kind) => s.sections.find((x) => x.kind === kind)?.rows ?? [];

// A process is one Document: its tasks in the order they run, every task's
// steps inline, and the decisions the map puts between two tasks as rows of
// its Summary.
function processPage(s) {
  const ts = tasksOf(s);
  const steps = ts.reduce((n, t) => n + rowsOf(t).length, 0);
  const status = statusOf(s);
  const updated = lastChanged([s, ...ts]);
  const body = documenting(numberOf(s), true, () => {
    const K = doc.K;
    const summary = ts.flatMap((t) => [
      { cells: [`<b>${K.get(t.id)}</b>`, `<a class="rux--link" href="#task-${K.get(t.id)}">${esc(t.title)}</a>`, t.achieves ? docText(t.achieves.tokens, t) : '', `${rowsOf(t).length}`] },
      ...extrasOf(s, t).forks.map((n) => {
        const screen = firstScreen(n.read);
        const name = screen && cards.has(screen.code) ? `<a class="rux--link" href="${hrefScreen(screen.code)}">${esc(n.session)}</a>` : esc(n.session);
        return { quiet: true, cells: ['', `Decision: ${name}`, sentence(tokens(n.does.tokens)), ''] };
      })]);
    const values = valuesTable(s.values.rows);
    // A task's prerequisite that only names tasks of this process is the
    // process's own order, so only one that reaches outside it is listed.
    const inside = (b) => { const links = b.tokens.filter((x) => x.t === 'link'); return links.length && links.every((x) => K.has(/^(.+)\.md$/.exec(x.href)?.[1])); };
    const need = [...s.before.map((b) => docText(b.tokens, null, 'Before you start')),
      ...ts.flatMap((t) => (t.before ?? []).filter((b) => !inside(b)).map((b) => docText(b.tokens, t, 'Before you start')))];
    const procedure = ts.map((t) => {
      const k = K.get(t.id);
      const first = t.blocks.findIndex((b) => b.kind === 'steps');
      const proseHtml = (list) => list.filter((b) => b.kind === 'prose').map((b) => {
        const c = calloutOf(b.tokens);
        const html = docText(c ? c.rest : b.tokens, t, `Task ${k}`);
        return !html ? '' : c ? notice(c, html) : `<p>${html}</p>`;
      }).join('');
      const lead = t.why ? docText(t.why.tokens, t, `Task ${k}, why LN works this way`) : '';
      const ups = proseHtml(first < 0 ? t.blocks : t.blocks.slice(0, first));
      const stepsHtml = stepTable(t, k);
      const downs = first < 0 ? '' : proseHtml(t.blocks.slice(first));
      const wrong = wrongTable(s, t, k);
      return `<section class="ln-proc__task" id="task-${k}">
<h3 class="ln-proc__task-title"><span class="ln-proc__n">${k}</span><a class="rux--link" href="${hrefTask(t.id)}">${esc(t.title)}</a></h3>
<dl class="ln-proc__meta">${t.achieves ? `<div><dt>Result</dt><dd>${docText(t.achieves.tokens, t)}</dd></div>` : ''}${t.route ? `<div><dt>Screen</dt><dd>${route(t.route)}${t.sessionCode ? ` ${exact(t.sessionCode)}` : ''}</dd></div>` : ''}</dl>${lead ? `
<p class="ln-proc__lead"><strong>Why LN works this way.</strong> ${lead}</p>` : ''}
${ups}
${stepsHtml}
${downs}${wrong ? `
<p class="ln-proc__h4">If something goes wrong</p>
${wrong}` : ''}
</section>`;
    }).join('\n');
    const variants = [
      ...section(s, 'variants').map((r) => ({ cells: [docText(r.cells[0].tokens), docText(r.cells[1].tokens, null, `Variation: ${r.cells[0].text.trim()}`)] })),
      // A task's own variation names its task under the case, so no column stands mostly empty.
      ...ts.flatMap((t) => t.variants.rows.map((r) => ({ cells: [`${docText(r.cells[0].tokens, t)}<br><span class="ln-quiet">Task ${K.get(t.id)}</span>`, docText(r.cells[1].tokens, t, `Variation: ${r.cells[0].text.trim()}`)] })))];
    const next = section(s, 'downstream').map((r) => ({ cells: r.cells.map((c) => docText(c.tokens, null, 'What comes next')) }));
    const groups = looked(s);
    // The reference is read on screen, and print.css leaves it off paper.
    const reference = groups.length ? `<section class="ln-proc__ref">
${docH2('reference', 'Reference')}
${accordion(groups.map((g, i) => [`ref-${i + 1}`, esc(g.title), g.blocks.map((x) => x.kind === 'reference' ? looking(x) : x.text?.trim() ? `<p>${said(x.tokens)}</p>` : '').join('')]))}
</section>` : '';
    const html = `<div class="ln-proc__head">
<h1 class="rux--type-productive-heading-05">${esc(s.title)}</h1>
<p class="rux--type-body-long-01">${sentence(esc(s.summary ?? ''))}</p>
</div>
${docFacts([statusFact(status), ['Module', esc(s.modules.join(', '))], ['Length', `${count(ts.length, 'task')}, ${count(steps, 'step')}`], ['Updated', updated ? day(updated) : '—'], ['Applies to', 'Infor LN']])}${status[0] === 'Not walked yet' ? `
${unwalked(notice({ kind: 'Note' }, esc(NOT_WALKED)))}` : ''}
<p class="ln-go"><a class="rux--btn rux--btn--primary" href="${hrefTask(ts[0].id)}?walk=1">Start</a><button type="button" class="rux--btn rux--btn--secondary" data-print>Print</button></p>
<section>
${docH2('summary', 'Summary')}
${docTable([['Task', '4rem'], ['What you do'], ['Result'], ['Steps', '4.5rem']], summary, 'ln-proc__summary')}${values ? `
<p class="ln-proc__h4">Example values</p>
${values}` : ''}
</section>${need.length ? `
<section>
${docH2('before', 'Before you start')}
<ul class="ln-proc__list">${need.map((x) => `<li>${x}</li>`).join('')}</ul>
</section>` : ''}
<section>
${docH2('procedure', 'Procedure')}
${procedure}
</section>${variants.length ? `
<section>
${docH2('cases', 'Variations')}
${docTable([['Case', '30%'], ['What changes']], variants)}
</section>` : ''}${next.length ? `
<section class="ln-proc__next">
${docH2('next', 'What comes next')}
${docTable(next[0].cells.length === 3 ? [['When', '28%'], ['Then'], ['Start at', '24%']] : [['When', '34%'], ['Then']], next)}
</section>` : ''}
${reference}
${gapsSection()}
<section class="ln-proc__screens">
${docH2('screens', 'Screens used')}
${screensTable(ts)}
</section>`;
    return html;
  });
  return page(`${s.title} — LN Guide`, s.id, column(body, 'full'), updated ? paper(s.title, updated, s.tasks.map((x) => x.walked)) : '');
}

// ---- a task, as a document and as Guided ------------------------------------------
// The screens a task uses: its own, and every session its steps name.
const codesOf = (t) => {
  const codes = new Set(t.sessionCode ? [t.sessionCode] : []);
  (function walk(x) {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') { if (x.t === 'session') codes.add(x.code); Object.values(x).forEach(walk); }
  })(t.blocks);
  return codes;
};
const ideasOf = (t) => { const codes = codesOf(t); return concepts.filter((c) => c.sources.some((code) => codes.has(code))); };
// What must exist first: the steps of other tasks this one's steps point back at.
const needs = (s, t) => {
  const seen = new Map();
  for (const r of rowsOf(t)) for (const ref of r.refs ?? []) {
    const x = ctx.ids.get(ref);
    if (x && x[0] !== t && !seen.has(ref)) seen.set(ref, x);
  }
  return [...seen.values()].map(([other, k]) => `step ${k} of <a class="rux--link" href="${hrefTask(other.id, k)}">${esc(other.title)}</a>`);
};

// ---- the Document --------------------------------------------------------------
// A process, or one task, as a procedure to read, print and share. A title block
// of five facts, on screen only; the steps of each task in one table, numbered by task and
// place, 2.3, wherever the page points at them; Why before the steps and
// troubleshooting under them; a line to write each noted figure on; a gap
// listed once in Known gaps rather than inside an answer; and the screens used
// at the end. docs/plans/ln-guide-document.md decides each part.

const day = (d) => { const [y, m, dd] = d.split('-'); return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`; };
const isGap = (t) => t.t === 'strong' && t.v.trim() === GAP;
let doc = null;   // { K: task id -> its number, whole: a process's Document, here: the task drawn, gaps }
const documenting = (K, whole, fn) => { doc = { K, whole, here: null, gaps: [] }; try { return fn(); } finally { doc = null; } };
const numberOf = (s) => new Map(s.id ? tasksOf(s).map((t, i) => [t.id, i + 1]) : []);
// A step, by its task's number and its place: on a process's Document the
// row itself, on a task's the row or the other task's page.
function stepRef(t, a, b, word, sep = '–') {
  const j = doc.K.get(t.id);
  const n = (x) => (j ? `${j}.${x}` : x);
  const href = doc.whole && j ? `#step-${j}-${a}` : t === doc.here ? `#step-${a}` : hrefTask(t.id, a);
  const named = doc.whole || t === doc.here ? '' : ` (${esc(t.title)})`;
  return `<a class="rux--link" href="${href}">${word} ${n(a)}${b ? `${sep}${n(b)}` : ''}</a>${named}`;
}
const STEPS = /\b([Ss]teps?) (\d+)(?!\.\d|\d)(?:([–-]| and )(\d+)(?!\.\d|\d))?(?! of)/g;
// Atlas's words, with a gap taken out to Known gaps under `where` and every
// step it names numbered: "step 4 of [Confirm there is stock]" anywhere, and a
// bare "step 7" inside the task `here`.
function docText(list = [], here = null, where = '') {
  if (list.some(isGap)) { if (where) doc.gaps.push(where); list = list.filter((t) => !isGap(t)); }
  let html = '';
  for (let i = 0; i < list.length; i++) {
    const t = list[i], next = list[i + 1];
    const other = next?.t === 'link' ? taskById.get(/^(.+)\.md$/.exec(next.href)?.[1]) : null;
    const m = t.t === 'text' && other ? /\b([Ss]teps?) (\d+)(?:([–-]| and )(\d+))? of\s*$/.exec(t.v) : null;
    if (m) {
      html += (here ? esc(t.v.slice(0, m.index)).replace(STEPS, (x, w, a, sep, b) => stepRef(here, a, b, w, sep)) : refs(esc(t.v.slice(0, m.index))))
        + stepRef(other, m[2], m[4], m[1], m[3]);
      i++;
    } else html += t.t === 'text' && here ? esc(t.v).replace(STEPS, (x, w, a, sep, b) => stepRef(here, a, b, w, sep)) : token(t);
  }
  return html.trim();
}
// What you should see, with a line to write on for each figure the step
// marks as worth noting.
function seeing(cell, here, where) {
  if (!cell || cell.text.trim() === '—') return '';
  const at = cell.tokens.findIndex((t) => t.t === 'pencil');
  if (at < 0) return docText(cell.tokens, here, where);
  const lead = docText(cell.tokens.slice(0, at), here, where).replace(/\s*[—–-]\s*$/, '');
  const items = [];
  for (const t of cell.tokens.slice(at)) {
    if (t.t === 'pencil') items.push([]);
    else items.at(-1).push(t.t === 'value' || t.t === 'literal' ? { t: 'text', v: t.v } : t);
  }
  const lines = items.map((seg) => {
    const [label, ...note] = docText(seg, here, where).replace(/^[\s,]+|[\s,]+$/g, '').split(' — ');
    return `<span class="ln-proc__write"><span class="ln-proc__write-label">${label}</span><span class="ln-proc__write-line"></span></span>${note.length ? `<span class="ln-proc__write-note">${note.join(' — ')}</span>` : ''}`;
  }).join('');
  return `${lead ? `<span class="ln-proc__see">${lead}</span>` : ''}<span class="ln-proc__writes"><span class="ln-proc__writes-k">Write down</span>${lines}</span>`;
}
const docTable = (cols, rows, cls = '') => `<div class="rux--data-table-container ln-proc__table${cls ? ` ${cls}` : ''}">
<table class="rux--data-table rux--data-table--sm rux--data-table--static rux--data-table--top-aligned-body">
<thead><tr>${cols.map(([label, w]) => `<th scope="col"${w ? ` style="width:${w}"` : ''}><span class="rux--table-header-label">${esc(label)}</span></th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `
<tr${r.id ? ` id="${r.id}"` : ''}${r.quiet ? ' class="ln-proc__quiet"' : ''}>${r.cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}
</tbody>
</table></div>`;
const docH2 = (id, title) => `<h2 class="rux--type-productive-heading-04 ln-proc__h2" id="${id}">${esc(title)}</h2>`;
const docFacts = (facts) => `<dl class="ln-proc__facts">${facts.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const NOT_WALKED = 'Nobody has walked these steps in LN yet. Follow them as written, and expect a screen or a label to differ.';
// Not walked is said on screen and left off paper, where a printed copy is
// handed on as the procedure; ln-unwalked is what print.css hides.
const statusFact = (status) => ['Status', quiet(status), status[0] === 'Not walked yet' ? 'ln-unwalked' : ''];
const unwalked = (html) => `<div class="ln-unwalked">${html}</div>`;
// The footer each printed page carries: what it is, when its content last
// changed, and, once every task has been walked, when it was last walked in LN.
const paper = (title, updated, walked = []) => {
  const last = walked.length && walked.every(Boolean) ? ` · Walked in LN ${day([...walked].sort().at(-1))}` : '';
  return `\n<style>@page { @bottom-left { content: "${`${title} · LN Guide · Updated ${day(updated)}${last}`.replace(/[\\"]/g, '\\$&')}"; } }</style>`;
};
const lastChanged = (list) => list.map((x) => x.updated).filter(Boolean).sort().at(-1);

// One task's steps, every task in the same three columns: an example value the
// task was walked with sits under its action, as the guided step shows it.
function stepTable(t, k) {
  const ex = t.example?.rows ?? [];
  const rows = rowsOf(t).map((r) => {
    const n = k ? `${k}.${r.id}` : r.id;
    const where = `Step ${n}`;
    const value = (r.example ?? []).map((i) => ex[i]).filter(Boolean).map((e) => `<span class="ln-proc__value"><span class="ln-proc__value-k">Example</span>${docText(e.cells[0].tokens)} ${docText(e.cells[1].tokens)}</span>`).join('');
    const cells = [`<b>${n}</b>`, docText(r.cells[1].tokens, t, where) + value, seeing(r.cells[2], t, where)];
    return { id: doc.whole && k ? `step-${k}-${r.id}` : `step-${r.id}`, cells };
  });
  return docTable([['Step', '4rem'], ['Action'], ['You should see', '40%']], rows, 'ln-proc__steps');
}
// The problems of one task: its own, and the process's rows that name it.
function wrongTable(s, t, k) {
  const own = t.problems.rows.map((r) => [r.cells[0], r.cells[1]]);
  const theirs = s.id ? section(s, 'troubleshooting').filter((r) => taskOf(s, Number(r.cells[0].text)) === t).map((r) => [r.cells[1], r.cells[2]]) : [];
  const rows = [...own, ...theirs].map(([sym, fix]) => ({ cells: [docText(sym.tokens, t), docText(fix.tokens, t, `${k ? `Task ${k}, if` : 'If'} something goes wrong: ${sym.text.trim()}`)] }));
  return rows.length ? docTable([['Symptom', '36%'], ['What to do']], rows, 'ln-proc__wrong') : '';
}
// The task's notes atlas wrote above its steps: a callout is a notice.
const docProse = (t, k) => t.blocks.filter((b) => b.kind === 'prose').map((b) => {
  const c = calloutOf(b.tokens);
  return c ? notice(c, docText(c.rest, t, `Task ${k || ''}`.trim())) : `<p>${docText(b.tokens, t, `Task ${k || ''}`.trim())}</p>`;
}).join('');
// The values a process's run uses, or a task was walked with, each naming the step.
function valuesTable(rows, owner) {
  if (!rows.length) return '';
  const stepsOf = (r) => {
    const t = owner ?? taskById.get(r.task);
    if (!t) return '';
    const i = t.example.rows.findIndex((e) => e.cells[0].text === r.cells[0].text);
    return rowsOf(t).filter((row) => row.example?.includes(i)).map((row) => stepRef(t, row.id, null, 'Step').replace('>Step ', '>')).join(', ');
  };
  return docTable([['Field', '30%'], ['Value'], ['Step', '6rem']], rows.map((r) => ({ cells: [docText(r.cells[0].tokens), docText(r.cells[1].tokens), stepsOf(r)] })), 'ln-proc__values');
}
// The screens a Document opens, in the order it first opens them.
function screensTable(ts) {
  const codes = [...new Set(ts.flatMap((t) => [...codesOf(t)]))].filter((c) => cards.has(c));
  const how = (r) => r && r.includes(ARROW) && !/[();]/.test(r) ? route(r) : esc(cap(r ?? '—'));
  return docTable([['Screen', '34%'], ['Code', '9rem'], ['How to open it']], codes.map((c) => ({ cells: [screenLink(c, esc(cards.get(c).name)), exact(c), how(cards.get(c).route)] })));
}
const gapsSection = () => doc.gaps.length ? `<section class="ln-proc__gaps">
${docH2('gaps', 'Known gaps')}
<p>The library has no source for these yet, so this Document says nothing about them rather than guess.</p>
<ul class="ln-proc__list">${[...new Set(doc.gaps)].map((g) => `<li>${esc(g)}</li>`).join('')}</ul>
</section>` : '';

function task(s, t) {
  t = t.process ? t : { ...t, process: { n: 0, of: 1 } };
  for (const b of t.blocks) if (b.kind !== 'prose' && b.kind !== 'steps') throw new Error(`no rendering for a "${b.kind}" block in ${t.id}`);
  if (t.sessionCode && !cards.has(t.sessionCode)) report.push(`no page     ${s.title} · ${t.process.n}: ${t.session} (${t.sessionCode}) has no purpose line`);
  const rows = rowsOf(t);
  const { cases } = s.id ? extrasOf(s, t) : { cases: t.variants.rows.map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` })) };
  const first = t.process.n === s.tasks[0].n;
  // Prose keeps its place: what atlas wrote before the steps is drawn above
  // them, and what follows them below.
  const firstSteps = t.blocks.findIndex((b) => b.kind === 'steps');
  const screen = t.sessionCode ? cards.get(t.sessionCode) : null;
  const ideas = ideasOf(t);
  const strip = !s.id ? 'A task on its own, done beside the processes.' : `Task ${t.process.n + 1} of ${t.process.of} in <a class="rux--link" href="${hrefUp(s)}">${esc(s.title)}</a>${t.next ? ` · next: <a class="rux--link" href="${hrefTask(t.next.id)}">${esc(t.next.title)}</a>` : ''}`;
  const wrong = problems(t.problems.rows);
  const why = t.why ? `<p>${tokens(t.why.tokens)}</p>` : '';
  const stuck = (id, label) => wrong.length && [id, `${label} · ${wrong.length}`, list(wrong)];
  const related = ['related', 'Related', list([
    screen && { title: 'Screen', body: `<p>${screenLink(t.sessionCode, named(t.session))} ${exact(t.sessionCode)}<br><span class="ln-quiet">${esc(screen.purpose)}</span></p>` },
    ideas.length && { title: 'Ideas', body: `<p>${ideas.map((c) => `<a class="rux--link" href="${hrefIdea(c.id)}">${esc(c.name)}</a>`).join(' · ')}</p>` },
    t.next && { title: 'Next task', body: `<p><a class="rux--link" href="${hrefTask(t.next.id)}">${esc(t.next.title)}</a> in ${esc(s.title)}</p>` },
  ].filter(Boolean))];
  const lines = rows.map((r) => headline(r.cells[1].tokens, t.route));
  // The Document: this task alone, its steps numbered as its process numbers
  // them, so step 2.3 here is step 2.3 on the process's Document too.
  const k = s.id ? t.process.n + 1 : 0;
  const updated = lastChanged([t]) ?? lastChanged([s]);
  const full = documenting(numberOf(s), false, () => {
    doc.here = t;
    const need = t.before?.length ? t.before.map((b) => docText(b.tokens, t, 'Before you start'))
      : first ? s.before.map((b) => docText(b.tokens, null, 'Before you start')) : needs(s, t).map((x) => `You need ${x}.`);
    const above = (firstSteps < 0 ? t.blocks : t.blocks.slice(0, firstSteps));
    const below = firstSteps < 0 ? [] : t.blocks.slice(firstSteps);
    const proseHtml = (list) => list.filter((b) => b.kind === 'prose').map((b) => {
      const c = calloutOf(b.tokens);
      const html = docText(c ? c.rest : b.tokens, t, 'Steps');
      return !html ? '' : c ? notice(c, html) : `<p>${html}</p>`;
    }).join('');
    const values = valuesTable(t.example.rows, t);
    const wrongHtml = wrongTable(s, t, k);
    const caseRows = cases.map((c) => ({ cells: [c.title, c.body] }));
    const lead = t.why ? docText(t.why.tokens, t, 'Why LN works this way') : '';
    const stepsHtml = stepTable(t, k);
    const ups = proseHtml(above), downs = proseHtml(below);
    const body = `<div class="ln-proc__head">
<h1 class="rux--type-productive-heading-05">${esc(t.title)}</h1>${t.achieves ? `
<p class="rux--type-body-long-01">${sentence(docText(t.achieves.tokens, t))}</p>` : ''}
</div>
${docFacts([statusFact(taskStatus(t)), ['Module', esc(t.modules.join(', '))], ['Length', count(rows.length, 'step')], ['Updated', updated ? day(updated) : '—'], ['Applies to', 'Infor LN']])}
<p class="ln-strip">${strip}</p>${t.walked ? '' : `
${unwalked(notice({ kind: 'Note' }, `${esc(NOT_WALKED)}<span data-owner hidden> Walk it to say, at each step, whether it matched.</span>`))}`}
<p class="ln-go"><a class="rux--btn rux--btn--primary" href="?walk=1">Walk it</a><button type="button" class="rux--btn rux--btn--secondary" data-print>Print</button></p>${need.length ? `
<section>
${docH2('before', 'Before you start')}
<ul class="ln-proc__list">${need.map((x) => `<li>${x}</li>`).join('')}</ul>
</section>` : ''}${values ? `
<section>
${docH2('values', 'Values')}
${values}
</section>` : ''}
<section>
${docH2('steps', 'Steps')}${t.route ? `
<dl class="ln-proc__meta"><div><dt>Screen</dt><dd>${route(t.route)}${t.sessionCode ? ` ${exact(t.sessionCode)}` : ''}</dd></div></dl>` : ''}${lead ? `
<p class="ln-proc__lead"><strong>Why LN works this way.</strong> ${lead}</p>` : ''}
${ups}
${stepsHtml}
${downs}
</section>${wrongHtml ? `
<section>
${docH2('wrong', 'If something goes wrong')}
${wrongHtml}
</section>` : ''}${caseRows.length ? `
<section>
${docH2('cases', 'Variations')}
${docTable([['Case', '30%'], ['What changes']], caseRows)}
</section>` : ''}
${gapsSection()}
<section class="ln-proc__screens">
${docH2('screens', 'Screens used')}
${screensTable([t])}
</section>
<section class="ln-proc__related">
${docH2('related', 'Related')}
${related[2]}
</section>`;
    return body;
  });
  const guidedUps = guidedProse(firstSteps < 0 ? t.blocks : t.blocks.slice(0, firstSteps));
  const guidedDowns = firstSteps < 0 ? '' : guidedProse(t.blocks.slice(firstSteps));
  const guided = `<section class="ln-guided" data-task="${esc(t.id)}" data-title="${esc(t.title)}" data-process="${esc(s.title)}" data-process-href="${hrefUp(s)}"${t.next ? ` data-next-href="${hrefTask(t.next.id)}?walk=1"` : ''}>
<a class="rux--link ln-back" href="${hrefUp(s)}"><svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--left"/></svg>${esc(s.title)}</a>
<div class="rux--progress-bar rux--progress-bar--small">
  <div class="rux--progress-bar__label"><span class="rux--progress-bar__label-text">${esc(t.title)}</span></div>
  <div class="rux--progress-bar__track"><div class="rux--progress-bar__bar" data-bar></div></div>
  <div class="rux--progress-bar__helper-text" data-where></div>
</div>
<ol class="ln-steps">${rows.map((r, k) => `
  <li data-k="${k + 1}" data-ref="${esc(r.id)}" hidden>${k === 0 && guidedUps ? `
    <div class="ln-step__prose">${guidedUps}</div>` : ''}
    <div class="ln-step__main"><h1 class="ln-step__do">${lines[k].head}</h1>${lines[k].note ? `<p class="ln-step__note">${lines[k].note}</p>` : ''}${lines[k].routes.map((x) => `<p class="ln-step__route">${x}</p>`).join('')}${(r.example ?? []).map((i) => `<p class="ln-step__example"><span class="ln-quiet">Example</span> ${tokens(t.example.rows[i].cells[0].tokens)} ${valueOf(t.example.rows[i].cells[1])}</p>`).join('')}</div>${seeBox(r)}${k === rows.length - 1 && guidedDowns ? `
    <div class="ln-step__prose">${guidedDowns}</div>` : ''}
  </li>`).join('')}
</ol>${t.route ? `
<p class="ln-step__route">This task starts at ${route(t.route)} ${t.sessionCode ? exact(t.sessionCode) : ''}</p>` : ''}${t.walked ? '' : `
${confirmBox(t.id)}`}
${accordion([stuck('stuck', 'Stuck?'), why && ['why-guided', 'Why LN works this way', why]])}
<div class="ln-step__more"><a class="rux--link" href="?full">Document</a><a class="rux--link" href="#main-content" data-listen>Read it to me</a></div>
</section>
<div class="ln-nav">
  <a class="rux--btn rux--btn--secondary" href="${hrefUp(s)}" data-prev>Back</a>
  <a class="rux--btn rux--btn--primary" href="?walk=2" data-next>Next</a>
</div>`;
  return page(`${t.title} — LN Guide`, s.id, column(full, 'full', '', 'data-view="full"')
    + '\n' + column(guided, 'full', '', 'data-view="guided" hidden'), updated ? paper(t.title, updated, [t.walked]) : '');
}

// ---- the task index ---------------------------------------------------------------
const taskRow = (s, t) => `<li id="${esc(t.id)}"><b><a class="rux--link" href="${hrefTask(t.id)}"><span>${esc(t.title)}</span></a></b><p class="ln-quiet">${esc(s.title)} · ${count(rowsOf(t).length, 'step')}</p>${tag(taskStatus(t))}</li>`;
function taskIndex() {
  const groups = [];
  for (const s of processes) {
    const key = s.module ?? '';
    (groups.find((g) => g.title === key) ?? groups[groups.push({ title: key, rows: [] }) - 1]).rows.push(...tasksOf(s).map((t) => drawing(s, t, () => taskRow(s, t))));
  }
  // A side task with a file is a link to its page; one that only opens a
  // process's tasks shows them; one with no steps says so.
  const other = allSide.map((n) => taskById.has(n.id)
    ? `<li id="${esc(n.id)}"><b><a class="rux--link" href="${hrefTask(n.id)}"><span>${esc(n.session)}</span></a></b><p class="ln-quiet">${sentence(tokens(n.does.tokens))}</p>${tag(taskStatus(taskById.get(n.id)))}</li>`
    : side.includes(n)
      ? `<li id="${esc(n.id)}"><b>${esc(n.session)}</b>${accordion([[`side-${esc(n.id)}`, 'Steps', sideBody(n)]])}</li>`
      : `<li id="${esc(n.id)}"><b>${esc(n.session)}</b><p class="ln-quiet">Not documented yet.</p></li>`);
  const body = `<div>
<h1 class="rux--type-productive-heading-05">Tasks</h1>
<p class="rux--type-body-long-01">Every task the library knows, by module. One nobody has walked in LN yet says so.</p>
</div>${groups.map((g) => `
<div>
<h2 class="rux--type-productive-heading-03" id="${esc(g.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}">${esc(g.title)}</h2>
</div>
<ul class="ln-list">${g.rows.join('')}
</ul>`).join('')}${other.length ? `
<div>
<h2 class="rux--type-productive-heading-03" id="other">Other tasks</h2>
<p class="ln-quiet">Done beside the processes. One with no steps written yet says so.</p>
</div>
<ul class="ln-list">${other.join('')}
</ul>` : ''}`;
  return page('Tasks — LN Guide', 'tasks', column(body, 'full'));
}

// ---- screens and ideas ---------------------------------------------------------------
const usedIn = new Map();
for (const s of processes) for (const t of tasksOf(s)) for (const code of codesOf(t)) (usedIn.get(code) ?? usedIn.set(code, []).get(code)).push({ s, t });
const taskLinks = (uses) => uses.map(({ s, t }) => `<a class="rux--link" href="${hrefTask(t.id)}">${esc(s.title)} · ${esc(t.title)}</a>`).join('<br>');
const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
const isRoute = (r) => r.includes(ARROW.trim());
function screenPage(c) {
  const ideas = concepts.filter((x) => x.sources.includes(c.code));
  const body = `<div>
<p class="ln-quiet">Screen</p>
<h1 class="rux--type-productive-heading-05">${esc(c.name)}</h1>
<p class="rux--type-body-long-01">${esc(c.purpose)}</p>
</div>
<dl class="ln-card__facts">${fact('Code', codeChip(c.code))}${c.route ? fact(isRoute(c.route) ? 'Route' : 'Reached', isRoute(c.route) ? route(c.route) : esc(c.route)) : ''}${fact('Used in', taskLinks(usedIn.get(c.code) ?? []))}${fact('Ideas', ideas.map((x) => `<a class="rux--link" href="${hrefIdea(x.id)}">${esc(x.name)}</a>`).join('<br>'))}</dl>
<div class="ln-full" data-full="${esc(c.code)}" hidden></div>`;
  return page(`${c.name} — LN Guide`, 'screens', column(body, 'full'));
}
function ideaPage(c) {
  // A task reached through two of the idea's screens is listed once.
  const uses = [...new Map(c.sources.flatMap((code) => usedIn.get(code) ?? []).map((u) => [`${u.s.id} ${u.t.id}`, u])).values()];
  const body = `<div>
<p class="ln-quiet">Idea</p>
<h1 class="rux--type-productive-heading-05">${esc(c.name)}</h1>
<p class="rux--type-body-long-01">${esc(c.purpose)}</p>
</div>${c.explanation ? `
<p>${esc(c.explanation)}</p>` : ''}
<dl class="ln-card__facts">${fact('Also called', esc(c.terms.filter((x) => x !== c.name.toLowerCase()).join(', ')))}${fact('Screens', c.sources.map((code) => screenLink(code, esc(cards.get(code)?.name ?? code))).join('<br>'))}${fact('Where it matters', taskLinks(uses))}</dl>
<div class="ln-full" data-full="${esc(c.id)}" hidden></div>`;
  return page(`${c.name} — LN Guide`, 'ideas', column(body, 'full'));
}
// ---- the idea about how an order moves through LN -------------------------------
// Atlas's overview map is the one account of the whole chain, so it is the
// idea page that carries the grid: six lanes, six stages, every tile where
// the map puts it, and the map's own lines drawn by app.js. A tile opens its
// screen's page, or the first task that performs it. It is drawn here and
// nowhere else, and no menu entry leads to it.
const overview = read(MAP + '.json');
const firstTaskOf = (n) => n.opens?.map((o) => taskOf(processById.get(o.walkthrough) ?? { tasks: [] }, o.phases[0]))?.find(Boolean);
function tile(n) {
  const screen = n.code && cards.has(n.code), task = !screen && firstTaskOf(n);
  const inner = `${n.n != null ? `<span class="ln-map__n">${n.n}</span>` : ''}${esc(n.session)}`;
  const kind = decides(n) ? ' data-kind="decision"' : '';
  return screen ? `<a class="ln-map__tile" href="${hrefScreen(n.code)}" data-node="${esc(n.id)}"${kind}>${inner}</a>`
    : task ? `<a class="ln-map__tile" href="${hrefTask(task.id)}" data-node="${esc(n.id)}"${kind}>${inner}</a>`
      : `<span class="ln-map__tile" data-node="${esc(n.id)}"${kind}>${inner}</span>`;
}
const grid = () => `<div class="ln-map__scroll"><div class="ln-map" id="map">
  <div class="ln-map__head"></div>${diagram.stages.map((st) => `<div class="ln-map__head">${st.n} · ${esc(st.name)}</div>`).join('')}${diagram.lanes.map((lane) => `
  <div class="ln-map__lane">${esc(lane.name)}</div>${diagram.stages.map((st) => `<div class="ln-map__cell"${st.boundary ? ' data-boundary' : ''}>${diagram.nodes.filter((n) => n.lane === lane.name && n.stage === st.n).map(tile).join('')}</div>`).join('')}`).join('')}
</div></div>
<script type="application/json" id="edges">${JSON.stringify(diagram.edges.filter((e) => e.kind !== 'feed').map((e) => ({ from: e.from, to: e.to, kind: e.kind }))).replace(/</g, '\\u003c')}</script>`;
// A reference document's blocks: prose, a list, a table read down a phone
// with each row led by its first cell, and a heading.
const rblock = (b) => {
  switch (b.kind) {
    case 'prose': return `<p>${said(b.tokens)}</p>`;
    case 'list': return `<${b.ordered ? 'ol' : 'ul'} class="ln-full__list">${b.items.map((i) => `<li>${tokens(i.tokens)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
    case 'table': return `<div class="ln-full__rows">${b.rows.map((r) => `<div><b>${tokens(r.cells[0].tokens)}</b>${r.cells.slice(1).map((c, i) =>
      c.text.trim() && c.text.trim() !== '\u2014' ? `<p>${b.columns.length > 2 && b.columns[i + 1] ? `<span class="ln-quiet">${esc(b.columns[i + 1])}</span> ` : ''}${tokens(c.tokens)}</p>` : '').join('')}</div>`).join('')}</div>`;
    case 'heading': return `<h4 class="ln-ref__title">${esc(b.title)}</h4>`;
    default: throw new Error(`no rendering for a "${b.kind}" block in ${MAP}`);
  }
};
const overviewTitle = overview.title;
const overviewPurpose = overview.intro[0]?.text.split('. ')[0] ?? '';
function overviewPage() {
  const [first, ...rest] = overview.topics;
  const body = `<div>
<p class="ln-quiet">Idea</p>
<h1 class="rux--type-productive-heading-05">${esc(overviewTitle)}</h1>
</div>
<div class="ln-full">${overview.intro.map(rblock).join('')}</div>
${grid()}
<div>
<h2 class="rux--type-productive-heading-03" id="branch">${esc(first.title)}</h2>
</div>
<div class="ln-full">${first.blocks.map(rblock).join('')}</div>
${accordion(rest.map((t) => [`topic-${t.n}`, esc(t.title), `<div class="ln-full">${t.blocks.map(rblock).join('')}</div>`]))}`;
  return page(`${overviewTitle} \u2014 LN Guide`, 'ideas', column(body, 'full'));
}

const indexPage = (title, intro, active, rows) => page(`${title} — LN Guide`, active, column(`<div>
<h1 class="rux--type-productive-heading-05">${title}</h1>
<p class="rux--type-body-long-01">${intro}</p>
</div>
<ul class="ln-list">${rows.join('')}
</ul>`, 'full'));
const byName = (a, b) => a.name.localeCompare(b.name);
const screenIndex = () => indexPage('Screens', 'Every LN screen the tasks open, by name. One the library has not described yet says so.', 'screens', [
  ...[...cards.values()].sort(byName).map((c) => `<li><b><a class="rux--link" href="${hrefScreen(c.code)}"><span>${esc(c.name)}</span></a></b><p>${exact(c.code)} <span class="ln-quiet">${esc(c.purpose)}</span></p></li>`),
  ...noCard.sort(byName).map((c) => `<li><b>${esc(c.name)}</b><p>${exact(c.code)} <span class="ln-quiet">Not documented yet.</span></p></li>`)]);
const ideaIndex = () => indexPage('Ideas', 'What a word means in LN, and why LN works that way.', 'ideas', [
  `<li><b><a class="rux--link" href="${hrefIdea(MAP)}"><span>${esc(overviewTitle)}</span></a></b><p class="ln-quiet">${esc(overviewPurpose)}. How an order moves through LN, on one grid.</p></li>`,
  ...[...concepts].sort(byName).map((c) => `<li><b><a class="rux--link" href="${hrefIdea(c.id)}"><span>${esc(c.name)}</span></a></b><p class="ln-quiet">${esc(c.purpose)}</p></li>`)]);

// ---- search: one file, read by search.html ------------------------------------------
// A problem is found by its symptom, a task by its title and the words of its
// steps, a screen by its name, code, route and purpose, an idea by its terms.
// `n` is what names the page: a query every word of which is in it puts the
// page first. A problem is a row, not a page, so nothing names it.
const fold = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const hit = (kind, name, text, href, title, rest) => ({ k: kind, n: fold(name), x: fold(text), h: href, t: title, r: rest });
const searchIndex = () => [
  ...processes.flatMap((s) => tasksOf(s).flatMap((t) => drawing(s, t, () => [
    hit('Task', t.title, `${s.title} ${t.title} ${t.session ?? ''} ${t.sessionCode ?? ''} ${rowsOf(t).map((r) => r.cells.map((c) => c.text).join(' ')).join(' ')}`,
      hrefTask(t.id), esc(t.title), esc(s.title)),
    ...t.problems.rows.map((row) => hit('Problem', '', `${row.cells[0].text} ${row.cells[1].text}`, hrefTask(t.id), plainly(() => tokens(row.cells[0].tokens)), `<p>${tokens(row.cells[1].tokens)}</p>`)),
  ]))),
  ...processes.map((s) => hit('Process', s.title, `${s.title} ${s.summary ?? ''} ${s.modules.join(' ')}`, hrefProcess(s.id), esc(s.title), sentence(esc(s.summary ?? '')))),
  ...loose.map((t) => hit('Task', t.title, `${t.title} ${t.sessionCode ?? ''} ${t.achieves?.text ?? ''} ${rowsOf(t).map((r) => r.cells.map((c) => c.text).join(' ')).join(' ')}`, hrefTask(t.id), esc(t.title), 'A task on its own')),
  ...side.filter((n) => !taskById.has(n.id)).map((n) => hit('Task', n.session, `${n.session} ${n.code ?? ''} ${n.does.text} ${n.steps.map((x) => x.text).join(' ')}`, `${at('do/index.html')}#${n.id}`, esc(n.session), sentence(tokens(n.does.tokens)))),
  ...[...cards.values()].map((c) => hit('Screen', `${c.name} ${c.code}`, `${c.name} ${c.code} ${c.route ?? ''} ${c.purpose}`, hrefScreen(c.code), esc(c.name), esc(c.purpose))),
  ...concepts.map((c) => hit('Idea', `${c.name} ${c.terms.join(' ')}`, `${c.name} ${c.terms.join(' ')} ${c.purpose}`, hrefIdea(c.id), esc(c.name), esc(c.purpose))),
  hit('Idea', overviewTitle, `${overviewTitle} ${overview.intro.map((b) => b.text).join(' ')} ${diagram.nodes.map((n) => n.session).join(' ')}`, hrefIdea(MAP), esc(overviewTitle), esc(overviewPurpose) + '.'),
];
const searchPage = () => page('Search — LN Guide', 'search', column(`<h1 class="rux--type-productive-heading-05">Search</h1>
${searchBox('find')}
<h2 class="rux--type-productive-heading-03" data-count hidden></h2>
<div class="ln-results" id="results"></div>`, 'full'));

// ---- write every page ----------------------------------------------------------
const written = [];
const write = (path, text) => { const file = join(ROOT, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); written.push(file); };
for (const dir of ['do', 'follow', 'screens', 'ideas']) rmSync(join(ROOT, dir), { recursive: true, force: true });

write('index.html', home());
write('search.html', searchPage());
write('confirm.html', confirmPage());
writeFileSync(join(ROOT, 'search.json'), JSON.stringify(searchIndex()) + '\n');
drawn('../', () => {
  write('do/index.html', taskIndex());
  for (const s of processes) {
    write(`follow/${s.id}.html`, drawing(s, null, () => processPage(s)));
    for (const t of tasksOf(s)) write(`do/${t.id}.html`, drawing(s, t, () => task(s, t)));
  }
  for (const t of loose) write(`do/${t.id}.html`, drawing(looseOf.get(t.id), t, () => task(looseOf.get(t.id), t)));
  write('screens/index.html', screenIndex());
  for (const c of cards.values()) write(`screens/${c.code}.html`, screenPage(c));
  write('ideas/index.html', ideaIndex());
  write(`ideas/${MAP}.html`, overviewPage());
  for (const c of concepts) write(`ideas/${c.id}.html`, ideaPage(c));
});
execFileSync(process.execPath, [join(ROOT, '..', 'tools', 'inline-sprite.mjs'), ...written], { stdio: 'ignore' });

const steps = tasks.reduce((n, t) => n + rowsOf(t).length, 0);
if (allSide.length > side.length) report.push(`no steps    ${allSide.length - side.length} of ${allSide.length} side tasks have no written step, so they are rows and not pages`);
if (noCard.length) report.push(`no page     ${noCard.length} of ${screens.length} screens have no purpose line, so they have no page`);
console.log(`  built the pages: ${processes.length} processes, ${tasks.length} tasks, ${steps} steps, ${cards.size} screens, ${concepts.length} ideas, ${written.length} files`);
console.log(`\n  what the export does not yet say (${new Set(report).size}):`);
for (const line of new Set(report)) console.log(`    ${line}`);
