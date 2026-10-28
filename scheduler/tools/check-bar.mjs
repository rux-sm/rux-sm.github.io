// Runs bar.js and road-bar.js against components-data.js's invented samples,
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
  'share/driver-words.js', 'driver-job.js', 'clashes.js', 'close-out.js', 'bar.js', 'road-bar.js', 'components-data.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const { SchedulerBar: Bar, SchedulerRoadBar: RoadBar, SchedulerLiveTrip: Live, SchedulerWeek: Week } = window;
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
    ['success', '#i-checkmark--filled', false], ['success', '#i-checkmark--filled', false], ['error', '#i-error--filled', true]]);
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
expect('the badge count and its tooltip come from the exact problem list',
  alerts.map(n => {
    const b = drawn('alerts', n)[0], problems = factsByBar.get(b).problems;
    const badge = b.querySelector('.scheduler-bar__alert');
    return badge ? [Number(badge.textContent), badge.title] : [0, ''];
  }), alerts.map(n => {
    const b = drawn('alerts', n)[0], problems = factsByBar.get(b).problems;
    return [problems.length, problems.map(a=>a.words).join(' · ')];
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
  ['run', 'run', 'idle', 'rest', 'off', 'scan']);
const tone = b => card(b).classes().find(c => /--(error|warning|rest|scan)$/.test(c))?.split('--')[1] ?? null;
const card = b => b.querySelector('.scheduler-road__card');
const row = b => b.querySelector('.scheduler-road__times');
const say = b => { const x = row(b).querySelector(':scope > .scheduler-road__say'); return x ? [x.classes().find(c => c.startsWith('scheduler-road__say--'))?.slice(21), x.textContent] : null; };
const lit5 = b => card(b).querySelectorAll('.scheduler-road__bar--on').length;
expect('the times and the instruments sit before the drivers row, after the rows they hide',
  lit('At highway speed').children.map(c => c.classes().find(x => /__(dest|client|contact|time|update|drivers)$|road__(times|card)$/.test(x))).filter(Boolean),
  ['scheduler-bar__dest', 'scheduler-bar__client', 'scheduler-bar__contact', 'scheduler-bar__time', 'scheduler-bar__update', 'scheduler-road__times', 'scheduler-road__card', 'scheduler-bar__drivers']);
expect('the times: out and back either end of a track filled as far as the trip has gone',
  [row(lit('At highway speed')).querySelectorAll('.scheduler-road__when').length, /^\d+(\.\d)?%$/.test(row(lit('At highway speed')).querySelector('.scheduler-road__track')?.style.getPropertyValue('--scheduler-done') ?? '')],
  [2, true]);
expect('late back: the expected return in amber in place of the plan, or how long past it',
  [[...row(lit('Late back to the yard')).querySelectorAll('.scheduler-road__when')].map(w => w.classList.contains('scheduler-road__when--late')),
    // 45 minutes over when drawn, or 46 when the draw falls into the next minute.
    /^\+4[56]m$/.test(text(row(lit('Past its return')), '.scheduler-road__over') ?? ''), has(row(lit('At highway speed')), '.scheduler-road__over')],
  [[false, true], true, false]);
expect('moving: the speed, five bars with one lit for every 16 mph, green, a rule, the tank',
  [text(lit('At highway speed'), '.scheduler-road__big'), text(lit('At highway speed'), '.scheduler-road__unit'), card(lit('At highway speed')).querySelectorAll('.scheduler-road__bars > i').length,
    lit5(lit('At highway speed')), tone(lit('At highway speed')), has(lit('At highway speed'), '.scheduler-road__rule'), text(lit('At highway speed'), '.scheduler-road__pct'), say(lit('At highway speed'))],
  ['64', 'mph', 5, 4, null, true, '72%', null]);
expect('the route pill marks an active trip while its label follows the bus, including stops and unknown readings',
  ['At highway speed', 'Idling', 'Engine off', 'Resting', 'No signal'].map(n => {
    const pill = lit(n).querySelector('.scheduler-bar__dest > .scheduler-road__dot');
    return [text(pill, '.scheduler-road__status'), useOf(pill.querySelector('.scheduler-road__route')),
      pill.getAttribute('aria-label').startsWith('Trip in progress · '), pill.hasAttribute('data-card-opener')];
  }), ['Moving', 'Idling', 'Engine off', 'Idling', 'Unknown'].map(s => [s, '#m-route', true, true]));
expect('where the bus is goes on the tooltip', card(lit('At highway speed')).title.includes('I-37 N near Three Rivers'), true);
expect('each warning its colour on the bars and its name in place of the times',
  ['Stop lamp', 'Not rolling', 'Wrong bus', 'Late to spot', 'Short on hours'].map(n => { const b = lit(n); return [tone(b), ...say(b)]; }), [
    ['error', 'error', 'Stop lamp'], ['error', 'error', 'Not rolling'], ['error', 'error', 'Wrong bus'],
    ['warning', 'warning', 'Late to spot'], ['warning', 'warning', 'Short on hours']]);
expect('an engine warning lamp is said on the tooltip only',
  [say(lit('Engine warning lamp')), card(lit('Engine warning lamp')).title.includes('Engine warning lamp on')], [null, true]);
expect('only a problem gives the speed\'s half words to show when the times are hidden', ['At highway speed', 'Not rolling', 'No signal'].map(n => card(lit(n)).classList.contains('scheduler-road__card--says')), [false, true, true]);
expect('a red warning blinks for its first minute', lit('Not rolling').hasAttribute('data-alarm'), true);
const wrong = lit('Wrong bus').querySelector('.scheduler-crew');
expect('wrong bus: the driver marked red, with the other bus', [wrong.dataset.duty, text(wrong, '.scheduler-crew__away')], ['away', 'in 119']);
expect('under an hour left, the bar and the hours are amber',
  [has(lit('Short on hours'), '.scheduler-crew__left--low'), text(lit('Short on hours'), '.scheduler-crew__hours--low')], [true, '0:50']);
expect('every driver wears their duty, the one at the wheel the steering wheel',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => useOf(c.querySelector('.scheduler-crew__duty'))),
  ['#m-search_hands_free-fill', '#m-bedtime-fill']);
expect('two drivers: both in the row, the one at the wheel bold',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => [c.dataset.duty, c.classList.contains('scheduler-crew--wheel')]),
  [['driving', true], ['sleeper', false]]);
expect('resting turns the bars purple, and idling lights none', [tone(lit('Resting')), lit5(lit('Resting'))], ['rest', 0]);
expect('no signal: speed stays a dash in mph, with freshness in place of the times',
  [tone(lit('No signal')), text(lit('No signal'), '.scheduler-road__big'), text(lit('No signal'), '.scheduler-road__unit'), say(lit('No signal'))], ['scan', '–', 'mph', ['quiet', 'No signal 25m']]);
expect('stationary buses keep a numeric speed while the pill carries engine state',
  ['Idling', 'Idling a long time', 'Engine off'].map(n => [text(lit(n), '.scheduler-road__big'), text(lit(n), '.scheduler-road__unit')]),
  [['0', 'mph'], ['0', 'mph'], ['0', 'mph']]);
expect('under a quarter tank the tank is amber', [has(lit('Low fuel'), '.scheduler-road__meter--low'), has(lit('At highway speed'), '.scheduler-road__meter--low')], [true, false]);
expect('a driver Samsara has in the bus reads confirmed whatever they answered',
  [lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark').classes().find(c => /--(off|warning|error|success)$/.test(c)), icon(lit('In the bus, not yet confirmed').querySelector('.scheduler-crew'))],
  ['scheduler-crew__mark--success', '#i-checkmark--filled']);
expect('a live-confirmed driver uses the success style as well as the success icon',
  lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark svg').getAttribute('class'),
  'rux--icon-indicator--succeeded');
expect('a driver the bar does not name joins the drivers row', text(lit('Someone else at the wheel'), '.scheduler-road__who > .scheduler-crew__name'), 'Omar D.');
expect('a longer bar out stands its rows in today\'s column, and a one-day one on its own',
  [lit('On its second day').style.getPropertyValue('--scheduler-today'), lit('At highway speed').style.getPropertyValue('--scheduler-today')], ['1', '']);
expect('a bus no longer out takes its dot, times and instruments off', (() => { const b = lit('At highway speed'); RoadBar.draw(b, null); return [has(b, '.scheduler-road__dot'), has(b, '.scheduler-road__card'), has(b, '.scheduler-road__times'), has(b, '.scheduler-crew__left')]; })(), [false, false, false, false]);

console.log(failed ? `\n  ${failed} fault(s) in the bar` : '\n  bar: every case passed');
process.exit(failed ? 1 : 0);
