// Runs bar.js and road-bar.js against components-data.js's invented samples,
// and bus-head.js against invented Samsara readings,
// the ones components.html draws, and checks each sample's bar carries the
// classes, marks and words its state should: the colours, stripes, times,
// update ages and crew of the trip bar, the alerts it counts, and each light
// and warning of a bus out on its trip. The rule files they read are loaded
// beside them, in components.html's order, into a stand-in page that builds
// elements and finds them by the selectors the two files use.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/* ── A stand-in page ──────────────────────────────────────────────────────
   Elements with classes, attributes, a dataset kept in those attributes,
   style properties, children and text, found by class and attribute
   selectors joined by spaces and `>`, `:scope` being the element asked. */
const kebab = s => s.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
class Node {
  constructor() { this.childNodes = []; this.parentNode = null; }
  get children() { return this.childNodes.filter(n => n instanceof Element); }
  get childElementCount() { return this.children.length; }
  get firstChild() { return this.childNodes[0] ?? null; }
  get parentElement() { return this.parentNode instanceof Element ? this.parentNode : null; }
  get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
  set textContent(v) { this.replaceChildren(); if (v != null && v !== '') this.appendChild(new Text(String(v))); }
  adopt(n) {
    if (typeof n === 'string') return [new Text(n)];
    if (n instanceof Fragment) { const kids = [...n.childNodes]; n.childNodes = []; return kids; }
    n.parentNode?.removeChild(n);
    return [n];
  }
  insertAt(i, ...nodes) {
    const kids = nodes.flatMap(n => this.adopt(n));
    for (const k of kids) k.parentNode = this;
    this.childNodes.splice(i, 0, ...kids);
  }
  appendChild(n) { this.insertAt(this.childNodes.length, n); return n; }
  append(...nodes) { this.insertAt(this.childNodes.length, ...nodes); }
  prepend(...nodes) { this.insertAt(0, ...nodes); }
  insertBefore(n, ref) { const i = ref ? this.childNodes.indexOf(ref) : -1; this.insertAt(i < 0 ? this.childNodes.length : i, n); return n; }
  removeChild(n) { this.childNodes = this.childNodes.filter(c => c !== n); n.parentNode = null; return n; }
  replaceChildren(...nodes) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; this.append(...nodes); }
  remove() { this.parentNode?.removeChild(this); }
  replaceWith(n) { const p = this.parentNode; if (!p) return; const i = p.childNodes.indexOf(this); p.removeChild(this); p.insertAt(i, n); }
  *walk() { for (const c of this.children) { yield c; yield* c.walk(); } }
  querySelectorAll(sel) { return [...this.walk()].filter(e => matches(e, parse(sel), this)); }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
}
class Text extends Node { constructor(t) { super(); this.text = t; } get textContent() { return this.text; } }
class Fragment extends Node {}
class Element extends Node {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.classList = {
      add: (...c) => this.setClasses([...this.classes(), ...c]),
      remove: (...c) => this.setClasses(this.classes().filter(x => !c.includes(x))),
      contains: c => this.classes().includes(c),
      toggle: (c, on = !this.classList.contains(c)) => { (on ? this.classList.add : this.classList.remove)(c); return on; },
    };
    const props = new Map();
    this.style = new Proxy({
      setProperty: (k, v) => props.set(k, String(v)), removeProperty: k => props.delete(k),
      getPropertyValue: k => props.get(k) ?? '',
    }, {
      get: (t, k) => (k in t ? t[k] : props.get(kebab(String(k))) ?? ''),
      set: (t, k, v) => { props.set(kebab(String(k)), v); return true; },
    });
    this.dataset = new Proxy({}, {
      get: (_, k) => this.attributes.get(`data-${kebab(String(k))}`),
      set: (_, k, v) => { this.attributes.set(`data-${kebab(String(k))}`, String(v)); return true; },
      deleteProperty: (_, k) => { this.attributes.delete(`data-${kebab(String(k))}`); return true; },
      has: (_, k) => this.attributes.has(`data-${kebab(String(k))}`),
    });
  }
  classes() { return (this.attributes.get('class') ?? '').split(/\s+/).filter(Boolean); }
  setClasses(list) { this.attributes.set('class', [...new Set(list)].join(' ')); }
  get className() { return this.attributes.get('class') ?? ''; }
  set className(v) { this.attributes.set('class', String(v)); }
  get title() { return this.attributes.get('title') ?? ''; }
  set title(v) { this.attributes.set('title', String(v)); }
  set tabIndex(v) { this.attributes.set('tabindex', String(v)); }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  hasAttribute(k) { return this.attributes.has(k); }
  removeAttribute(k) { this.attributes.delete(k); }
  toggleAttribute(k, on = !this.attributes.has(k)) { if (on) this.attributes.set(k, ''); else this.attributes.delete(k); return on; }
}
// A selector as steps, each a compound and the combinator before it.
const parse = sel => {
  const steps = [];
  let comb = ' ';
  for (const tok of sel.trim().split(/\s*(>)\s*|\s+/).filter(Boolean)) {
    if (tok === '>') { comb = '>'; continue; }
    steps.push({ comb, scope: tok === ':scope', tag: tok.match(/^[a-z]+/)?.[0].toUpperCase(), classes: [...tok.matchAll(/\.([\w-]+)/g)].map(m => m[1]),
      attrs: [...tok.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map(m => [m[1], m[2]]) });
    comb = ' ';
  }
  return steps;
};
const fits = (e, s, scope) => (s.scope ? e === scope
  : (!s.tag || e.tagName === s.tag) && s.classes.every(c => e.classList.contains(c)) && s.attrs.every(([k, v]) => e.hasAttribute(k) && (v == null || e.getAttribute(k) === v)));
function matches(e, steps, scope, i = steps.length - 1) {
  if (!e || !fits(e, steps[i], scope)) return false;
  if (i === 0) return steps[0].scope || true;
  if (steps[i].comb === '>') return matches(e.parentElement ?? (e.parentNode === scope ? scope : null), steps, scope, i - 1);
  for (let p = e.parentElement ?? (e.parentNode === scope ? scope : null); p; p = p.parentElement) if (matches(p, steps, scope, i - 1)) return true;
  return false;
}
const document = {
  createElement: tag => new Element(tag),
  createElementNS: (_, tag) => new Element(tag),
  createDocumentFragment: () => new Fragment(),
};

/* ── The page's scripts ─────────────────────────────────────────────────── */
const window = {};
const context = { window, document, Intl, Date, Math, Number, String, Map, Set, Array, Object, JSON, Promise, WeakMap, RegExp,
  setTimeout: () => 0, console };
for (const file of ['requirements.js', 'trip-shape.js', 'leg-facts.js', 'phone.js', 'billing.js', 'follow-up.js', 'past-midnight.js', 'week.js', 'road.js', 'live-trip.js',
  'share/driver-words.js', 'driver-job.js', 'clashes.js', 'close-out.js', 'bar.js', 'road-bar.js', 'bus-head.js', 'components-data.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const { SchedulerBar: Bar, SchedulerRoadBar: RoadBar, SchedulerBusHead: BusHead, SchedulerLiveTrip: Live, SchedulerWeek: Week } = window;
const data = window.SchedulerComponentsData.build();

// Each sample's bars drawn as components.js draws them.
const factsByBar = new WeakMap();
function drawn(sectionId, name) {
  const sample = data.sections.find(s => s.id === sectionId)?.samples.find(s => s.name === name);
  if (!sample) throw new Error(`no sample ${sectionId} / ${name}`);
  return sample.rows.flatMap(r => r.bars).map(spec => {
    const leg = Week.legsOf(spec.trip).find(l => l.leg === spec.leg);
    const assigns = spec.trip.trip_assignments.filter(a => (a.leg || 'outbound') === spec.leg);
    const b = { trip: spec.trip, leg, slot: spec.slot, lane: 0, assign: 'assign' in spec ? spec.assign : assigns[spec.slot] ?? null,
      place: { start: spec.start, span: spec.span, fromPrev: !!spec.fromPrev, toNext: !!spec.toNext } };
    const { bar, facts } = Bar.draw(b, { ...data, saving: () => !!spec.state?.saving });
    factsByBar.set(bar, facts);
    if (spec.live) {
      const { bus, look, before } = spec.live;
      const said = l => ({ warnings: Live.warningsOf(l), phase: Live.phaseOf(l) });
      if (before) RoadBar.draw(bar, before, { next: look.next, said: said({ ...look, bus: before }), at: look.now });
      RoadBar.draw(bar, bus, { next: look.next, said: said(look), at: look.now, day: look.day });
    }
    return bar;
  });
}
const has = (bar, sel) => !!bar.querySelector(sel);
const text = (bar, sel) => bar.querySelector(sel)?.textContent ?? null;
// The warning sign a bar wears for a problem, its colour and its words; a clock is not one.
const mark = bar => { const m = bar.querySelector('.scheduler-bar__alert'); return m ? `${m.classList.contains('scheduler-bar__msg--error') ? 'red' : 'amber'} ${m.title}` : null; };
const hue = bar => bar.classes().find(c => /^scheduler-bar--(blue|red|teal|green|purple|magenta|amber)$/.test(c))?.slice(15);

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

console.log('\n  The trip bar');
expect('each colour paints its hue, with no alert', drawn('trip-bar', 'Colours').map(b => [hue(b), mark(b)]),
  [['blue', null], ['red', null], ['teal', null], ['green', null], ['purple', null], ['magenta', null], ['amber', null]]);
const [holder] = drawn('trip-bar', 'A placeholder');
expect('a placeholder: no times, the named driver, no empty seat, no alert',
  [text(holder, '.scheduler-bar__time > span'), [...holder.querySelectorAll('.scheduler-crew__name')].map(n => n.textContent), mark(holder)],
  ['No times', ['Ben'], null]);
const kindOf = b => { const k = b.querySelector('.scheduler-bar__dest > .scheduler-bar__kind'); return k ? [k.querySelector('use')?.getAttribute('href') ?? null, text(k, '.scheduler-bar__kind-word')] : null; };
expect('one way wears its arrow after the destination', drawn('trip-bar', 'One way').map(kindOf), [['#m-arrow_forward', 'One way']]);
expect('a split\'s drop-off points down and its pickup up; a round trip wears none',
  [...drawn('trip-bar', 'Drop-off and pickup'), ...drawn('trip-bar', 'Colours').slice(0, 1)].map(kindOf),
  [['#m-download', 'Drop-off'], ['#m-upload', 'Pickup'], null]);
expect('three buses: counted, and the third needs a bus',
  drawn('trip-bar', 'More than one bus').map(b => [text(b, '.scheduler-bar__count'), text(b, '.scheduler-bar__crew')]),
  [['×3', 'Marco'], ['×3', 'Lena'], ['×3', 'Needs a bus']]);
// The samples are dated from today, so the weekdays are whichever they fall on.
expect('a leg crossing the week\'s edge names both its days, with no +1',
  drawn('trip-bar', 'Either side of the week').map(b => /^[A-Z][a-z]{2} \d{1,2}:\d\d[ap]\s\u2013\s[A-Z][a-z]{2} \d{1,2}:\d\d[ap]$/.test(text(b, '.scheduler-bar__time > span'))
    || text(b, '.scheduler-bar__time > span')),
  [true, true]);
expect('either side of the week', drawn('trip-bar', 'Either side of the week').map(b => [b.classList.contains('scheduler-bar--from-prev'), b.classList.contains('scheduler-bar--to-next')]),
  [[true, false], [false, true]]);
const [back] = drawn('trip-bar', 'Back at the yard');
expect('a trip back stays put and raises no alert, though its record lacks miles and pay', [back.classList.contains('scheduler-bar--back'), mark(back)],
  [true, null]);
expect('a trip back says Paid in the alert badge\'s place once paid in full, and nothing when it is not',
  drawn('trip-bar', 'Back at the yard').map(b => [text(b, '.scheduler-bar__dest .scheduler-bar__paid'), has(b, '.scheduler-bar__alert')]),
  [['', false], ['Paid', false], ['', false], ['Paid', false]].map(([p, a]) => [p || null, a]));
expect('a trip back keeps the regular update row and carries no driver status icon',
  drawn('trip-bar', 'Back at the yard').map(b => [has(b, '.scheduler-bar__update > .scheduler-bar__age'), has(b, '.scheduler-bar__complete'), b.querySelectorAll('.scheduler-crew__mark use').length]),
  [[true, false, 0], [true, false, 0], [true, false, 0], [true, false, 0]]);
expect('the times row', drawn('trip-bar', 'Times').map(b => text(b, '.scheduler-bar__time > span')),
  ['7:30a\u2009\u2013\u20096:00p', '2:10p\u2009\u2013\u200912:30a+1', 'Dep 7:30a', 'Ret 6:00p', 'No times']);
expect('update age stays neutral regardless of open work',
  drawn('trip-bar', 'Update ages').map(b => b.querySelector('.scheduler-bar__update').classes().find(c => c.startsWith('scheduler-bar__update--')) ?? null),
  [null, null, null, null]);
expect('a leg with no bus says so', drawn('trip-bar', 'Needs a bus').map(b => text(b, '.scheduler-bar__crew')), ['Needs a bus']);

console.log('\n  The crew');
// The href of the symbol a mark draws: its svg's one <use>.
const useOf = m => m ? [...m.walk()].find(n => n.tagName === 'USE')?.getAttribute('href') ?? null : null;
const icon = c => useOf(c.querySelector('.scheduler-crew__mark'));
expect('each driver state uses its Carbon icon and tone',
  drawn('crew', 'Each status').map(b => { const c = b.querySelector('.scheduler-crew'); return [c.querySelector('.scheduler-crew__mark').classes().find(x => /--(off|error|major|warning|success)$/.test(x))?.split('--')[1], icon(c), c.classList.contains('scheduler-crew--declined')]; }),
  [['off', '#i-circle-dash', false], ['major', '#i-warning--alt-inverted--filled', false], ['off', '#i-pending--filled', false],
    ['success', '#i-checkmark--outline', false], ['success', '#i-checkmark--outline', false], ['error', '#i-error--filled', true]]);
const [relief] = drawn('crew', 'Co-driver and relief');
expect('drivers wear their status and relief drivers arrows',
  [...relief.querySelectorAll('.scheduler-crew')].map(c => [c.dataset.seat, icon(c) === '#m-swap_horiz-fill']),
  [['driver', false], ['co-driver', false], ['relief-start', true], ['relief-end', true]]);
expect('an empty seat is in the warning colour only while the leg is due',
  drawn('crew', 'Empty seats').map(b => [...b.querySelectorAll('.scheduler-crew')].filter(c => c.querySelector('.scheduler-bar__none')).map(c => c.classList.contains('scheduler-crew--due'))),
  [[true, true], [false, false]]);

expect('staffing warning includes day fourteen, excludes day fifteen and ended legs',
  [0, 14, 15, -1].map(days => {
    const now = new Date(2026, 9, 27, 12);
    const day = new Date(2026, 9, 27 + days);
    const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    return Bar.staffingDue({from:date,to:date}, now);
  }), [true,true,false,false]);
const emptyDriver = {needed:true,role:'driver',label:'Driver'};
expect('empty seats show Caution major only when due',
  [true,false].map(due => icon(Bar.crewEl(emptyDriver,due,false))),
  ['#i-warning--alt-inverted--filled',null]);
const declinedDriver = {role:'driver',label:'Driver',who:{name:'Alex'},status:window.SchedulerLegFacts.DRIVER_STATUSES.find(s=>s.value==='declined')};
expect('a recorded return cannot erase a decline', icon(Bar.crewEl(declinedDriver,true,true)), '#i-error--filled');

console.log('\n  Alerts');
const alerts = ['A hotel to book', 'No one to call on the day', 'More passengers than seats', 'A driver said no', 'A driver to tell',
  'Hours of service', 'The wrong type of bus', 'A bus short of a need', 'Both'];
// The samples leave today, so a missing trip contact is near enough to warn of.
expect('a problem wears the alert badge in its colour, a contact missing near the day too, other paperwork none', alerts.map(n => mark(drawn('alerts', n)[0])), [
  null, 'amber Trip contact missing', 'amber More passengers than seats: 52 passengers and 49 seats',
  'amber Rosa declined', 'amber Tell Ben: Stops changed', null, 'red Coach needed', 'red Sleeper needed',
  'red Sleeper needed · Trip contact missing']);
expect('the alert badge ends the destination row', alerts.filter(n => mark(drawn('alerts', n)[0])).map(n => drawn('alerts', n)[0].querySelector('.scheduler-bar__dest').children.at(-1)?.classList.contains('scheduler-bar__alert')),
  alerts.filter(n => mark(drawn('alerts', n)[0])).map(() => true));
expect('every update row is a button, including a settled trip, and the age has no clock',
  drawn('trip-bar', 'Update ages').map(b => {
    const row = b.querySelector('.scheduler-bar__update');
    return [row.tagName, row.hasAttribute('data-card-opener'), row.getAttribute('aria-expanded'), b.querySelector('.scheduler-bar__age use') === null];
  }),
  Array.from({ length: 4 }, () => ['BUTTON', true, 'false', true]));
expect('empty updates remain a visible Updates entry point',
  [holder.querySelector('.scheduler-bar__update').tagName, text(holder, '.scheduler-bar__age')], ['BUTTON', 'No updates']);
expect('alert buttons expose their purpose and expansion state',
  alerts.filter(n => mark(drawn('alerts', n)[0])).map(n => {
    const badge = drawn('alerts', n)[0].querySelector('.scheduler-bar__alert');
    return [badge.tagName, badge.getAttribute('aria-label').startsWith('Alerts:'), badge.getAttribute('aria-expanded')];
  }), Array.from({ length: 7 }, () => ['BUTTON', true, 'false']));
expect('same section toggles closed, another switches, and closed cards open',
  [Bar.opensSection(true, 'needs', 'needs'), Bar.opensSection(true, 'needs', 'updates'), Bar.opensSection(false, 'updates', 'updates')],
  [false, true, true]);
expect('trip groups do not swallow their child button semantics',
  [holder.getAttribute('role'), holder.getAttribute('aria-current')], ['group', 'false']);
expect('the badge is the icon alone, its tooltip the exact problem list',
  alerts.map(n => {
    const badge = drawn('alerts', n)[0].querySelector('.scheduler-bar__alert');
    return badge ? [badge.textContent, badge.title] : ['', ''];
  }), alerts.map(n => {
    const problems = factsByBar.get(drawn('alerts', n)[0]).problems;
    return ['', problems.map(a=>a.words).join(' · ')];
  }));

// Exercise the actual card builder with specimen trips and a minimal page.
const dataSource = readFileSync(new URL('../data.js', import.meta.url), 'utf8');
const cardSource = dataSource.slice(dataSource.indexOf('  function drawCard('), dataSource.indexOf('  /* Whether the card\'s updates have more'));
const make = (tag, cls, value) => { const n = new Element(tag); if (cls) n.className = cls; if (value != null) n.textContent = value; return n; };
const cardContext = {
  ...context, el: make, barFacts: factsByBar, alertsOf: Bar.alertsOf,
  pageEl: { getAttribute: () => 'full' }, dueFollowUp: () => false,
  updatesOf: window.SchedulerFollowUp.updatesOf, updatesOpenFor: null, quickOpenFor: null,
  quickDraft: { tripId: null, text: '' },
  svgUse: () => make('svg'), updateFace: () => make('span'), ageShort: () => '1d', updateStamp: Bar.updateStamp,
  cardAction: () => make('button'),
  cardClose: () => make('button'),
  cardTitle: (name, count) => make('div', 'test-title', `${name}: ${count}`),
};
runInNewContext(cardSource + '\nglobalThis.testDrawCard = drawCard;', cardContext);
const specimen = (section, name) => data.sections.find(s=>s.id===section).samples.find(s=>s.name===name).rows[0].bars[0].trip;
const [needsBar] = drawn('alerts', 'Both');
const needsCard = cardContext.testDrawCard(specimen('alerts','Both'), needsBar, 'needs');
expect('the card leads with the exact badge count and lists broader needs separately',
  needsCard.querySelector('.test-title')?.textContent, `Alerts: ${factsByBar.get(needsBar).problems.length}`);
const [paperBar] = drawn('alerts','A hotel to book');
const paperCard = cardContext.testDrawCard(specimen('alerts','A hotel to book'), paperBar,'needs');
expect('paperwork does not turn into a counted operational alert in the card', paperCard.querySelector('.test-title')?.textContent, 'Other needs: 1');
expect('Needs does not draw a second Updates editor', paperCard.querySelector('.scheduler-card__updates'), null);

const tabsSource = dataSource.slice(dataSource.indexOf('  function drawRoadCard('), dataSource.indexOf('  function drawCard('));
cardContext.roadTabOf = () => 'needs';
cardContext.drawLiveCard = () => make('div');
runInNewContext(tabsSource + '\nglobalThis.testDrawRoadCard = drawRoadCard;', cardContext);
const tripWithPaperwork = specimen('alerts','A hotel to book');
const tabsCard = cardContext.testDrawRoadCard(tripWithPaperwork, paperBar);
expect('live cards keep three reachable sections and select the requested one',
  tabsCard.querySelectorAll('[role="tab"]').map(t=>[t.dataset.roadTab,t.getAttribute('aria-selected')]),
  [['road','false'],['needs','true'],['updates','false']]);
cardContext.quickOpenFor = tripWithPaperwork.id;
cardContext.quickDraft = { tripId: tripWithPaperwork.id, text: 'Draft still being written' };
cardContext.markSave = () => {};
const draftCards = [cardContext.testDrawRoadCard(tripWithPaperwork, paperBar), cardContext.testDrawRoadCard(tripWithPaperwork, paperBar)];
expect('live-card redraws keep one Updates input and preserve the draft',
  draftCards.map(c=>c.querySelectorAll('.scheduler-card__quick input').map(n=>n.value)),
  [['Draft still being written'],['Draft still being written']]);

expect('a bar being saved says so', drawn('handled', 'Saving').map(b => b.classList.contains('scheduler-bar--saving')), [true]);

console.log('\n  Out on the road');
const lit = n => drawn('road', n)[0];
expect('each light', ['At highway speed', 'At a crawl', 'Idling', 'Resting', 'Engine off', 'No signal'].map(n => lit(n).dataset.light),
  ['run', 'run', 'idle', 'idle', 'off', 'scan']);
const row = b => b.querySelector('.scheduler-road__times');
const say = b => { const x = row(b).querySelector(':scope > .scheduler-road__say'); return x ? [x.classes().find(c => c.startsWith('scheduler-road__say--'))?.slice(21), x.textContent] : null; };
expect('the times follow the time row they stand in for, before the update and the drivers',
  lit('At highway speed').children.map(c => c.classes().find(x => /__(dest|client|contact|time|update|drivers)$|road__times$/.test(x))).filter(Boolean),
  ['scheduler-bar__dest', 'scheduler-bar__client', 'scheduler-bar__contact', 'scheduler-bar__time', 'scheduler-road__times', 'scheduler-bar__update', 'scheduler-bar__drivers']);
expect('the times: out and back either end of a track filled as far as the trip has gone',
  [row(lit('At highway speed')).querySelectorAll('.scheduler-road__when').length, /^\d+(\.\d)?%$/.test(row(lit('At highway speed')).querySelector('.scheduler-road__track')?.style.getPropertyValue('--scheduler-done') ?? '')],
  [2, true]);
expect('late back: the expected return in amber in place of the plan, or how long past it',
  [[...row(lit('Late back to the yard')).querySelectorAll('.scheduler-road__when')].map(w => w.classList.contains('scheduler-road__when--late')),
    // 45 minutes over when drawn, or 46 when the draw falls into the next minute.
    /^\+4[56]m$/.test(text(row(lit('Past its return')), '.scheduler-road__over') ?? ''), has(row(lit('At highway speed')), '.scheduler-road__over')],
  [[false, true], true, false]);
expect('the bar carries no speed or fuel: those are the bus column\'s',
  ['.scheduler-road__card', '.scheduler-road__big', '.scheduler-road__pct'].map(q => has(lit('At highway speed'), q)), [false, false, false]);
expect('the bus icon marks an active trip, wordless, its label following the bus, including stops and unknown readings',
  ['At highway speed', 'Idling', 'Engine off', 'Stopped', 'Resting', 'No signal'].map(n => {
    const pill = lit(n).querySelector('.scheduler-bar__dest > .scheduler-road__dot');
    return [pill.textContent.trim(), useOf(pill.querySelector('.scheduler-road__route')),
      pill.title.split(' · ')[1].split(' for ')[0], pill.getAttribute('aria-label').startsWith(`${pill.title}. `) && pill.hasAttribute('data-card-opener')];
  }), ['Moving', 'Idling', 'Engine off', 'Engine on', 'Idling', 'Unknown'].map(s => ['', '#m-directions_bus-fill', s, true]));
expect('where the bus is goes on the times row\'s tooltip', row(lit('At highway speed')).title.includes('I-37 N near Three Rivers'), true);
expect('each warning its name in its colour in place of the times',
  ['Stop lamp', 'Not rolling', 'Wrong bus', 'Late to spot', 'Short on hours'].map(n => say(lit(n))), [
    ['error', 'Stop lamp'], ['error', 'Not rolling'], ['error', 'Wrong bus'],
    ['warning', 'Late to spot'], ['warning', 'Short on hours']]);
expect('an engine warning lamp is said on the tooltip only',
  [say(lit('Engine warning lamp')), row(lit('Engine warning lamp')).title.includes('Engine warning lamp on')], [null, true]);
expect('a red warning blinks for its first minute', lit('Not rolling').hasAttribute('data-alarm'), true);
const wrong = lit('Wrong bus').querySelector('.scheduler-crew');
expect('wrong bus: the driver marked red, with the other bus', [wrong.dataset.duty, text(wrong, '.scheduler-crew__away')], ['away', 'in 119']);
expect('under an hour left, the bar and the hours are amber',
  [has(lit('Short on hours'), '.scheduler-crew__left--low'), text(lit('Short on hours'), '.scheduler-crew__hours--low')], [true, '0:50 left']);
expect('every driver wears their duty, the one at the wheel the steering wheel',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => useOf(c.querySelector('.scheduler-crew__duty'))),
  ['#i-BPMN-link--fill', '#i-asleep--filled']);
expect('two drivers: both in the row, the one at the wheel bold',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => [c.dataset.duty, c.classList.contains('scheduler-crew--wheel')]),
  [['driving', true], ['sleeper', false]]);
expect('driver rest is no problem of the bus\'s', say(lit('Resting')), null);
expect('no signal: how long since in place of the times', say(lit('No signal')), ['quiet', 'No signal 25m']);
expect('a driver Samsara has in the bus reads confirmed whatever they answered',
  [lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark').classes().find(c => /--(off|warning|error|success)$/.test(c)), icon(lit('In the bus, not yet confirmed').querySelector('.scheduler-crew'))],
  ['scheduler-crew__mark--success', '#i-checkmark--outline']);
expect('a live-confirmed driver uses the success style as well as the success icon',
  lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark svg').getAttribute('class'),
  'rux--icon-indicator--succeeded');
expect('a driver the bar does not name joins the drivers row with their own duty icon',
  [text(lit('Someone else at the wheel'), '.scheduler-road__who > .scheduler-crew__name'),
    has(lit('Someone else at the wheel'), '.scheduler-road__who .scheduler-crew__duty use[href="#i-BPMN-link--fill"]')], ['Omar D.', true]);
expect('a longer bar out stands its rows in today\'s column, and a one-day one on its own',
  [lit('On its second day').style.getPropertyValue('--scheduler-today'), lit('At highway speed').style.getPropertyValue('--scheduler-today')], ['1', '']);
expect('a bus no longer out takes its dot, times and instruments off', (() => { const b = lit('At highway speed'); RoadBar.draw(b, null); return [has(b, '.scheduler-road__dot'), has(b, '.scheduler-road__card'), has(b, '.scheduler-road__times'), has(b, '.scheduler-crew__left')]; })(), [false, false, false, false]);

expect('rest elapsed does not assert a reset of the HOS clocks',
  RoadBar.restWords({ duty: 'sleeper', rest_since: new Date(Date.now() - 3 * RoadBar.HOUR).toISOString() }), 'Rested 3h 00m');
expect('movement can be reported without an engine reading', RoadBar.vehicleState({ mph: 20, engine: null }), 'moving');

const REST_AT = Date.parse('2026-10-28T20:00:00Z');
const restDriver = elapsed => ({ duty: 'sleeper', rest_since: new Date(REST_AT - elapsed).toISOString() });
expect('rest fills toward eight hours and stays full beyond the reference',
  [0, 3.25, 8, 10].map(h => RoadBar.restMeter(restDriver(h * RoadBar.HOUR), REST_AT).style.getPropertyValue('--scheduler-rest')),
  ['0%', '40.6%', '100%', '100%']);
expect('missing, invalid, future or non-rest duty has unknown rest, rather than zero',
  [{ duty: 'sleeper' }, { duty: 'off', rest_since: 'invalid' }, restDriver(-RoadBar.HOUR),
    { ...restDriver(RoadBar.HOUR), duty: 'on' }].map(d => RoadBar.restElapsed(d, REST_AT)), [null, null, null, null]);
expect('missing logs never expose a made-up numeric rest value',
  [has(lit('Rest duration unknown'), '.scheduler-crew__rest--unknown'), text(lit('Rest duration unknown'), '.scheduler-crew__rest-time'),
    lit('Rest duration unknown').querySelector('.scheduler-crew__rest').getAttribute('aria-valuenow')], [true, 'Rest —', null]);
expect('two drivers have independently scaled availability and rest tracks',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => [c.querySelector('.scheduler-crew__left').style.getPropertyValue('--scheduler-left'),
    c.querySelector('.scheduler-crew__rest')?.style.getPropertyValue('--scheduler-rest') ?? null]), [['8%', null], ['90%', '40.6%']]);
expect('rest reaching its reference does not change the reported availability',
  ['Rest at eight hours', 'Rest beyond eight hours'].map(n => [lit(n).querySelector('.scheduler-crew__left').style.getPropertyValue('--scheduler-left'),
    text(lit(n), '.scheduler-crew__hours'), lit(n).querySelector('.scheduler-crew__rest').style.getPropertyValue('--scheduler-rest')]),
  [['40%', '4:00 left', '100%'], ['40%', '4:00 left', '100%']]);
expect('rest progress advances on a new minute even without changed telemetry', (() => {
  const sample = data.sections.find(s => s.id === 'icons').samples.find(s => s.name === 'Sleeper icon');
  const spec = sample.rows[0].bars[0];
  const b = drawn('icons', 'Sleeper icon')[0];
  const before = text(b, '.scheduler-crew__rest-time');
  const now = Date.now();
  const original = Date.now;
  try {
    Date.now = () => now + 61e3;
    RoadBar.draw(b, spec.live.bus, { next: spec.live.look.next, said: { warnings: [], phase: null }, day: 0 });
    return [before, text(b, '.scheduler-crew__rest-time')];
  } finally { Date.now = original; }
})(), ['Rest 3:15', 'Rest 3:16']);
expect('taking live readings off also removes rest tracks and labels', (() => {
  const b = lit('Two drivers'); RoadBar.draw(b, null); return [has(b, '.scheduler-crew__rest'), has(b, '.scheduler-crew__rest-time')];
})(), [false, false]);

expect('the board and components pages embed every duty drawing they render',
  ['index.html', 'components.html'].map(page => {
    const html = readFileSync(new URL(`../${page}`, import.meta.url), 'utf8');
    return [...new Set(Object.values(RoadBar.DUTY).map(d => d.icon.slice(1)))].filter(id => !html.includes(`id="${id}"`));
  }), [[], []]);

console.log('\n  Icons and pills');
expect('every status icon has a labeled specimen', window.SchedulerLegFacts.DRIVER_STATUSES.map(({ label, icon: href }) =>
  drawn('icons', `${label} icon`).some(b => has(b, `.scheduler-crew use[href="${href}"]`))),
  window.SchedulerLegFacts.DRIVER_STATUSES.map(() => true));
expect('every duty icon is visible on its own specimen', Object.entries(RoadBar.DUTY).map(([duty, { word, icon: href }]) => {
  const [b] = drawn('icons', `${word} icon`);
  return b.querySelector('.scheduler-crew').dataset.duty === duty && has(b, `.scheduler-crew__duty use[href="${href}"]`);
}), Object.keys(RoadBar.DUTY).map(() => true));
expect('every state the bus icon says has a specimen',
  ['At highway speed', 'Idling', 'Engine off', 'Stopped', 'No signal']
    .map(name => RoadBar.vehicleState(data.sections.find(s => s.id === 'icons').samples.find(s => s.name === name).rows[0].bars[0].live.bus)),
  ['moving', 'idle', 'off', 'on', 'unknown']);
expect('relief specimens expose the role icon without crew overflow', window.SchedulerLegFacts.ROLES.filter(r => r.role.startsWith('relief-')).map(({ label, icon: href }) => {
  const [b] = drawn('icons', `${label} icon`);
  return has(b, `.scheduler-crew__mark use[href="${href}"]`) && !has(b, '.scheduler-bar__more');
}), [true, true]);

console.log('\n  The bus column');
/* A head as data.js makes one, its number in the top row, drawn with a bus
   of samsara-now's answer. */
const busHead = (live, week = true, bus = { id: 'b1', capacity: 52 }) => {
  const head = document.createElement('div');
  head.className = 'scheduler-row-head';
  const top = document.createElement('div');
  top.className = 'scheduler-row-head__top';
  head.appendChild(top);
  BusHead.draw(head, bus, live && { bus_id: 'b1', drivers: [], fault: null, faults: [], seen: new Date().toISOString(), ...live }, { week });
  return head;
};
const levels = h => h.querySelectorAll('.scheduler-row-head__level').map(g => [g.dataset.tank, g.dataset.level]);
const marks = h => h.querySelectorAll('.scheduler-row-head__mark').map(m => m.classes().find(c => /__mark--/.test(c)).split('--')[1]);
const line = h => text(h, '.scheduler-row-head__line');
const dial = h => [text(h, '.scheduler-row-head__speed'), h.querySelector('.scheduler-row-head__dial').classes().find(c => /__dial--/.test(c)).split('--')[1], has(h, '.scheduler-row-head__dial--running')];
const ago = min => new Date(Date.now() - min * 60e3).toISOString();
expect('moving: the speed over mph in a filled green display, the fuel alone while DEF is normal, no line under them, no marks',
  (() => { const h = busHead({ engine: 'on', mph: 64, fuel: 72, def: 60, place: '625 Gregsons Bend, San Marcos, TX, 78666' }); return [dial(h), levels(h), text(h, '.scheduler-row-head__pct'), line(h), marks(h)]; })(),
  [['64mph', 'moving', true], [['F', 'normal']], '72%', null, []]);
expect('fuel is low at 25% and critical at 10%; DEF is drawn only while low, at 15%, and critical at 5%',
  [[25, 15], [10, 5], [26, 16]].map(([fuel, def]) => levels(busHead({ engine: 'off', mph: 0, fuel, def, place: 'McAllen, TX, 78504' }))),
  [[['F', 'low'], ['D', 'low']], [['F', 'critical'], ['D', 'critical']], [['F', 'normal']]]);
expect('a bus that reports no DEF draws the fuel alone', levels(busHead({ engine: 'off', mph: 0, fuel: 50, def: null })), [['F', 'normal']]);
expect('over 75 mph the display turns amber', dial(busHead({ engine: 'on', mph: 79, fuel: 50 })), ['79mph', 'warning', true]);
expect('standing: Idle over how long in a filled display, amber past 30 minutes, or Off unfilled; the place left to the tip',
  [[busHead({ engine: 'idle', engine_at: ago(14), mph: 0, fuel: 50, place: 'Laredo, TX' })], [busHead({ engine: 'idle', engine_at: ago(45), mph: 0, fuel: 50, place: 'Laredo, TX' })], [busHead({ engine: 'off', mph: 0, fuel: 50, place: 'McAllen, TX, 78504' })]]
    .map(([h]) => [...dial(h), line(h)]),
  [['Idle14m', 'quiet', true, null], ['Idle45m', 'warning', true, null], ['Off', 'quiet', false, null]]);
expect('the engine lamp is the tip\'s alone: the head draws no mark for it',
  [marks(busHead({ engine: 'on', mph: 40, fuel: 50, fault: 'check' })), marks(busHead({ engine: 'on', mph: 40, fuel: 50, fault: 'stop' })), marks(busHead({ engine: 'on', mph: 40, fuel: 50 }))],
  [[], [], []]);
expect('no signal: a dash over how long since it was seen, the gauges faded, and that said on the title',
  (() => { const h = busHead({ engine: null, mph: null, fuel: 55, place: null, seen: ago(180) }); return [text(h, '.scheduler-row-head__speed'), h.hasAttribute('data-signal-lost'), h.querySelector('.scheduler-row-head__dial').title]; })(),
  ['–3h', true, 'No signal, last seen 3h ago']);
expect('a bus with its engine running fills the display, moving or idling; one off, or with no signal, is its words alone',
  [{ engine: 'on', mph: 40, fuel: 50 }, { engine: 'idle', engine_at: ago(5), mph: 0, fuel: 50 }, { engine: 'off', mph: 0, fuel: 50 }, { engine: null, mph: null, fuel: 50 }]
    .map(l => has(busHead(l), '.scheduler-row-head__dial--running')),
  [true, true, false, false]);
expect('another week, or no answer for the bus: the inspection alone, amber within 45 days, and no seats',
  [busHead({ engine: 'on', mph: 64, fuel: 72 }, false).querySelectorAll('.scheduler-row-head__dial').length,
    line(busHead(null, true)),
    has(busHead(null, false, { capacity: 56, inspection_exp: new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10) }), '.scheduler-row-head__insp--soon'),
    has(busHead(null, false, { capacity: 56, inspection_exp: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) }), '.scheduler-row-head__insp--soon')],
  [0, null, true, false]);
expect('the compact board\'s one dot takes the worst tone',
  [{ engine: 'on', mph: 64, fuel: 72 }, { engine: 'on', mph: 64, fuel: 20 }, { engine: 'on', mph: 64, fuel: 5 }, { engine: null, fuel: 50 }]
    .map(l => busHead(l).querySelector('.scheduler-row-head__dot').dataset.tone),
  ['normal', 'warning', 'error', 'quiet']);
expect('the tip words what the head shows',
  BusHead.tipOf({}, { engine: 'on', mph: 64, place: 'San Marcos, TX', fuel: 72, def: 60, odometer: 292044, seen: new Date().toISOString(), fault: 'check', faults: ['Coolant level: Low'] }),
  ['Moving, 64 mph', 'San Marcos, TX', 'Fuel 72% · DEF 60%', '292,044 mi', 'Last seen 0m ago', 'Engine warning lamp on · Coolant level: Low']);
expect('a standing bus\'s tip says its state, then the address, naming the city once',
  BusHead.tipOf({}, { engine: 'idle', engine_at: ago(12), mph: 0, place: '4015 South Interstate 35, San Marcos, TX, 78666', seen: new Date().toISOString() }).slice(0, 2),
  ['Idling 12m', '4015 South Interstate 35, San Marcos, TX, 78666']);

console.log(failed ? `\n  ${failed} fault(s) in the bar` : '\n  bar: every case passed');
process.exit(failed ? 1 : 0);
