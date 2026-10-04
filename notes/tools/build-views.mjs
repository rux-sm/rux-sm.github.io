#!/usr/bin/env node
// build-views.mjs -- writes Notes' three views from data/atlas/:
//
//   do.html          a scenario as a line of tasks, one open, with its questions
//   understand.html  the map of the chain, with a scenario's route lit
//   lookup.html      one search over screens and tasks
//
// docs/plans/notes-learning-tool.md is what each view is for. Everything on a
// page comes from the export; nothing is placed or linked by hand here, so a
// correction is made in atlas and the next run redraws it.
//
// THE BUILD SAYS WHAT IT COULD NOT PLACE and still builds: a task on no map
// tile, a question with no task, a decision with no screen to read its answer
// on, and a screen with no card are each listed at the end of the run.
//
//   node tools/build-views.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shell } from './shell.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'atlas');
const MAP = 'order-to-shipment-overview';

const read = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));
const files = readdirSync(DATA).filter((f) => f.endsWith('.json'));
const scenarios = files.map(read).filter((j) => j.phases).sort((a, b) => a.order - b.order);
const { diagram } = read(MAP + '.json');
const mapTitle = read(MAP + '.json').title;
const cards = new Map(read('screens.json').entries.filter((e) => e.purpose).map((e) => [e.code, e]));
const noCard = read('screens.json').entries.filter((e) => !e.purpose);
const concepts = files.includes('glossary.json') ? read('glossary.json').entries : [];
// Side tasks: things done beside the chain, each a tile in atlas's task map.
// One with a written step is shown; one that is only a gap waits in atlas.
const GAP = 'Not documented for this release.';
const allSide = files.includes('tasks.json') ? read('tasks.json').diagram.nodes : [];
const side = allSide.filter((n) => (n.steps ?? []).some((x) => x.text.trim() !== GAP));
const commit = /commit\s+([0-9a-f]{40})/.exec(readFileSync(join(DATA, 'PIN'), 'utf8'))?.[1];
if (!commit) throw new Error('data/atlas/PIN names no commit -- run sh tools/sync-export.sh');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// A tile's account is a phrase atlas ends without a full stop, unless its last
// sentence is one the export wrote in place of a gap.
const sentence = (html) => cap(html).replace(/\.?(<\/strong>)?$/, (m, close) => (close ? '.' + close : '.'));
const report = [];

// ---- text ----------------------------------------------------------------
// Atlas sends prose as typed tokens. Four registers carry them: a control you
// press, a name on the screen, a string to type or match exactly, and a state.
// A type this file does not know stops the build, because a dropped token is a
// step with a hole in it and nothing on the page would say so.

const ARROW = ' \u2794 ';
const route = (raw) => `<span class="notes-t-route">${raw.split(ARROW).map((x, i, all) =>
  (i ? '<span class="sep">\u2794</span>' : '') + `<span${i === all.length - 1 ? ' class="dest"' : ''}>${esc(x)}</span>`).join('')}</span>`;
const named = (v) => `<span class="notes-t-named">${esc(v)}</span>`;
const exact = (v) => `<span class="notes-t-exact">${esc(v)}</span>`;
const screenLink = (code, text) => cards.has(code)
  ? `<a class="rux--link" href="lookup.html?q=${esc(code)}">${text}</a>` : text;

const ready = new Set(scenarios.map((s) => s.id));
function token(t) {
  switch (t.t) {
    case 'text': return esc(t.v);
    case 'strong': return `<strong>${esc(t.v)}</strong>`;
    case 'em': return `<em>${esc(t.v)}</em>`;
    case 'chip': case 'field': return named(t.v);
    case 'value': case 'literal': return exact(t.v);
    case 'button': return `<span class="notes-t-press">${esc(t.label)}</span>`;
    case 'status': return `<span class="rux--tag rux--tag--teal rux--layout--size-sm"><span class="rux--tag__label">${esc(t.v)}</span></span>`;
    case 'command': case 'path': return route(t.route);
    // The link wraps the name alone: Carbon's link is a flex box, and a space
    // between two things inside one collapses.
    case 'session': return t.name ? `${screenLink(t.code, named(t.name))} ${exact(t.code)}` : screenLink(t.code, exact(t.code));
    case 'pencil': return '<svg class="notes-pencil" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" role="img" aria-label="worth noting down"><use href="#i-edit"/></svg>';
    // A link names another atlas document. One that is a ready scenario opens
    // it in Do; any other keeps its words and has nowhere to go yet.
    case 'link': {
      const id = /^(.+)\.md$/.exec(t.href)?.[1];
      return ready.has(id) ? `<a class="rux--link" href="do.html?s=${esc(id)}">${esc(t.v)}</a>` : esc(t.v);
    }
    default: throw new Error(`no rendering for token type "${t.t}": ${JSON.stringify(t)}`);
  }
}
const tokens = (list) => list.map(token).join('');
const plain = (list) => list.map((t) => t.v ?? t.label ?? t.route ?? t.name ?? t.code ?? '').join('');

// ---- routes ----------------------------------------------------------------
// A scenario's route is the map tiles its tasks sit on, in task order, with
// the decisions the map puts between two of them. Atlas links a tile to the
// phases it opens; the tiles in between are found by following the map's own
// lines from one task's tile to the next.

const node = new Map(diagram.nodes.map((n) => [n.id, n]));
const out = (id) => diagram.edges.filter((e) => e.from === id && e.kind !== 'feed');
// One task can sit on several tiles, as one phase that releases, advises, picks
// and ships does; they are taken in the order the map numbers its walk.
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
  const stops = [];   // { id, tasks: [n] } in the order the route passes them
  const lines = [];   // { from, to, jump } between two stops
  const after = new Map();   // task n -> the tiles the route passes straight after it
  let last = null;
  for (const p of s.phases) for (const id of tile.get(p.n) ?? []) {
    if (last && last.id !== id) {
      const path = between(last.id, id, taken);
      if (path) {
        for (let i = 1; i < path.length - 1; i++) stops.push({ id: path[i], tasks: [] });
        for (let i = 1; i < path.length; i++) lines.push({ from: path[i - 1], to: path[i] });
        if (path.length > 2) after.set(last.n, [...(after.get(last.n) ?? []), ...path.slice(1, -1)]);
      } else lines.push({ from: last.id, to: id, jump: true });
    }
    const stop = stops.find((x) => x.id === id);
    if (!stop) stops.push({ id, tasks: [p.n] }); else if (!stop.tasks.includes(p.n)) stop.tasks.push(p.n);
    last = { id, n: p.n };
  }
  const taskAt = (id) => [...tile].find(([, ids]) => ids.includes(id))?.[0];
  return { tile, stops, lines, after, taskAt };
}

const routes = new Map(scenarios.map((s) => [s.id, routeOf(s)]));
for (const s of scenarios) {
  const off = s.phases.filter((p) => !routes.get(s.id).tile.has(p.n));
  if (off.length) report.push(`off the map ${s.title}: ${off.length} of ${s.phases.length} tasks are on no map tile (${off.map((p) => p.n).join(', ')})`);
}
const shown = scenarios;

// ---- questions -------------------------------------------------------------
// Atlas holds a task's questions in four shapes today, and each is read where
// it is: a decision the route passes after the task, the walkthrough's
// troubleshooting rows for the phase, a variant that names one of the phase's
// steps, and the next-walkthrough rows, which belong to the last task.

const section = (s, kind) => s.sections.find((x) => x.kind === kind)?.rows ?? [];
const decides = (n) => n.kind === 'decision' || n.kind === 'gate';
// The first screen a field cites is the one to open; the sentence around it
// says what to look at there.
const firstScreen = (field) => field?.tokens.find((t) => t.t === 'session');
const opener = (label, field) => {
  const screen = firstScreen(field);
  return screen ? [`<li>${label}${ARROW}${screenLink(screen.code, esc(screen.name ?? screen.code))}</li>`] : [];
};
// A decision as a question: what it decides, each way it can go, the screen to
// read the answer on, and the screen that holds the setting behind it.
function decision(n, link) {
  const answers = diagram.edges.filter((e) => e.from === n.id && e.kind === 'branch')
    .map((e) => `<li>${link(e.to, `${esc(cap(e.label?.text ?? ''))}${ARROW}${esc(node.get(e.to).session)}`)}</li>`);
  const all = [...answers, ...opener("I don't know", n.read), ...opener('Check or change it', n.setting)];
  return `<p>${sentence(tokens(n.does.tokens))}</p>${all.length ? `<ul class="notes-answers">${all.join('')}</ul>` : ''}`;
}
function questionsOf(s, p) {
  const r = routes.get(s.id);
  const list = [];
  const link = (to, text) => {
    const task = r.taskAt(to);
    return `<a class="rux--link" href="${task != null ? `do.html?s=${esc(s.id)}&amp;t=${task}` : `understand.html?n=${esc(to)}`}">${text}</a>`;
  };
  // The decisions the route passes after this task, what feeds each of them,
  // and the turns that leave this task's own tiles.
  const asked = new Set();
  const ask = (id) => {
    const n = node.get(id);
    if (!decides(n) || asked.has(id)) return;
    asked.add(id);
    if (n.kind === 'decision' && !firstScreen(n.read)) report.push(`no screen   ${s.title} · ${p.n}: "${n.session}" names no screen to read its answer on`);
    list.push({ title: esc(n.session), body: decision(n, link) });
    for (const e of diagram.edges) if (e.to === id && e.kind === 'feed') ask(e.from);
  };
  for (const id of r.after.get(p.n) ?? []) ask(id);
  for (const id of r.tile.get(p.n) ?? []) for (const e of diagram.edges) if (e.from === id && e.kind === 'branch') ask(e.to);
  for (const n of sideUnder([...(r.tile.get(p.n) ?? []), ...asked])) list.push({ title: esc(n.session), body: sideBody(n) });
  for (const row of section(s, 'troubleshooting')) if (Number(row.cells[0].text) === p.n)
    list.push({ title: tokens(row.cells[1].tokens), body: `<p>${tokens(row.cells[2].tokens)}</p>` });
  for (const row of section(s, 'variants')) {
    const at = /\b(\d+)\.\d+\b/.exec(row.cells[1].text)?.[1];
    if (at != null && Number(at) === p.n) list.push({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` });
  }
  if (p === s.phases.at(-1)) for (const row of section(s, 'downstream'))
    list.push({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` });
  return list;
}
for (const s of shown) {
  const n = section(s, 'variants').filter((row) => !/\b\d+\.\d+\b/.test(row.cells[1].text)).length;
  if (n) report.push(`no task     ${s.title}: ${n} variants name no step, so they sit under the scenario and not on a task`);
}

// A variant that names no step belongs to the scenario as a whole, so it sits
// under whichever task is open, apart from that task's own questions.
const loose = (s) => {
  const list = section(s, 'variants').filter((row) => !/\b\d+\.\d+\b/.test(row.cells[1].text))
    .map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` }));
  return list.length ? `
    <div class="notes-loose">
      <h2 class="notes-loose__label">Different cases</h2>${accordion(list)}
    </div>` : '';
};

// A side task as it reads wherever it is shown: what it does, then its steps,
// with the line the export wrote in place of a gap set apart as a note.
const sideBody = (n) => `<p>${sentence(tokens(n.does.tokens))}</p>
          <ol class="notes-side">${n.steps.map((x) => x.text.trim() === GAP
    ? `<li class="notes-side__note">${GAP}</li>` : `<li>${tokens(x.tokens)}</li>`).join('')}</ol>`;
const sideUnder = (ids) => side.filter((n) => n.under?.map === MAP && ids.includes(n.under.node));

function accordion(list) { return list.length ? `
      <ul class="rux--accordion rux--accordion--end rux--layout--size-md">${list.map((q) => `
        <li class="rux--accordion__item">
          <button type="button" class="rux--accordion__heading" aria-expanded="false">
            <svg class="rux--accordion__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--right"/></svg>
            <div class="rux--accordion__title">${q.title}</div>
          </button>
          <div class="rux--accordion__wrapper"><div class="rux--accordion__content">${q.body}</div></div>
        </li>`).join('')}
      </ul>` : ''; }

// ---- Do --------------------------------------------------------------------

// The explanation opens with a label atlas writes for its own page; here the
// paragraph sits under the task it explains and needs none. Its first two
// sentences show, and the rest waits behind Show more.
function why(block) {
  const list = block.tokens[0]?.t === 'strong' ? block.tokens.slice(1) : block.tokens;
  let seen = 0, stops = 0, cut = -1, at = 0;
  for (let i = 0; i < list.length && cut < 0; i++) {
    const t = list[i];
    if (t.t !== 'text') { seen += plain([t]).length; continue; }
    for (const m of t.v.matchAll(/\. /g)) if (++stops === 2 || seen + m.index > 240) { cut = i; at = m.index + 1; break; }
    seen += t.v.length;
  }
  if (cut < 0) return `<p class="notes-task__why">${tokens(list).trim()}</p>`;
  const head = [...list.slice(0, cut), { t: 'text', v: list[cut].v.slice(0, at) }];
  const rest = [{ t: 'text', v: list[cut].v.slice(at) }, ...list.slice(cut + 1)];
  return `<p class="notes-task__why">${tokens(head).trim()}<span hidden>${tokens(rest)}</span> <a class="rux--link" href="#main-content" role="button" data-more>Show more</a></p>`;
}

const steps = (block) => `
      <div class="rux--data-table-content">
        <table class="rux--data-table rux--data-table--sm">
        <thead><tr>${block.columns.map((c) => `<th scope="col"><div class="rux--table-header-label">${c === '#' ? '<span class="rux--visually-hidden">Step</span>' : esc(c)}</div></th>`).join('')}</tr></thead>
        <tbody>${block.rows.map((r) => `
          <tr>${r.cells.map((c, i) => `<td${i ? '' : ' class="notes-step-id"'}>${tokens(c.tokens)}</td>`).join('')}</tr>`).join('')}
        </tbody>
        </table>
      </div>`;

function task(s, p) {
  const prose = p.blocks.filter((b) => b.kind === 'prose');
  for (const b of p.blocks) if (b.kind !== 'prose' && b.kind !== 'steps') throw new Error(`no rendering for a "${b.kind}" block in ${s.id} phase ${p.n}`);
  if (p.sessionCode && !cards.has(p.sessionCode)) report.push(`no card     ${s.title} · ${p.n}: ${p.session} (${p.sessionCode}) has no purpose line`);
  return `
    <article class="notes-task" data-scenario="${esc(s.id)}" data-task="${p.n}" hidden>
      <h2 class="rux--visually-hidden">${p.n} ${esc(p.title)}</h2>
      ${p.route ? `<p class="notes-task__route">${screenLink(p.sessionCode, route(p.route))}${p.sessionCode ? `
        <button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm notes-task__code" data-copy="${esc(p.sessionCode)}" aria-label="Copy the code ${esc(p.sessionCode)}">${esc(p.sessionCode)}</button>` : ''}</p>` : ''}
      ${prose.length ? why(prose[0]) : ''}${p.blocks.filter((b) => b.kind === 'steps').map(steps).join('')}
      ${prose.slice(1).map((b) => `<p class="notes-task__why">${tokens(b.tokens)}</p>`).join('')}${accordion(questionsOf(s, p))}
    </article>`;
}

// A prerequisite arrives as a callout: "> ", the word Prerequisite, " > " and
// then the sentence. The frame carries its own label, so only the sentence shows.
const needs = (s) => s.sections.filter((x) => x.kind === 'prose' && /^> Prerequisite >/.test(x.text))
  .map((x) => tokens([{ t: 'text', v: x.tokens[2].v.replace(/^\s*>\s*/, '') }, ...x.tokens.slice(3)]));

function scenario(s) {
  const need = needs(s);
  return `
  <section class="notes-scenario" data-scenario="${esc(s.id)}" hidden>
    <h1 class="${shown.length > 1 ? 'rux--visually-hidden' : 'rux--type-productive-heading-05'}">${esc(s.title)}</h1>
    <p class="notes-frame"><span>${esc(cap(s.summary))}</span>${need.map((n) => `<span><b>Needs</b> · ${n}</span>`).join('')}</p>
    <ol class="notes-line">${s.phases.map((p) => `
      <li><a class="notes-line__tile" href="do.html?s=${esc(s.id)}&amp;t=${p.n}" data-task="${p.n}"><span class="notes-line__n">${p.n}</span>${esc(p.title)}</a></li>`).join('')}
    </ol>${s.phases.map((p) => task(s, p)).join('')}${loose(s)}
  </section>`;
}

const picker = (first) => shown.length > 1 || first ? `
  <div class="rux--form-item notes-picker">
    <div class="rux--select rux--layout--size-md">
      <label class="rux--label" for="scenario">Scenario</label>
      <div class="rux--select-input__wrapper">
        <select id="scenario" class="rux--select-input">${first ? `
          <option class="rux--select-option" value="">${esc(first)}</option>` : ''}${shown.map((s) => `
          <option class="rux--select-option" value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}
        </select>
        <svg class="rux--select__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg>
      </div>
    </div>
  </div>` : '';

const doBody = () => `${picker('')}${shown.map(scenario).join('')}`;

// ---- Understand ------------------------------------------------------------
// One look for every tile. A tile opens its own short account under the map:
// what it does, its screen, the tasks it stands for, and a decision's answers.

function detail(n) {
  const opens = shown.flatMap((s) => s.phases.filter((p) => routes.get(s.id).tile.get(p.n)?.includes(n.id))
    .map((p) => `<li><a class="rux--link" href="do.html?s=${esc(s.id)}&amp;t=${p.n}">${esc(s.title)} · ${p.n} ${esc(p.title)}</a></li>`));
  const here = (to, text) => `<a class="rux--link" href="understand.html?n=${esc(to)}" data-node="${esc(to)}">${text}</a>`;
  const cases = sideUnder([n.id]).map((t) => `<li><a class="rux--link" href="lookup.html?q=${encodeURIComponent(t.session)}">${esc(t.session)}</a></li>`);
  return `
    <div class="notes-detail" data-detail="${esc(n.id)}" hidden>
      <h2 class="rux--type-productive-heading-03">${esc(n.session)}</h2>
      ${decides(n) ? decision(n, here) : `<p>${sentence(tokens(n.does.tokens))}</p>`}${n.code ? `
      <p class="notes-task__route"><span>${tokens(n.route.tokens)}</span> ${screenLink(n.code, exact(n.code))}</p>` : ''}${[...opens, ...cases].length ? `
      <ul class="notes-answers">${[...opens, ...cases].join('')}</ul>` : ''}
    </div>`;
}

const understandBody = () => `
  <h1 class="rux--type-productive-heading-05">${esc(mapTitle)}</h1>${picker('Whole map')}
  <div class="notes-map__scroll"><div class="notes-map" id="map">
    <div class="notes-map__head"></div>${diagram.stages.map((s) => `<div class="notes-map__head">${s.n} · ${esc(s.name)}</div>`).join('')}${diagram.lanes.map((lane) => `
    <div class="notes-map__lane">${esc(lane.name)}</div>${diagram.stages.map((s) => `
    <div class="notes-map__cell">${diagram.nodes.filter((n) => n.lane === lane.name && n.stage === s.n).map((n) => `
      <button type="button" class="notes-map__tile" data-node="${esc(n.id)}"${n.code ? '' : ' data-screen="no"'} aria-expanded="false">${esc(n.session)}</button>`).join('')}
    </div>`).join('')}`).join('')}
  </div></div>
  <div class="notes-details">${diagram.nodes.map(detail).join('')}
  </div>
  <script type="application/json" id="routes">${JSON.stringify(Object.fromEntries(shown.map((s) => {
    const r = routes.get(s.id);
    return [s.id, { stops: r.stops, lines: r.lines }];
  }))).replace(/</g, '\\u003c')}</script>`;

// ---- Look up ---------------------------------------------------------------
// Every card is on the page and none shows until the search finds it. A card's
// search text is its name, code, route and purpose; a task's is its title and
// the words of its steps.

const usedIn = new Map();
for (const s of shown) for (const p of s.phases) {
  const codes = new Set(p.sessionCode ? [p.sessionCode] : []);
  (function walk(x) {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') { if (x.t === 'session') codes.add(x.code); Object.values(x).forEach(walk); }
  })(p.blocks);
  for (const c of codes) (usedIn.get(c) ?? usedIn.set(c, []).get(c)).push(`<a class="rux--link" href="do.html?s=${esc(s.id)}&amp;t=${p.n}">${esc(s.title)} · ${p.n} ${esc(p.title)}</a>`);
}
const fact = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
const lookupBody = () => `
  <h1 class="rux--visually-hidden">Look up</h1>
  <div class="rux--search rux--layout--size-lg">
    <div class="rux--search-magnifier"><svg class="rux--search-magnifier-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-search"/></svg></div>
    <label class="rux--label" for="lookup">Search</label>
    <input id="lookup" class="rux--search-input" type="text" role="searchbox" placeholder="A screen, a code or a word" autocomplete="off">
    <button type="button" class="rux--search-close rux--search-close--hidden" aria-label="Clear">
      <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg>
    </button>
  </div>
  <div class="notes-cards" id="results">${shown.flatMap((s) => s.phases.map((p) => `
    <div class="rux--tile notes-card" data-text="${esc(`${s.title} ${p.title} ${p.session ?? ''} ${p.sessionCode ?? ''} ${p.blocks.filter((b) => b.kind === 'steps').flatMap((b) => b.rows.map((r) => r.cells.map((c) => c.text).join(' '))).join(' ')}`.toLowerCase())}" hidden>
      <p class="notes-card__kind">Task</p>
      <h2 class="rux--type-productive-heading-03"><a class="rux--link" href="do.html?s=${esc(s.id)}&amp;t=${p.n}">${p.n} ${esc(p.title)}</a></h2>
      <p>${esc(s.title)}</p>
    </div>`)).join('')}${side.map((n) => `
    <div class="rux--tile notes-card" data-text="${esc(`${n.session} ${n.code ?? ''} ${n.does.text} ${n.steps.map((x) => x.text).join(' ')}`.toLowerCase())}" hidden>
      <p class="notes-card__kind">Task</p>
      <h2 class="rux--type-productive-heading-03">${esc(n.session)}</h2>
      ${sideBody(n)}
    </div>`).join('')}${[...cards.values()].map((c) => `
    <div class="rux--tile notes-card" data-code="${esc(c.code)}" data-text="${esc(`${c.name} ${c.code} ${c.route} ${c.purpose}`.toLowerCase())}" hidden>
      <p class="notes-card__kind">Screen</p>
      <h2 class="rux--type-productive-heading-03">${esc(c.name)}</h2>
      <p>${esc(c.purpose)}</p>
      <dl class="notes-card__facts">${fact('Code', exact(c.code))}${c.route ? fact('Route', route(c.route)) : ''}${usedIn.has(c.code) ? fact('Used in', usedIn.get(c.code).join('<br>')) : ''}</dl>
    </div>`).join('')}${concepts.map((c) => `
    <div class="rux--tile notes-card" data-text="${esc(`${c.name} ${c.terms.join(' ')} ${c.purpose}`.toLowerCase())}" hidden>
      <p class="notes-card__kind">Concept</p>
      <h2 class="rux--type-productive-heading-03">${esc(c.name)}</h2>
      <p>${esc(c.purpose)}</p>
      <dl class="notes-card__facts">${fact('Also called', esc(c.terms.filter((t) => t !== c.name.toLowerCase()).join(', ')))}${fact('Screens', c.sources.map((code) => screenLink(code, esc(cards.get(code)?.name ?? code))).join('<br>'))}</dl>
    </div>`).join('')}
  </div>`;

// ---- the page ----------------------------------------------------------------

const VIEWS = [['do.html', 'Do', doBody], ['understand.html', 'Understand', understandBody], ['lookup.html', 'Look up', lookupBody]];
const nav = (active) => `<ul class="rux--side-nav__items">${VIEWS.map(([file, name]) => `
      <li class="rux--side-nav__item">
        <a class="rux--side-nav__link${file === active ? ' rux--side-nav__link--current' : ''}" href="${file}"${file === active ? ' aria-current="page"' : ''}><span class="rux--side-nav__link-text">${name}</span></a>
      </li>`).join('')}
    </ul>`;

const page = (file, name, body) => `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name} — Notes</title>
<script src="/funnel.js"></script>
<style>html:not([data-rux-unlocked]){visibility:hidden}</style>
<!-- GENERATED by tools/build-views.mjs. The next build overwrites this file,
     and a fix belongs in the generator or in atlas. -->
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-Regular-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="/design/assets/fonts/IBMPlexMono-Regular-Latin1.woff2">
<link rel="stylesheet" href="/design/assets/fonts/plex.css">
<link rel="stylesheet" href="/design/css/rux.css">
<link rel="stylesheet" href="/design/css/rux-theme.css">
<link rel="stylesheet" href="/design/css/rux-overrides.css">
<link rel="stylesheet" href="theme.css">
<link rel="stylesheet" href="overrides.css">
<link rel="stylesheet" href="app.css">
<script src="/design/js/custom-themes.js"></script>
<script src="/design/js/theme.js"></script>
</head>
<body>
<!-- SPRITE:BEGIN -->
<!-- SPRITE:END -->
${shell.replace('{{nav}}', nav(file))}
<main id="main-content" class="rux--content" data-notes-commit="${commit}">
<div class="notes-view">${body()}
</div>
</main>
<script src="/design/js/overlay.js"></script>
<script src="/design/js/accordion.js"></script>
<script src="/design/js/form-controls.js"></script>
<script src="/design/js/ui-shell.js"></script>
<script src="/design/js/dismiss.js"></script>
<script src="/design/js/profile.js"></script>
<script src="/switcher.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js" integrity="sha384-iLddHTLokph6Omwoyid4XKxHaWa6w41BnoEj0q5oOrzmYPpHIKt1wyjReA7s//pP" crossorigin="anonymous"></script>
<script src="/account.js"></script>
<script src="app.js"></script>
</body>
</html>
`;

const written = VIEWS.map(([file, name, body]) => {
  writeFileSync(join(ROOT, file), page(file, name, body));
  return join(ROOT, file);
});
execFileSync(process.execPath, [join(ROOT, '..', 'tools', 'inline-sprite.mjs'), ...written], { stdio: 'ignore' });

if (allSide.length > side.length) report.push(`no steps    ${allSide.length - side.length} of ${allSide.length} side tasks have no written step, so they are not shown`);
if (noCard.length) report.push(`no card     ${noCard.length} of ${noCard.length + cards.size} screens have no purpose line, so Look up cannot show them`);
console.log(`  built ${written.length} views: ${shown.length} scenarios, ${diagram.nodes.length} tiles, ${cards.size} screen cards, ${concepts.length} concept cards`);
console.log(`\n  what the export does not yet say (${new Set(report).size}):`);
for (const line of new Set(report)) console.log(`    ${line}`);
