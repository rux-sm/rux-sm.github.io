#!/usr/bin/env node
// build-views.mjs -- writes Notes' flow, do.html, from data/atlas/: a home
// that asks what the reader is doing, each scenario as a path, each task one
// step at a time, each decision on a screen of its own, the map, and a search
// with the cards it opens. app.js shows the screen the address asks for.
//
// docs/plans/notes-learning-tool.md is what the flow is for. Everything on the
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
  ? `<a class="rux--link" href="do.html?c=${esc(code)}">${text}</a>` : text;

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

// ---- what a task carries besides its steps --------------------------------
// Atlas holds a task's questions in several shapes, and each is read where it
// is: a decision the route passes after the task, a check that feeds it, a turn
// that leaves the task's own tile, the walkthrough's troubleshooting rows for
// the phase, a side task under the tile, a variant that names one of the
// phase's steps, and the next-walkthrough rows, which belong to the last task.

const section = (s, kind) => s.sections.find((x) => x.kind === kind)?.rows ?? [];
const decides = (n) => n.kind === 'decision' || n.kind === 'gate';
const branches = (id) => diagram.edges.filter((e) => e.from === id && e.kind === 'branch');
const firstScreen = (field) => field?.tokens.find((t) => t.t === 'session');
const here = (q) => `do.html?${q}`;
const taskHref = (s, t, k) => here(`s=${esc(s.id)}&amp;t=${t}${k ? `&amp;k=${k}` : ''}`);
const rowsOf = (p) => p.blocks.filter((b) => b.kind === 'steps').flatMap((b) => b.rows);

const sideBody = (n) => `<p>${sentence(tokens(n.does.tokens))}</p>
        <ol class="notes-side">${n.steps.map((x) => x.text.trim() === GAP
    ? `<li class="notes-side__note">${GAP}</li>` : `<li>${tokens(x.tokens)}</li>`).join('')}</ol>`;
const sideUnder = (ids) => side.filter((n) => n.under?.map === MAP && ids.includes(n.under.node));
const opener = (label, field) => {
  const screen = firstScreen(field);
  return screen ? `<p>${label}: ${screenLink(screen.code, esc(screen.name ?? screen.code))}</p>` : '';
};

function extrasOf(s, p) {
  const r = routes.get(s.id);
  const tiles = r.tile.get(p.n) ?? [];
  const asked = [];
  const ask = (id) => {
    const n = node.get(id);
    if (!decides(n) || asked.includes(n)) return;
    asked.push(n);
    for (const e of diagram.edges) if (e.to === id && e.kind === 'feed') ask(e.from);
  };
  const passed = r.after.get(p.n) ?? [];
  for (const id of passed) ask(id);
  for (const id of tiles) for (const e of branches(id)) ask(e.to);
  // A decision the route passes, with ways it can go, is asked on a screen of
  // its own. Every other check is a case to open from the step.
  const forks = asked.filter((n) => passed.includes(n.id) && branches(n.id).length);
  for (const n of forks) if (!firstScreen(n.read)) report.push(`no screen   ${s.title} · ${p.n}: "${n.session}" names no screen to read its answer on`);
  const wrong = section(s, 'troubleshooting').filter((row) => Number(row.cells[0].text) === p.n)
    .map((row) => ({ title: tokens(row.cells[1].tokens), text: row.cells[1].text, body: `<p>${tokens(row.cells[2].tokens)}</p>`, plain: row.cells[2].text }));
  const cases = [
    ...asked.filter((n) => !forks.includes(n)).map((n) => ({ title: esc(n.session),
      body: `<p>${sentence(tokens(n.does.tokens))}</p>${opener('Read it on', n.read)}${opener('Set in', n.setting)}` })),
    ...sideUnder([...tiles, ...asked.map((n) => n.id)]).map((n) => ({ title: esc(n.session), body: sideBody(n) })),
    ...section(s, 'variants').filter((row) => Number(/\b(\d+)\.\d+\b/.exec(row.cells[1].text)?.[1] ?? NaN) === p.n)
      .map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` })),
  ];
  return { forks, wrong, cases };
}
for (const s of scenarios) {
  const n = section(s, 'variants').filter((row) => !/\b\d+\.\d+\b/.test(row.cells[1].text)).length;
  if (n) report.push(`no task     ${s.title}: ${n} variants name no step, so they sit on the scenario's path and not on a task`);
}

// ---- the screens ------------------------------------------------------------

const back = (href, text) => `<a class="rux--link notes-back" href="${href}"><svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--left"/></svg>${text}</a>`;
const list = (items, panel) => items.length ? `
    <ul class="notes-list" data-panel="${panel}" hidden>${items.map((q) => `
      <li><b>${q.title}</b>${q.body}</li>`).join('')}
    </ul>` : '';
const search = (id) => `
    <div class="rux--search rux--layout--size-lg">
      <div class="rux--search-magnifier"><svg class="rux--search-magnifier-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-search"/></svg></div>
      <label class="rux--label" for="${id}">Search</label>
      <input id="${id}" class="rux--search-input" type="text" role="searchbox" placeholder="A task, a screen or a problem" autocomplete="off" data-search>
      <button type="button" class="rux--search-close rux--search-close--hidden" aria-label="Clear" data-clear>
        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-close"/></svg>
      </button>
    </div>`;

const home = () => `
  <section class="notes-screen" data-screen="home">
    <h1 class="notes-ask">What are you doing?</h1>${search('ask')}
    <div class="notes-cards">
      <a class="rux--tile rux--tile--clickable notes-resume" href="do.html" data-resume hidden><span class="notes-quiet">Carry on</span><b></b></a>${scenarios.map((s) => `
      <a class="rux--tile rux--tile--clickable" href="${here(`s=${esc(s.id)}`)}"><b>${esc(s.title)}</b><span class="notes-quiet">${s.phases.length} tasks</span></a>`).join('')}
    </div>
  </section>`;

// A prerequisite arrives as a callout: "> ", the word Prerequisite, " > " and
// then the sentence. The path carries its own label, so only the sentence shows.
const needs = (s) => s.sections.filter((x) => x.kind === 'prose' && /^> Prerequisite >/.test(x.text))
  .map((x) => tokens([{ t: 'text', v: x.tokens[2].v.replace(/^\s*>\s*/, '') }, ...x.tokens.slice(3)]));

// The explanation opens with a label atlas writes for its own page; here the
// paragraph sits behind "Why this task" and needs none.
const why = (p) => p.blocks.filter((b) => b.kind === 'prose')
  .map((b) => `<p>${tokens(b.tokens[0]?.t === 'strong' && /What LN is doing/.test(b.tokens[0].v) ? b.tokens.slice(1) : b.tokens).trim()}</p>`).join('');

// Where Next leads from a task's last step: the first decision the route
// passes, or the next task, or the scenario's end.
const afterTask = (s, i, forks) => forks.length ? here(`s=${esc(s.id)}&amp;t=${s.phases[i].n}&amp;f=${esc(forks[0].id)}`)
  : s.phases[i + 1] ? taskHref(s, s.phases[i + 1].n) : here(`s=${esc(s.id)}&amp;done=1`);

function path(s) {
  const need = needs(s);
  const loose = section(s, 'variants').filter((row) => !/\b\d+\.\d+\b/.test(row.cells[1].text))
    .map((row) => ({ title: tokens(row.cells[0].tokens), body: `<p>${tokens(row.cells[1].tokens)}</p>` }));
  return `
  <section class="notes-screen" data-screen="path" data-s="${esc(s.id)}" hidden>
    ${back('do.html', 'Scenarios')}
    <h1 class="notes-ask">${esc(s.title)}</h1>
    <p class="notes-quiet">${esc(cap(s.summary))}${need.map((n) => `<br>Needs: ${n}`).join('')}</p>
    <ol class="notes-path">${s.phases.map((p) => `
      <li data-t="${p.n}"><a class="notes-path__stop" href="${taskHref(s, p.n)}"><span class="notes-path__dot">${p.n}</span><b>${esc(p.title)}<small>${rowsOf(p).length === 1 ? '1 step' : `${rowsOf(p).length} steps`}</small></b></a></li>${extrasOf(s, p).forks.map((n) => `
      <li data-kind="fork"><a class="notes-path__stop" href="${here(`s=${esc(s.id)}&amp;t=${p.n}&amp;f=${esc(n.id)}`)}"><span class="notes-path__dot"></span><b>${esc(n.session)}</b></a></li>`).join('')}`).join('')}
    </ol>
    <a class="rux--btn rux--btn--primary" href="${taskHref(s, s.phases[0].n)}" data-start>Start</a>${loose.length ? `
    <p><a class="rux--link" href="#main-content" data-open="loose">Different cases</a></p>${list(loose, 'loose')}` : ''}
  </section>`;
}

function task(s, p, i) {
  for (const b of p.blocks) if (b.kind !== 'prose' && b.kind !== 'steps') throw new Error(`no rendering for a "${b.kind}" block in ${s.id} phase ${p.n}`);
  if (p.sessionCode && !cards.has(p.sessionCode)) report.push(`no card     ${s.title} · ${p.n}: ${p.session} (${p.sessionCode}) has no purpose line`);
  const rows = rowsOf(p);
  const { forks, wrong, cases } = extrasOf(s, p);
  const reason = why(p);
  return `
  <section class="notes-screen" data-screen="task" data-s="${esc(s.id)}" data-t="${p.n}" data-title="${esc(p.title)}" data-after="${afterTask(s, i, forks)}" hidden>
    ${back(here(`s=${esc(s.id)}`), esc(s.title))}
    <div class="notes-bar" aria-hidden="true">${rows.map(() => '<i></i>').join('')}</div>
    <p class="notes-quiet" data-where></p>
    <ol class="notes-steps">${rows.map((r, k) => `
      <li data-k="${k + 1}" hidden>
        <h1 class="notes-step__do">${tokens(r.cells[1].tokens)}</h1>${r.cells[2].text.trim() === '\u2014' ? '' : `
        <div class="notes-step__see"><span class="notes-quiet">You should see</span><p>${tokens(r.cells[2].tokens)}</p></div>`}
      </li>`).join('')}
    </ol>${p.route ? `
    <p class="notes-task__route">${screenLink(p.sessionCode, route(p.route))}${p.sessionCode ? `
      <button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm notes-task__code" data-copy="${esc(p.sessionCode)}" aria-label="Copy the code ${esc(p.sessionCode)}">${esc(p.sessionCode)}</button>` : ''}</p>` : ''}
    <div class="notes-step__more">${reason ? `
      <a class="rux--link" href="#main-content" data-open="why">Why this task</a>` : ''}${wrong.length ? `
      <a class="rux--link" href="#main-content" data-open="wrong">Something went wrong</a>` : ''}${cases.length ? `
      <a class="rux--link" href="#main-content" data-open="cases">A different case</a>` : ''}
      <a class="rux--link" href="#main-content" data-listen>Read it to me</a>
    </div>${reason ? `
    <div class="notes-why" data-panel="why" hidden>${reason}</div>` : ''}${list(wrong, 'wrong')}${list(cases, 'cases')}
    <div class="notes-nav">
      <a class="rux--btn rux--btn--secondary" href="do.html" data-prev>Back</a>
      <a class="rux--btn rux--btn--primary" href="do.html" data-next>Next</a>
    </div>
  </section>${forks.map((n, j) => fork(s, p, i, n, forks[j + 1])).join('')}`;
}

// A decision on a screen of its own. The answer that stays on this scenario's
// route is the main button; one that leaves it opens that tile on the map.
function fork(s, p, i, n, nextFork) {
  const r = routes.get(s.id);
  const on = nextFork ? here(`s=${esc(s.id)}&amp;t=${p.n}&amp;f=${esc(nextFork.id)}`)
    : s.phases[i + 1] ? taskHref(s, s.phases[i + 1].n) : here(`s=${esc(s.id)}&amp;done=1`);
  const answers = branches(n.id).map((e) => {
    const stays = r.taskAt(e.to) != null || r.stops.some((x) => x.id === e.to);
    return `<a class="rux--btn ${stays ? 'rux--btn--primary' : 'rux--btn--secondary'}" href="${stays ? on : here(`v=map&amp;s=${esc(s.id)}&amp;n=${esc(e.to)}`)}">${esc(cap(e.label?.text ?? ''))}</a>`;
  });
  const look = (label, field) => {
    const screen = firstScreen(field);
    return screen && cards.has(screen.code) ? `<a class="rux--btn rux--btn--tertiary" href="${here(`c=${esc(screen.code)}`)}">${label} ${esc(screen.name ?? screen.code)}</a>` : '';
  };
  return `
  <section class="notes-screen" data-screen="fork" data-s="${esc(s.id)}" data-t="${p.n}" data-f="${esc(n.id)}" hidden>
    ${back(taskHref(s, p.n, rowsOf(p).length), esc(p.title))}
    <p class="notes-quiet">Before you go on</p>
    <h1 class="notes-ask">${esc(n.session)}</h1>
    <p>${sentence(tokens(n.does.tokens))}</p>
    <div class="notes-choices">${answers.join('')}${look("I'm not sure, open", n.read)}${look('Check or change it in', n.setting)}</div>
  </section>`;
}

const done = (s) => `
  <section class="notes-screen" data-screen="done" data-s="${esc(s.id)}" hidden>
    <h1 class="notes-ask">${esc(s.title)}, done.</h1>${section(s, 'downstream').length ? `
    <ul class="notes-list">${section(s, 'downstream').map((row) => `
      <li><b>${tokens(row.cells[0].tokens)}</b>${tokens(row.cells[1].tokens)}</li>`).join('')}
    </ul>` : ''}
    <div class="notes-choices"><a class="rux--btn rux--btn--primary" href="do.html">Scenarios</a></div>
  </section>`;

// ---- Map: a scenario's route as a path, and the whole grid behind a button --

function detail(n) {
  const opens = scenarios.flatMap((s) => s.phases.filter((p) => routes.get(s.id).tile.get(p.n)?.includes(n.id))
    .map((p) => `<li><a class="rux--link" href="${taskHref(s, p.n)}">${esc(s.title)} · ${p.n} ${esc(p.title)}</a></li>`));
  const turns = branches(n.id).map((e) => `<li><a class="rux--link" href="${here(`v=map&amp;n=${esc(e.to)}`)}" data-node="${esc(e.to)}">${esc(cap(e.label?.text ?? ''))}${ARROW}${esc(node.get(e.to).session)}</a></li>`);
  const cases = sideUnder([n.id]).map((t) => `<li><a class="rux--link" href="${here(`x=${esc(t.id)}`)}">${esc(t.session)}</a></li>`);
  const all = [...turns, ...opens, ...cases];
  return `
    <div class="notes-detail" data-detail="${esc(n.id)}" hidden>
      <h2 class="rux--type-productive-heading-03">${esc(n.session)}</h2>
      <p>${sentence(tokens(n.does.tokens))}</p>${opener('Read it on', n.read)}${opener('Set in', n.setting)}${n.code ? `
      <p class="notes-task__route"><span>${tokens(n.route.tokens)}</span> ${screenLink(n.code, exact(n.code))}</p>` : ''}${all.length ? `
      <ul class="notes-answers">${all.join('')}</ul>` : ''}
    </div>`;
}

const map = () => `
  <section class="notes-screen" data-screen="map" hidden>
    <h1 class="notes-ask">${esc(mapTitle)}</h1>
    <div class="rux--form-item notes-picker">
      <div class="rux--select rux--layout--size-md">
        <label class="rux--label" for="scenario">Scenario</label>
        <div class="rux--select-input__wrapper">
          <select id="scenario" class="rux--select-input">${scenarios.map((s) => `
            <option class="rux--select-option" value="${esc(s.id)}">${esc(s.title)}</option>`).join('')}
          </select>
          <svg class="rux--select__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg>
        </div>
      </div>
    </div>${scenarios.map((s) => `
    <ol class="notes-path" data-route="${esc(s.id)}" hidden>${routes.get(s.id).stops.map((x) => `
      <li${x.tasks.length ? '' : ' data-kind="fork"'}><a class="notes-path__stop" href="${here(`v=map&amp;s=${esc(s.id)}&amp;n=${esc(x.id)}`)}" data-node="${esc(x.id)}"><span class="notes-path__dot">${x.tasks.join(', ')}</span><b>${esc(node.get(x.id).session)}<small>${esc(node.get(x.id).lane)}</small></b></a></li>`).join('')}
    </ol>`).join('')}
    <div class="notes-details">${diagram.nodes.map(detail).join('')}
    </div>
    <div><button type="button" class="rux--btn rux--btn--tertiary" data-whole aria-expanded="false">Show the whole map</button></div>
    <div class="notes-map__scroll" data-grid hidden><div class="notes-map" id="map">
      <div class="notes-map__head"></div>${diagram.stages.map((s) => `<div class="notes-map__head">${s.n} · ${esc(s.name)}</div>`).join('')}${diagram.lanes.map((lane) => `
      <div class="notes-map__lane">${esc(lane.name)}</div>${diagram.stages.map((s) => `
      <div class="notes-map__cell">${diagram.nodes.filter((n) => n.lane === lane.name && n.stage === s.n).map((n) => `
        <button type="button" class="notes-map__tile" data-node="${esc(n.id)}"${n.code ? '' : ' data-screen="no"'}>${esc(n.session)}</button>`).join('')}
      </div>`).join('')}`).join('')}
    </div></div>
    <script type="application/json" id="routes">${JSON.stringify(Object.fromEntries(scenarios.map((s) => {
      const r = routes.get(s.id);
      return [s.id, { stops: r.stops, lines: r.lines }];
    }))).replace(/</g, '\\u003c')}</script>
  </section>`;

// ---- Search, and the cards it opens -----------------------------------------
// Every result is on the page and none shows until the search finds it. A
// problem is found by its symptom, a task by its title and the words of its
// steps, a screen by its name, code, route and purpose.

const usedIn = new Map();
for (const s of scenarios) for (const p of s.phases) {
  const codes = new Set(p.sessionCode ? [p.sessionCode] : []);
  (function walk(x) {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') { if (x.t === 'session') codes.add(x.code); Object.values(x).forEach(walk); }
  })(p.blocks);
  for (const c of codes) (usedIn.get(c) ?? usedIn.set(c, []).get(c)).push(`<a class="rux--link" href="${taskHref(s, p.n)}">${esc(s.title)} · ${p.n} ${esc(p.title)}</a>`);
}
// The title sits in one span, because Carbon's link is a flex box and a space
// between two things inside one collapses.
const hit = (kind, text, href, title, rest) => `
      <li data-text="${esc(text.toLowerCase())}" hidden><span class="notes-quiet">${kind}</span><b><a class="rux--link" href="${href}"><span>${title}</span></a></b>${rest}</li>`;
const results = () => [
  ...scenarios.flatMap((s) => s.phases.flatMap((p) => extrasOf(s, p).wrong.map((q) =>
    hit('Problem', `${q.text} ${q.plain}`, taskHref(s, p.n), q.title, q.body)))),
  ...scenarios.flatMap((s) => s.phases.map((p) =>
    hit('Task', `${s.title} ${p.title} ${p.session ?? ''} ${p.sessionCode ?? ''} ${rowsOf(p).map((r) => r.cells.map((c) => c.text).join(' ')).join(' ')}`,
      taskHref(s, p.n), `${p.n} ${esc(p.title)}`, esc(s.title)))),
  ...side.map((n) => hit('Task', `${n.session} ${n.code ?? ''} ${n.does.text} ${n.steps.map((x) => x.text).join(' ')}`,
    here(`x=${esc(n.id)}`), esc(n.session), sentence(tokens(n.does.tokens)))),
  ...[...cards.values()].map((c) => hit('Screen', `${c.name} ${c.code} ${c.route ?? ''} ${c.purpose}`, here(`c=${esc(c.code)}`), esc(c.name), esc(c.purpose))),
  ...concepts.map((c) => hit('Idea', `${c.name} ${c.terms.join(' ')} ${c.purpose}`, here(`i=${esc(c.id)}`), esc(c.name), esc(c.purpose))),
].join('');

const find = () => `
  <section class="notes-screen" data-screen="search" hidden>
    <h1 class="rux--visually-hidden">Search</h1>${search('find')}
    <ul class="notes-list" id="results">${results()}
    </ul>
  </section>`;

const fact = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
const card = (attr, kind, name, text, facts, extra = '') => `
  <section class="notes-screen" data-screen="card" ${attr} hidden>
    ${back('do.html?v=search', 'Search')}
    <p class="notes-quiet">${kind}</p>
    <h1 class="notes-ask">${name}</h1>
    <p>${text}</p>${extra}${facts ? `
    <dl class="notes-card__facts">${facts}</dl>` : ''}
  </section>`;
const cardsOut = () => [
  ...[...cards.values()].map((c) => card(`data-c="${esc(c.code)}"`, 'Screen', esc(c.name), esc(c.purpose),
    `${fact('Code', `<button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm notes-task__code" data-copy="${esc(c.code)}" aria-label="Copy the code ${esc(c.code)}">${esc(c.code)}</button>`)}${c.route ? fact(c.route.includes(ARROW.trim()) ? 'Route' : 'Reached', c.route.includes(ARROW.trim()) ? route(c.route) : esc(c.route)) : ''}${usedIn.has(c.code) ? fact('Used in', usedIn.get(c.code).join('<br>')) : ''}`)),
  ...concepts.map((c) => card(`data-i="${esc(c.id)}"`, 'Idea', esc(c.name), esc(c.purpose),
    `${fact('Also called', esc(c.terms.filter((t) => t !== c.name.toLowerCase()).join(', ')))}${fact('Screens', c.sources.map((code) => screenLink(code, esc(cards.get(code)?.name ?? code))).join('<br>'))}`)),
  ...side.map((n) => card(`data-x="${esc(n.id)}"`, 'Task', esc(n.session), sentence(tokens(n.does.tokens)), '',
    `<ol class="notes-side">${n.steps.map((x) => x.text.trim() === GAP ? `<li class="notes-side__note">${GAP}</li>` : `<li>${tokens(x.tokens)}</li>`).join('')}</ol>`)),
].join('');

// ---- the page ----------------------------------------------------------------

const TABS = [['do', 'do.html', 'Do'], ['map', 'do.html?v=map', 'Map'], ['search', 'do.html?v=search', 'Search']];
const nav = `<ul class="rux--side-nav__items">${TABS.map(([, href, name]) => `
      <li class="rux--side-nav__item">
        <a class="rux--side-nav__link" href="${href}"><span class="rux--side-nav__link-text">${name}</span></a>
      </li>`).join('')}
    </ul>`;

const page = () => `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Do — Notes</title>
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
${shell.replace('{{nav}}', nav)}
<main id="main-content" class="rux--content" data-notes-commit="${commit}">
<div class="notes-app">${home()}${scenarios.map((s) => path(s) + s.phases.map((p, i) => task(s, p, i)).join('') + done(s)).join('')}${map()}${find()}${cardsOut()}
</div>
<nav class="notes-tabs" aria-label="Notes">${TABS.map(([id, href, name]) => `
  <a href="${href}" data-tab="${id}">${name}</a>`).join('')}
</nav>
</main>
<script src="/design/js/overlay.js"></script>
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

const file = join(ROOT, 'do.html');
writeFileSync(file, page());
execFileSync(process.execPath, [join(ROOT, '..', 'tools', 'inline-sprite.mjs'), file], { stdio: 'ignore' });

const steps = scenarios.reduce((n, s) => n + s.phases.reduce((m, p) => m + rowsOf(p).length, 0), 0);
if (allSide.length > side.length) report.push(`no steps    ${allSide.length - side.length} of ${allSide.length} side tasks have no written step, so they are not shown`);
if (noCard.length) report.push(`no card     ${noCard.length} of ${noCard.length + cards.size} screens have no purpose line, so they have no card`);
console.log(`  built the flow: ${scenarios.length} scenarios, ${steps} steps, ${diagram.nodes.length} map tiles, ${cards.size} screen cards, ${concepts.length} idea cards`);
console.log(`\n  what the export does not yet say (${new Set(report).size}):`);
for (const line of new Set(report)) console.log(`    ${line}`);
