#!/usr/bin/env node
// build-views.mjs -- writes LN Guide's pages from data/atlas/, one file each:
// home.html, which asks what the reader is doing; do/<task>.html, a task as a
// document with Guided, one step at a time, inside it; follow/<process>.html,
// a process as the path of its tasks; screens/<code>.html and ideas/<id>.html;
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
const hrefTask = (id, k) => at(`do/${id}.html`) + (k ? `#step-${k}` : '');
const hrefProcess = (id) => at(`follow/${id}.html`);
const hrefScreen = (code) => at(`screens/${code}.html`);
const hrefIdea = (id) => at(`ideas/${id}.html`);
const drawn = (prefix, fn) => { base = prefix; try { return fn(); } finally { base = ''; } };

// ---- verified status, in the reader's words --------------------------------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (d) => { const [y, m] = d.split('-'); return `${MONTHS[Number(m) - 1]} ${y}`; };
const verified = (status, walked) => status === 'approved' && walked.every(Boolean) ? ['Verified', 'green']
  : walked.some(Boolean) ? [`Walked in LN, ${month(walked.filter(Boolean).sort().at(-1))}`, 'teal'] : ['Not walked yet', 'outline'];
const COLOUR = { green: 'rux--tag--green', teal: 'rux--tag--teal', outline: 'rux--tag--outline', 'cool-gray': 'rux--tag--cool-gray' };
const tag = ([label, colour]) => `<div class="rux--tag rux--layout--size-sm ${COLOUR[colour]} rux--tag--sm"><span class="rux--tag__label">${esc(label)}</span></div>`;
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
// title, and a phase by its task's title.
let ctx = null;        // { s: the process, now: the task being drawn, or null }
let linking = true;    // false while the text sits inside a link
const drawing = (s, now, fn) => { ctx = { s, now, ids: idsOf(s) }; try { return fn(); } finally { ctx = null; } };
const plainly = (fn) => { linking = false; try { return fn(); } finally { linking = true; } };
const rowsOf = (t) => t.blocks.filter((b) => b.kind === 'steps').flatMap((b) => b.rows);
const idsOf = (s) => new Map(tasksOf(s).flatMap((t) => rowsOf(t).map((r, k) => [r.id, [t, k + 1]])));
const taskOf = (s, n) => tasksOf(s).find((t) => t.process.n === n);
const refs = (html, to) => {
  if (!ctx) return html;
  const s = to ?? ctx.s, ids = to ? idsOf(to) : ctx.ids;
  const link = (href, text) => (linking ? `<a class="rux--link" href="${href}">${text}</a>` : text);
  const where = (t) => (!to && t === ctx.now ? '' : `${esc(t.title)}, `);
  const stepAt = ([t, k]) => (!to && t === ctx.now ? `#step-${k}` : hrefTask(t.id, k));
  return html
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
      return !to && t === ctx.now ? 'this task' : link(hrefTask(t.id), esc(t.title));
    });
};

function token(t) {
  switch (t.t) {
    case 'text': return refs(esc(t.v));
    case 'strong': return `<strong>${esc(t.v)}</strong>`;
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
    // A link names another atlas document. A process opens its page; any
    // other keeps its words and has nowhere to go yet.
    case 'link': {
      const id = /^(.+)\.md$/.exec(t.href)?.[1];
      return processById.has(id) ? `<a class="rux--link" href="${hrefProcess(id)}">${esc(t.v)}</a>` : esc(t.v);
    }
    default: throw new Error(`no rendering for token type "${t.t}": ${JSON.stringify(t)}`);
  }
}
// Step numbers written straight after a link to another process are that
// process's, so they are counted and linked there.
const tokens = (list) => list.map((t, i) => {
  const other = t.t === 'text' && list[i - 1]?.t === 'link' && processById.get(/^(.+)\.md$/.exec(list[i - 1].href)?.[1]);
  return other ? refs(esc(t.v), other) : token(t);
}).join('');
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
const onThisPage = (entries) => `<div class="rux--contained-list rux--layout--size-lg rux--contained-list--on-page">
  <div class="rux--contained-list__header"><h2 class="rux--contained-list__label">On this page</h2></div>
  <ul role="list">${entries.map(([h, l]) => `<li class="rux--contained-list-item"><div class="rux--contained-list-item__content"><a class="rux--link" href="${h}">${esc(l)}</a></div></li>`).join('')}</ul>
</div>`;
const breadcrumb = (trail) => `<nav aria-label="Breadcrumb"><ol class="rux--breadcrumb rux--breadcrumb--no-trailing-slash">${trail.slice(0, -1).map(([h, t]) =>
  `<li class="rux--breadcrumb-item"><a class="rux--link" href="${h}">${esc(t)}</a></li>`).join('')}<li class="rux--breadcrumb-item rux--breadcrumb-item--current"><a class="rux--link" href="#main-content" aria-current="page">${esc(trail.at(-1)[1])}</a></li></ol></nav>`;
const codeChip = (code) => `<button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm ln-task__code" data-copy="${esc(code)}" aria-label="Copy the code ${esc(code)}">${esc(code)}</button>`;
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
const SPAN = { 4: 'rux--lg:col-span-4', 10: 'rux--lg:col-span-10', 12: 'rux--lg:col-span-12' };
const column = (inner, span, cls, attrs) => `<div class="rux--css-grid-column rux--sm:col-span-4 rux--md:col-span-8 ${SPAN[span]}${cls ? ` ${cls}` : ''}"${attrs ? ` ${attrs}` : ''}>
<div class="rux--stack-vertical rux--stack-scale-6">
${inner}
</div>
</div>`;
const navItem = (href, label, current) => `<li class="rux--side-nav__item${current ? ' rux--side-nav__item--active' : ''}"><a class="rux--side-nav__link" href="${href}"${current ? ' aria-current="page"' : ''}><span class="rux--side-nav__link-text">${esc(label)}</span></a></li>`;
const nav = (active) => `<ul class="rux--side-nav__items">
      ${navItem(at('home.html'), 'Home', active === 'home')}${processes.map((s) => `
      ${navItem(hrefProcess(s.id), s.title, active === s.id)}`).join('')}
      ${navItem(at('screens/index.html'), 'Screens', active === 'screens')}
      ${navItem(at('ideas/index.html'), 'Ideas', active === 'ideas')}
    </ul>`;

const page = (title, active, body) => `<!doctype html>
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
<script src="/design/js/custom-themes.js"></script>
<script src="/design/js/theme.js"></script>
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
<script src="${at('app.js')}"></script>
</body>
</html>
`;

// ---- Home --------------------------------------------------------------------
const waiting = tasks.filter((t) => !t.walked).length;
const home = () => page('LN Guide', 'home', column(`<h1 class="ln-ask">What are you doing?</h1>
${searchBox('ask')}
<div class="ln-cards ln-cards--one"><a class="rux--tile rux--tile--clickable ln-resume" href="${at('home.html')}" data-resume hidden><span class="ln-quiet">Carry on</span><b></b></a></div>
<div>
<h2 class="rux--type-productive-heading-03">Start here</h2>
<p class="ln-quiet">The processes in the order they build on each other. Each one is a path of tasks.</p>
</div>
<div class="ln-cards">${processes.map((s) => `
<a class="rux--tile rux--tile--clickable" href="${hrefProcess(s.id)}"><b>${esc(s.title)}</b><span class="ln-quiet">${count(s.tasks.length, 'task')}</span><div>${tag(statusOf(s))}</div></a>`).join('')}
</div>${waiting ? `
<div class="ln-cards ln-cards--one"><a class="rux--tile rux--tile--clickable" href="${at('do/index.html')}"><span class="ln-quiet">Still to confirm</span><b>${count(waiting, 'task')} nobody has walked in LN yet</b></a></div>` : ''}`, 12));

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
// Here the kind opens the paragraph.
const said = (l) => l[0]?.t === 'text' && l[0].v.trim() === '>' && l[1]?.t === 'strong' && l[2]?.t === 'text'
  ? `<b>${esc(l[1].v)}.</b> ${tokens([{ t: 'text', v: l[2].v.replace(/^\s*>\s*/, '') }, ...l.slice(3)])}`
  : tokens(l);
const referenceOf = (s) => looked(s).map((g) => `<h3 class="ln-ref__title">${esc(g.title)}</h3>${g.blocks.map((x) => x.kind === 'reference' ? looking(x) : x.text?.trim() ? `
<p>${said(x.tokens)}</p>` : '').join('')}`).join('');
const section = (s, kind) => s.sections.find((x) => x.kind === kind)?.rows ?? [];
const before = (lines) => lines.length ? `<p><strong>Before you start.</strong> ${lines.map((b) => tokens(b.tokens)).join(' ')}</p>` : '';

function processPage(s) {
  const ts = tasksOf(s);
  const steps = ts.reduce((n, t) => n + rowsOf(t).length, 0);
  const stops = ts.map((t) => `
  <li><a class="ln-path__stop" href="${hrefTask(t.id)}"><span class="ln-path__dot">${t.process.n + 1}</span><b>${esc(t.title)}</b><small>${t.achieves ? tokens(t.achieves.tokens) + ' · ' : ''}${count(rowsOf(t).length, 'step')}</small></a></li>${extrasOf(s, t).forks.map((n) => {
    const screen = firstScreen(n.read);
    const inner = `<span class="ln-path__dot"></span><b>${esc(n.session)}</b><small>${sentence(tokens(n.does.tokens))}</small>`;
    return `
  <li data-kind="fork">${screen && cards.has(screen.code) ? `<a class="ln-path__stop" href="${hrefScreen(screen.code)}">${inner}</a>` : `<span class="ln-path__stop">${inner}</span>`}</li>`;
  }).join('')}`).join('');
  const wrong = section(s, 'troubleshooting');
  const variants = section(s, 'variants');
  const next = section(s, 'downstream');
  // A problem row leads with the task it belongs to, read from its Phase cell.
  const wrongItems = wrong.map((row) => ({ lead: esc(taskOf(s, Number(row.cells[0].text))?.title ?? ''), title: tokens(row.cells[1].tokens), body: `<p>${tokens(row.cells[2].tokens)}</p>` }));
  const folds = accordion([
    wrong.length && ['wrong', `If something goes wrong · ${wrong.length}`, list(wrongItems)],
    looked(s).length && ['reference', 'Reference', referenceOf(s)],
    variants.length && ['cases', `Different cases · ${variants.length}`, list(problems(variants))],
    next.length && ['next', 'What comes next', list(next.map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` })))],
  ]);
  const body = `${breadcrumb([[at('home.html'), 'Home'], ['', s.title]])}
<div>
<h1 class="rux--type-productive-heading-05">${esc(s.title)}</h1>
<p class="rux--type-body-long-01">${sentence(esc(s.summary ?? ''))}</p>
</div>
<div>${tag(statusOf(s))} ${s.modules.map((m) => tag([m, 'cool-gray'])).join(' ')}</div>
${before(s.before)}
<p class="ln-go"><a class="rux--btn rux--btn--primary" href="${hrefTask(ts[0].id)}?walk=1">Start</a><span class="ln-quiet">${count(ts.length, 'task')} · ${count(steps, 'step')}</span></p>
<div>
<h2 class="rux--type-productive-heading-03" id="tasks">The tasks, in order</h2>
</div>
<ol class="ln-path">${stops}
</ol>
${folds}`;
  const aside = onThisPage([['#tasks', 'The tasks, in order'], wrong.length && ['#wrong', 'If something goes wrong'], looked(s).length && ['#reference', 'Reference'],
    variants.length && ['#cases', 'Different cases'], next.length && ['#next', 'What comes next']].filter(Boolean));
  return page(`${s.title} — LN Guide`, s.id, column(body, 10) + '\n' + column(aside, 4, 'ln-aside'));
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

function task(s, t) {
  for (const b of t.blocks) if (b.kind !== 'prose' && b.kind !== 'steps') throw new Error(`no rendering for a "${b.kind}" block in ${t.id}`);
  if (t.sessionCode && !cards.has(t.sessionCode)) report.push(`no page     ${s.title} · ${t.process.n}: ${t.session} (${t.sessionCode}) has no purpose line`);
  const rows = rowsOf(t);
  const { cases } = extrasOf(s, t);
  const need = needs(s, t);
  const first = t.process.n === s.tasks[0].n;
  const prose = t.blocks.filter((b) => b.kind === 'prose').map((b) => `<p>${tokens(b.tokens)}</p>`).join('');
  const screen = t.sessionCode ? cards.get(t.sessionCode) : null;
  const ideas = ideasOf(t);
  const strip = `Task ${t.process.n + 1} of ${t.process.of} in <a class="rux--link" href="${hrefProcess(s.id)}">${esc(s.title)}</a>${t.next ? ` · next: <a class="rux--link" href="${hrefTask(t.next.id)}">${esc(t.next.title)}</a>` : ''}`;
  const wrong = problems(t.problems.rows);
  const why = t.why ? `<p>${tokens(t.why.tokens)}</p>` : '';
  const whyFold = why && ['why', 'Why LN works this way', why];
  const stuck = (id, label) => wrong.length && [id, `${label} · ${wrong.length}`, list(wrong)];
  const related = ['related', 'Related', list([
    screen && { title: 'Screen', body: `<p>${screenLink(t.sessionCode, named(t.session))} ${exact(t.sessionCode)}<br><span class="ln-quiet">${esc(screen.purpose)}</span></p>` },
    ideas.length && { title: 'Ideas', body: `<p>${ideas.map((c) => `<a class="rux--link" href="${hrefIdea(c.id)}">${esc(c.name)}</a>`).join(' · ')}</p>` },
    t.next && { title: 'Next task', body: `<p><a class="rux--link" href="${hrefTask(t.next.id)}">${esc(t.next.title)}</a> in ${esc(s.title)}</p>` },
  ].filter(Boolean))];
  const lines = rows.map((r) => headline(r.cells[1].tokens, t.route));
  const full = `${breadcrumb([[at('home.html'), 'Home'], [hrefProcess(s.id), s.title], ['', t.title]])}
<div>
<h1 class="rux--type-productive-heading-05">${esc(t.title)}</h1>${t.achieves ? `
<p class="rux--type-body-long-01">What you get: ${tokens(t.achieves.tokens)}.</p>` : ''}
</div>
<div>${tag(taskStatus(t))} ${t.modules.map((m) => tag([m, 'cool-gray'])).join(' ')}</div>
<p class="ln-strip">${strip}</p>
${first ? before(s.before) : need.length ? `<p><strong>Before you start.</strong> You need ${need.join(' and ')}.</p>` : ''}${t.route ? `
<div class="ln-screen-line"><span class="ln-quiet">Screen</span> ${route(t.route)} ${t.sessionCode ? codeChip(t.sessionCode) : ''}</div>` : ''}
<p class="ln-go"><a class="rux--btn rux--btn--primary" href="?walk=1">Walk it</a><span class="ln-quiet">one step at a time · ${count(rows.length, 'step')}</span></p>
<div>
<h2 class="rux--type-productive-heading-03" id="steps">Steps</h2>
</div>${prose ? `
<div class="ln-why">${prose}</div>` : ''}
<ol class="ln-doc">${rows.map((r, k) => `
  <li id="step-${k + 1}"><div class="ln-doc__do">${lines[k].head}</div>${lines[k].note ? `<p class="ln-doc__note">${lines[k].note}</p>` : ''}${lines[k].routes.map((x) => `<p class="ln-doc__route">${x}</p>`).join('')}${see(r) ? `<div class="ln-doc__see"><b>You should see</b> ${see(r)}</div>` : ''}</li>`).join('')}
</ol>
${accordion([whyFold, stuck('wrong', 'If something goes wrong'), cases.length && ['cases', `Variations · ${cases.length}`, list(cases)], related])}`;
  const aside = onThisPage([['#steps', 'Steps'], why && ['#why', 'Why LN works this way'], wrong.length && ['#wrong', 'If something goes wrong'],
    cases.length && ['#cases', 'Variations'], ['#related', 'Related']].filter(Boolean));
  const guided = `<section class="ln-guided" data-task="${esc(t.id)}" data-title="${esc(t.title)}" data-process="${esc(s.title)}" data-process-href="${hrefProcess(s.id)}"${t.next ? ` data-next-href="${hrefTask(t.next.id)}?walk=1"` : ''}>
<a class="rux--link ln-back" href="${hrefProcess(s.id)}"><svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--left"/></svg>${esc(s.title)}</a>
<div class="rux--progress-bar rux--progress-bar--small">
  <div class="rux--progress-bar__label"><span class="rux--progress-bar__label-text">${esc(t.title)}</span></div>
  <div class="rux--progress-bar__track"><div class="rux--progress-bar__bar" data-bar></div></div>
  <div class="rux--progress-bar__helper-text" data-where></div>
</div>
<ol class="ln-steps">${rows.map((r, k) => `
  <li data-k="${k + 1}" hidden>
    <div class="ln-step__main"><h1 class="ln-step__do">${lines[k].head}</h1>${lines[k].note ? `<p class="ln-step__note">${lines[k].note}</p>` : ''}${lines[k].routes.map((x) => `<p class="ln-step__route">${x}</p>`).join('')}</div>${see(r) ? `
    <div class="ln-step__see"><span class="ln-quiet">You should see</span><p>${see(r)}</p></div>` : ''}
  </li>`).join('')}
</ol>${t.route ? `
<p class="ln-step__route">${route(t.route)} ${t.sessionCode ? exact(t.sessionCode) : ''}</p>` : ''}
${accordion([stuck('stuck', 'Stuck?'), why && ['why-guided', 'Why LN works this way', why]])}
<div class="ln-step__more"><a class="rux--link" href="?full">Full page</a><a class="rux--link" href="#main-content" data-listen>Read it to me</a></div>
</section>
<div class="ln-nav">
  <a class="rux--btn rux--btn--secondary" href="${hrefProcess(s.id)}" data-prev>Back</a>
  <a class="rux--btn rux--btn--primary" href="?walk=2" data-next>Next</a>
</div>`;
  return page(`${t.title} — LN Guide`, s.id, column(full, 10, '', 'data-view="full"') + '\n' + column(aside, 4, 'ln-aside', 'data-view="full"')
    + '\n' + column(guided, 12, '', 'data-view="guided" hidden'));
}

// ---- the task index ---------------------------------------------------------------
const taskRow = (s, t) => `<li id="${esc(t.id)}"><b><a class="rux--link" href="${hrefTask(t.id)}"><span>${esc(t.title)}</span></a></b><p class="ln-quiet">${esc(s.title)} · ${count(rowsOf(t).length, 'step')}</p>${tag(taskStatus(t))}</li>`;
function taskIndex() {
  const groups = [];
  for (const s of processes) {
    const key = s.module ?? '';
    (groups.find((g) => g.title === key) ?? groups[groups.push({ title: key, rows: [] }) - 1]).rows.push(...tasksOf(s).map((t) => drawing(s, t, () => taskRow(s, t))));
  }
  const other = allSide.map((n) => side.includes(n)
    ? `<li id="${esc(n.id)}"><b>${esc(n.session)}</b>${accordion([[`side-${esc(n.id)}`, 'Steps', sideBody(n)]])}</li>`
    : `<li id="${esc(n.id)}"><b>${esc(n.session)}</b><p class="ln-quiet">Not documented yet.</p></li>`);
  const body = `${breadcrumb([[at('home.html'), 'Home'], ['', 'Tasks']])}
<div>
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
  return page('Tasks — LN Guide', 'tasks', column(body, 12));
}

// ---- screens and ideas ---------------------------------------------------------------
const usedIn = new Map();
for (const s of processes) for (const t of tasksOf(s)) for (const code of codesOf(t)) (usedIn.get(code) ?? usedIn.set(code, []).get(code)).push({ s, t });
const taskLinks = (uses) => uses.map(({ s, t }) => `<a class="rux--link" href="${hrefTask(t.id)}">${esc(s.title)} · ${esc(t.title)}</a>`).join('<br>');
const fact = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
const isRoute = (r) => r.includes(ARROW.trim());
function screenPage(c) {
  const ideas = concepts.filter((x) => x.sources.includes(c.code));
  const body = `${breadcrumb([[at('home.html'), 'Home'], [at('screens/index.html'), 'Screens'], ['', c.name]])}
<div>
<p class="ln-quiet">Screen</p>
<h1 class="rux--type-productive-heading-05">${esc(c.name)}</h1>
<p class="rux--type-body-long-01">${esc(c.purpose)}</p>
</div>
<dl class="ln-card__facts">${fact('Code', codeChip(c.code))}${c.route ? fact(isRoute(c.route) ? 'Route' : 'Reached', isRoute(c.route) ? route(c.route) : esc(c.route)) : ''}${fact('Used in', taskLinks(usedIn.get(c.code) ?? []))}${fact('Ideas', ideas.map((x) => `<a class="rux--link" href="${hrefIdea(x.id)}">${esc(x.name)}</a>`).join('<br>'))}</dl>`;
  return page(`${c.name} — LN Guide`, 'screens', column(body, 12));
}
function ideaPage(c) {
  const uses = [...new Set(c.sources.flatMap((code) => usedIn.get(code) ?? []))];
  const body = `${breadcrumb([[at('home.html'), 'Home'], [at('ideas/index.html'), 'Ideas'], ['', c.name]])}
<div>
<p class="ln-quiet">Idea</p>
<h1 class="rux--type-productive-heading-05">${esc(c.name)}</h1>
<p class="rux--type-body-long-01">${esc(c.purpose)}</p>
</div>
<dl class="ln-card__facts">${fact('Also called', esc(c.terms.filter((x) => x !== c.name.toLowerCase()).join(', ')))}${fact('Screens', c.sources.map((code) => screenLink(code, esc(cards.get(code)?.name ?? code))).join('<br>'))}${fact('Where it matters', taskLinks(uses))}</dl>`;
  return page(`${c.name} — LN Guide`, 'ideas', column(body, 12));
}
const indexPage = (title, intro, active, rows) => page(`${title} — LN Guide`, active, column(`${breadcrumb([[at('home.html'), 'Home'], ['', title]])}
<div>
<h1 class="rux--type-productive-heading-05">${title}</h1>
<p class="rux--type-body-long-01">${intro}</p>
</div>
<ul class="ln-list">${rows.join('')}
</ul>`, 12));
const byName = (a, b) => a.name.localeCompare(b.name);
const screenIndex = () => indexPage('Screens', 'Every LN screen the tasks open, by name. One the library has not described yet says so.', 'screens', [
  ...[...cards.values()].sort(byName).map((c) => `<li><b><a class="rux--link" href="${hrefScreen(c.code)}"><span>${esc(c.name)}</span></a></b><p>${exact(c.code)} <span class="ln-quiet">${esc(c.purpose)}</span></p></li>`),
  ...noCard.sort(byName).map((c) => `<li><b>${esc(c.name)}</b><p>${exact(c.code)} <span class="ln-quiet">Not documented yet.</span></p></li>`)]);
const ideaIndex = () => indexPage('Ideas', 'What a word means in LN, and why LN works that way.', 'ideas',
  [...concepts].sort(byName).map((c) => `<li><b><a class="rux--link" href="${hrefIdea(c.id)}"><span>${esc(c.name)}</span></a></b><p class="ln-quiet">${esc(c.purpose)}</p></li>`));

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
  ...side.map((n) => hit('Task', n.session, `${n.session} ${n.code ?? ''} ${n.does.text} ${n.steps.map((x) => x.text).join(' ')}`, `${at('do/index.html')}#${n.id}`, esc(n.session), sentence(tokens(n.does.tokens)))),
  ...[...cards.values()].map((c) => hit('Screen', `${c.name} ${c.code}`, `${c.name} ${c.code} ${c.route ?? ''} ${c.purpose}`, hrefScreen(c.code), esc(c.name), esc(c.purpose))),
  ...concepts.map((c) => hit('Idea', `${c.name} ${c.terms.join(' ')}`, `${c.name} ${c.terms.join(' ')} ${c.purpose}`, hrefIdea(c.id), esc(c.name), esc(c.purpose))),
];
const searchPage = () => page('Search — LN Guide', 'search', column(`<h1 class="rux--type-productive-heading-05">Search</h1>
${searchBox('find')}
<h2 class="rux--type-productive-heading-03" data-count hidden></h2>
<div class="ln-results" id="results"></div>`, 12));

// ---- write every page ----------------------------------------------------------
const written = [];
const write = (path, text) => { const file = join(ROOT, path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); written.push(file); };
for (const dir of ['do', 'follow', 'screens', 'ideas']) rmSync(join(ROOT, dir), { recursive: true, force: true });

write('home.html', home());
write('search.html', searchPage());
writeFileSync(join(ROOT, 'search.json'), JSON.stringify(searchIndex()) + '\n');
drawn('../', () => {
  write('do/index.html', taskIndex());
  for (const s of processes) {
    write(`follow/${s.id}.html`, drawing(s, null, () => processPage(s)));
    for (const t of tasksOf(s)) write(`do/${t.id}.html`, drawing(s, t, () => task(s, t)));
  }
  write('screens/index.html', screenIndex());
  for (const c of cards.values()) write(`screens/${c.code}.html`, screenPage(c));
  write('ideas/index.html', ideaIndex());
  for (const c of concepts) write(`ideas/${c.id}.html`, ideaPage(c));
});
execFileSync(process.execPath, [join(ROOT, '..', 'tools', 'inline-sprite.mjs'), ...written], { stdio: 'ignore' });

const steps = tasks.reduce((n, t) => n + rowsOf(t).length, 0);
if (allSide.length > side.length) report.push(`no steps    ${allSide.length - side.length} of ${allSide.length} side tasks have no written step, so they are rows and not pages`);
if (noCard.length) report.push(`no page     ${noCard.length} of ${screens.length} screens have no purpose line, so they have no page`);
console.log(`  built the pages: ${processes.length} processes, ${tasks.length} tasks, ${steps} steps, ${cards.size} screens, ${concepts.length} ideas, ${written.length} files`);
console.log(`\n  what the export does not yet say (${new Set(report).size}):`);
for (const line of new Set(report)) console.log(`    ${line}`);
