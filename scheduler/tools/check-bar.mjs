// Runs bar.js and road-bar.js against components-data.js's invented samples,
// trip-tips.js and trip-sheet.js against the tips drawn from them,
// and bus-head.js against invented Samsara readings,
// the ones components.html draws, and checks each sample's bar carries the
// classes, marks and words its state should: the colours, stripes, times,
// update ages and crew of the trip bar, the alerts it counts, and each light
// and warning of a bus out on its trip. The rule files they read are loaded
// beside them, in components.html's order, into a stand-in page that builds
// elements and finds them by the selectors the two files use.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

/* The samples are drawn from an ordinary noon in McAllen, 27 October 2026,
   the clock running on from there, so none of their times falls in the hour
   the clocks go back, which reads twice; that hour is checked on its own. */
const RealDate = Date;
const NOON = RealDate.parse('2026-10-27T12:00:00-05:00'), STARTED = RealDate.now();
globalThis.Date = class extends RealDate {
  constructor(...args) { super(...(args.length ? args : [RealDate.now() - STARTED + NOON])); }
  static now() { return RealDate.now() - STARTED + NOON; }
};

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
  querySelectorAll(sel) { const lists = sel.split(',').map(parse); return [...this.walk()].filter(e => lists.some(steps => matches(e, steps, this))); }
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
  'share/driver-words.js', 'driver-job.js', 'clashes.js', 'close-out.js', 'bar.js', 'road-bar.js', 'bus-head.js', 'driver-head.js', 'trip-tips.js', 'trip-sheet.js',
  'components-data.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const { SchedulerBar: Bar, SchedulerRoadBar: RoadBar, SchedulerBusHead: BusHead, SchedulerDriverHead: DriverHead, SchedulerLiveTrip: Live, SchedulerWeek: Week } = window;
const data = window.SchedulerComponentsData.build();

// Each sample's bars drawn as components.js draws them.
const factsByBar = new WeakMap();
// `later` draws each as the second of two buses on its leg.
function drawn(sectionId, name, later = false) {
  const sample = data.sections.find(s => s.id === sectionId)?.samples.find(s => s.name === name);
  if (!sample) throw new Error(`no sample ${sectionId} / ${name}`);
  return sample.rows.flatMap(r => r.bars).map(spec => {
    const found = Week.legsOf(spec.trip).find(l => l.leg === spec.leg);
    const leg = later ? { ...found, count: 2 } : found;
    const assigns = spec.trip.trip_assignments.filter(a => (a.leg || 'outbound') === spec.leg);
    const b = { trip: spec.trip, leg, slot: spec.slot, nth: later ? 2 : (spec.slot ?? 0) + 1, lane: 0, assign: 'assign' in spec ? spec.assign : assigns[spec.slot] ?? null,
      place: { start: spec.start, span: spec.span, fromPrev: !!spec.fromPrev, toNext: !!spec.toNext } };
    const { bar, facts } = Bar.draw(b, { ...data, saving: () => !!spec.state?.saving });
    factsByBar.set(bar, facts);
    if (spec.live) {
      const { bus, look, before } = spec.live;
      const said = Live.saidOf;
      if (before) RoadBar.draw(bar, before, { next: look.next, said: said({ ...look, bus: before }), at: look.now });
      RoadBar.draw(bar, bus, { next: look.next, said: said(look), at: look.now, day: look.day });
    }
    return bar;
  });
}
const has = (bar, sel) => !!bar.querySelector(sel);
const text = (bar, sel) => bar.querySelector(sel)?.textContent ?? null;
// The warning sign a bar wears for a problem, its colour and its words; a clock is not one.
const mark = bar => { const m = bar.querySelector('.scheduler-bar__alert'); return m ? `${m.classList.contains('scheduler-bar__msg--error') ? 'red' : 'amber'} ${m.getAttribute('aria-label').replace(/^Alerts: /, '')}` : null; };
const hue = bar => bar.classes().find(c => /^scheduler-bar--(blue|red|teal|green|purple|magenta|amber)$/.test(c))?.slice(15);

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

console.log('\n  The trip bar');
expect('each colour paints its hue, with no alert', drawn('trip-bar', 'Colours').map(b => [hue(b), mark(b)]),
  [['blue', null], ['red', null], ['teal', null], ['green', null], ['purple', null], ['amber', null], ['blue', null]]);
expect('only a trip that is back is marked back, which app.css draws outlined in place of its hue',
  drawn('trip-bar', 'Colours').map(b => b.classList.contains('scheduler-bar--back')),
  [false, false, false, false, false, false, true]);
const [holder] = drawn('trip-bar', 'A placeholder');
expect('a placeholder: no times, the named driver, no empty seat, no alert',
  [text(holder, '.scheduler-bar__time > span'), [...holder.querySelectorAll('.scheduler-crew__name')].map(n => n.textContent), mark(holder)],
  ['No times', ['Ben'], null]);
expect('a bar\'s track is empty before the trip leaves, filled as its time goes, and full once it is back, the next day\'s return counted',
  [['2026-10-29T07:00'], ['2026-10-29T09:52:30'], ['2026-10-29T13:00'], ['2026-10-30T01:00']].map(([at]) => Bar.tripDone({ from: '2026-10-29', to: '2026-10-29', depart: '07:45:00', back: '12:00:00', backDays: 0 }, Date.parse(at)))
    .concat(Bar.tripDone({ from: '2026-10-29', to: '2026-10-29', depart: '22:00:00', back: '02:00:00', backDays: 1 }, Date.parse('2026-10-30T00:00')))
    // Out the evening before its day, the bar's −1, and back past midnight after it.
    .concat(Bar.tripDone({ from: '2026-10-30', to: '2026-10-30', depart: '23:00:00', departDays: 1, back: '01:00:00', backDays: 1 }, Date.parse('2026-10-30T12:00'))),
  [0, 50, 100, 100, 50, 50]);
const kindOf = b => { const k = b.querySelector('.scheduler-bar__dest > .scheduler-bar__kind'); return k ? [k.querySelector('use')?.getAttribute('href') ?? null, text(k, '.scheduler-bar__kind-word')] : null; };
expect('one way wears its arrow after the destination', drawn('trip-bar', 'One way').map(kindOf), [['#m-arrow_forward', 'One way']]);
expect('a split\'s drop-off points down and its pickup up; a round trip wears none',
  [...drawn('trip-bar', 'Drop-off and pickup'), ...drawn('trip-bar', 'Colours').slice(0, 1)].map(kindOf),
  [['#m-download', 'Drop-off'], ['#m-upload', 'Pickup'], null]);
expect('three buses: counted, and the third needs a bus',
  drawn('trip-bar', 'More than one bus').map(b => [text(b, '.scheduler-bar__count'), text(b, '.scheduler-bar__crew')]),
  [['3', 'Marco'], ['3', 'Lena'], ['3', 'Needs a bus']]);
expect('the first of them carries the update, the others say which bus they are with no age',
  drawn('trip-bar', 'More than one bus').map(b => [has(b, '.scheduler-bar__age'), /^Bus /.test(text(b, '.scheduler-bar__update')) ? text(b, '.scheduler-bar__update') : 'update']),
  [[true, 'update'], [false, 'Bus 2 of 3'], [false, 'Bus 3 of 3']]);
// The samples are dated from today, so the weekdays are whichever they fall on.
expect('a leg crossing the week\'s edge shows only its time inside the week, its track running out the other way, and names both days on its tooltip, with no +1',
  drawn('trip-bar', 'Either side of the week').map(b => [[...b.querySelectorAll('.scheduler-bar__time .scheduler-bar__when')].map(w => w.textContent),
    /^[A-Z][a-z]{2} \d{1,2}:\d\d[ap] \u2013 [A-Z][a-z]{2} \d{1,2}:\d\d[ap]$/.test(b.querySelector('.scheduler-bar__span')?.title ?? ''), has(b, '.scheduler-bar__next-day')]),
  [[['6:00p'], true, false], [['7:30a'], true, false]]);
expect('either side of the week', drawn('trip-bar', 'Either side of the week').map(b => [b.classList.contains('scheduler-bar--from-prev'), b.classList.contains('scheduler-bar--to-next')]),
  [[true, false], [false, true]]);
const [back] = drawn('trip-bar', 'Back at the yard');
expect('a trip back stays put and raises no alert, though its record lacks miles and pay', [back.classList.contains('scheduler-bar--back'), mark(back)],
  [true, null]);
expect('a trip back says Paid in the alert badge\'s place once paid in full, and nothing when it is not',
  drawn('trip-bar', 'Back at the yard').map(b => [text(b, '.scheduler-bar__dest .scheduler-bar__paid'), has(b, '.scheduler-bar__alert')]),
  [['', false], ['Paid', false], ['', false], ['Paid', false]].map(([p, a]) => [p || null, a]));
expect('a trip back wears its money, then while close-out asks anything the close-out button, a card opener in Carbon\'s Incomplete that names what it asks',
  drawn('trip-bar', 'Back at the yard').map(b => {
    const close = b.querySelector('.scheduler-bar__dest .scheduler-bar__close');
    return [has(b, '.scheduler-bar__dest .scheduler-bar__owed'), close?.getAttribute('aria-label') ?? null,
      close ? close.getAttribute('data-card-opener') != null : null,
      close ? [...close.walk()].find(n => n.tagName === 'USE')?.getAttribute('href') ?? null : null];
  }),
  [[false, 'Close-out: Actual miles missing · Driver pay missing · Invoice missing', true, '#i-incomplete'],
    [false, 'Close-out: Invoice missing', true, '#i-incomplete'],
    [true, 'Close-out: Actual miles missing · Invoice missing · Balance due', true, '#i-incomplete'],
    [false, null, null, null]]);
expect('a trip back keeps the regular update row and carries no driver status icon',
  drawn('trip-bar', 'Back at the yard').map(b => [has(b, '.scheduler-bar__update > .scheduler-bar__run > .scheduler-bar__age'), has(b, '.scheduler-bar__complete'), b.querySelectorAll('.scheduler-crew__mark use').length]),
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
  drawn('crew', 'Each status').map(b => { const c = b.querySelector('.scheduler-crew'); return [c.querySelector('.scheduler-crew__mark').classes().find(x => /--(off|error|major|warning|normal|success)$/.test(x))?.split('--')[1], icon(c), c.classList.contains('scheduler-crew--declined')]; }),
  [['off', '#i-circle-dash', false], ['warning', '#i-warning--alt--filled', false], ['normal', '#i-in-progress', false],
    ['success', '#i-checkmark--filled', false], ['success', '#i-checkmark--filled', false], ['error', '#i-error--filled', true]]);
const [relief] = drawn('crew', 'Co-driver and relief');
expect('drivers wear their status and relief drivers arrows',
  [...relief.querySelectorAll('.scheduler-crew')].map(c => [c.dataset.seat, icon(c) === '#m-swap_horiz-fill']),
  [['driver', false], ['co-driver', false], ['relief-start', true], ['relief-end', true]]);
expect('an empty seat is in the error colour only while the leg is due',
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
expect('an empty seat shows a person in the error colour, not the alert badge\'s mark, only when due',
  [true,false].map(due => { const c = Bar.crewEl(emptyDriver,due,false); return [icon(c), c.querySelector('.scheduler-crew__mark').classes().includes('scheduler-crew__mark--error')]; }),
  [['#m-person-fill',true],[null,false]]);
const declinedDriver = {role:'driver',label:'Driver',who:{name:'Alex'},status:window.SchedulerLegFacts.DRIVER_STATUSES.find(s=>s.value==='declined')};
expect('a recorded return cannot erase a decline', icon(Bar.crewEl(declinedDriver,true,true)), '#i-error--filled');

console.log('\n  Alerts');
const alerts = ['A hotel to book', 'No one to call on the day', 'More passengers than seats', 'A driver said no', 'A driver to tell',
  'Hours of service', 'The wrong type of bus', 'A bus short of a need', 'Both', 'Nothing paid'];
// A missing trip contact warns whatever day the sample leaves.
expect('a problem wears the alert badge in its colour, a missing trip contact too, other paperwork none', alerts.map(n => mark(drawn('alerts', n)[0])), [
  null, 'amber Trip contact missing', 'amber More passengers than seats: 52 passengers and 49 seats',
  'amber Rosa declined', 'amber Tell Ben: New pickup: Lakeview High School (was Riverside Middle School)', null, 'red Coach needed', 'red Sleeper needed',
  'red Sleeper needed · Trip contact missing', 'amber PO, deposit or payment pending']);
expect('a later bus of a leg wears only its own problems: a misfit or a driver, not the trip\'s',
  alerts.map(n => mark(drawn('alerts', n, true)[0])), [
  null, null, null, 'amber Rosa declined', 'amber Tell Ben: New pickup: Lakeview High School (was Riverside Middle School)', null, 'red Coach needed', 'red Sleeper needed', 'red Sleeper needed', null]);
expect('each empty seat inside fourteen days is an alert the badge counts, and none further off',
  drawn('crew', 'Empty seats').map(b => mark(b)), ['red Co-driver missing · Relief end missing', null]);
expect('the alert badge ends the destination row', alerts.filter(n => mark(drawn('alerts', n)[0])).map(n => drawn('alerts', n)[0].querySelector('.scheduler-bar__dest').children.at(-1)?.classList.contains('scheduler-bar__alert')),
  alerts.filter(n => mark(drawn('alerts', n)[0])).map(() => true));
expect('a seated driver\'s icon opens their own tip, an empty seat\'s opens nothing, and a done trip\'s drivers have none to press',
  [drawn('crew', 'Empty seats').flatMap(b => [...b.querySelectorAll('.scheduler-crew')]).map(c => [!!c.querySelector(':scope > button.scheduler-crew__mark[data-card-opener]'), !!c.querySelector('.scheduler-bar__none')])
    .every(([press, empty]) => press !== empty || (!press && !empty)),
    drawn('trip-bar', 'Back at the yard').every(b => !b.querySelector('.scheduler-crew__mark[data-card-opener]') || b.querySelector('.scheduler-crew--declined')),
    (() => { const m = drawn('trip-bar', 'Update ages')[0].querySelector('.scheduler-crew > .scheduler-crew__mark[data-card-opener]'); return m ? [m.parentElement.dataset.driverId != null && m.parentElement.dataset.seat != null, m.title, m.getAttribute('aria-expanded')] : null; })()],
  [true, true, [true, '', 'false']]);
expect('every update row leads with its chat mark as the button, including a settled trip, and the age has no clock',
  drawn('trip-bar', 'Update ages').map(b => {
    const row = b.querySelector('.scheduler-bar__update');
    const chat = row.querySelector('.scheduler-bar__chat');
    return [row.tagName, row.hasAttribute('data-card-opener'), chat.tagName, chat.hasAttribute('data-card-opener'), chat.getAttribute('aria-expanded'),
      b.querySelector('.scheduler-bar__age use') === null];
  }),
  Array.from({ length: 4 }, () => ['DIV', false, 'BUTTON', true, 'false', true]));
expect('empty updates remain a visible Updates entry point',
  [holder.querySelector('.scheduler-bar__chat').tagName, text(holder, '.scheduler-bar__age')], ['BUTTON', 'No updates']);
expect('no hover label repeats a tip: a crew member, the update\'s words and its age carry none',
  drawn('trip-bar', 'Update ages').map(b => [
    [...b.querySelectorAll('.scheduler-crew')].map(c => c.title === '').every(Boolean),
    [...b.querySelectorAll('.scheduler-bar__update .scheduler-bar__run > *')].map(n => n.title === '').every(Boolean)]),
  Array.from({ length: 4 }, () => [true, true]));
expect('alert buttons expose their purpose and expansion state',
  alerts.filter(n => mark(drawn('alerts', n)[0])).map(n => {
    const badge = drawn('alerts', n)[0].querySelector('.scheduler-bar__alert');
    return [badge.tagName, badge.getAttribute('aria-label').startsWith('Alerts:'), badge.getAttribute('aria-expanded')];
  }), Array.from({ length: 8 }, () => ['BUTTON', true, 'false']));
// Four months off, with an update written today: the follow-up does not ask, and the money still does.
const far = new Date(Date.now() + 120 * 864e5).toISOString().slice(0, 10);
const unpaidTrip = (more = {}) => ({ id: 'np', confirmed: true, quoted_price: 4885, contract_status: 'Signed', start_date: far, end_date: far,
  trip_updates: [{ id: 'nu', created_at: new Date().toISOString(), kind: 'update', body: 'Quote signed' }],
  trip_contacts: [{ position: 1, name: 'Coach Ortiz', leg_id: null }], itinerary_not_needed: true, trip_assignments: [], trip_stops: [], ...more });
const money = t => Bar.alertsOf(t, {}).filter(a => a.unpaid).map(a => a.words);
expect('a confirmed trip with nothing paid is a problem however far off it leaves, until a PO, deposit or payment is in',
  [money(unpaidTrip()), money(unpaidTrip({ deposit_amount: 500, trip_payments: [{ amount: 500, date: far }] })),
    money(unpaidTrip({ po_received: true, po_amount: 4885 })), money(unpaidTrip({ confirmed: false })), money(unpaidTrip({ quoted_price: 0 }))],
  [['PO, deposit or payment pending'], [], [], [], []]);
// Four months off, with no trip contact and no itinerary.
const bare = (more = {}) => unpaidTrip({ trip_contacts: [], itinerary_not_needed: false, po_received: true, po_amount: 4885, ...more });
const missing = t => Bar.problemsOf(t, {}, Week.legsOf(t)[0]).map(a => a.words).filter(w => /contact|tinerary/.test(w));
expect('a trip\'s missing contact and itinerary are problems however far off it leaves, confirmed or not, until marked not needed',
  [missing(bare()).length, missing(bare({ confirmed: false })).length, missing(bare({ contact_not_needed: true, itinerary_not_needed: true }))],
  [2, 2, []]);
expect('same section toggles closed, another switches, and closed cards open',
  [Bar.opensSection(true, 'needs', 'needs'), Bar.opensSection(true, 'needs', 'updates'), Bar.opensSection(false, 'updates', 'updates')],
  [false, true, true]);
expect('trip groups do not swallow their child button semantics',
  [holder.getAttribute('role'), holder.getAttribute('aria-current')], ['group', 'false']);
expect('the badge is the icon alone, named for the exact problem list, with no hover label',
  alerts.map(n => {
    const badge = drawn('alerts', n)[0].querySelector('.scheduler-bar__alert');
    return badge ? [badge.textContent, badge.getAttribute('aria-label'), badge.title] : ['', '', ''];
  }), alerts.map(n => {
    const problems = factsByBar.get(drawn('alerts', n)[0]).problems;
    return problems.length ? ['', `Alerts: ${problems.map(a=>a.words).join(' · ')}`, ''] : ['', '', ''];
  }));

expect('a bar being saved says so', drawn('handled', 'Saving').map(b => b.classList.contains('scheduler-bar--saving')), [true]);

console.log('\n  The trip\'s tips');
/* Each tips sample drawn as components.js draws it: its bar by bar.js, then
   what a press on it opens by trip-tips.js or trip-sheet.js, handed the
   sample in place of the board. `more` stands in for what the board would
   say of the seat around it. */
const { SchedulerTripTips: Tips, SchedulerTripSheet: Sheet } = window;
const roadLooks = new WeakMap();
const tipSample = name => data.sections.find(s => s.id === 'tips').samples.find(s => s.name === name);
function tipBoard(sample, more = {}) {
  return {
    driversById: data.driversById, busesById: data.busesById, statuses: data.statuses,
    facts: b => factsByBar.get(b) ?? null,
    road: b => {
      const look = roadLooks.get(b);
      return look ? { bus: look.bus, next: look.next, said: Live.saidOf(look) } : null;
    },
    seat: (b, role) => {
      const trip = sample.rows[0].bars[0].trip;
      const assign = trip.trip_assignments.find(a => String(a.id) === b.dataset.assignmentId);
      return assign ? { trip, assign, role, range: Week.legByKey(trip, Week.legKeyOfVehicle(trip, assign)) } : null;
    },
    standing: () => [], near: () => null, photo: () => Promise.resolve(''), staff: () => null,
    editor: () => ({ opened: false, editing: null, quick: null, ...sample.tip.editor }),
    map: {}, section: sample.tip.section ?? '',
    action: id => ({ id, label: id, short: id, icon: '#m-route', blocked: () => null }),
    ...more,
  };
}
function tipDrawn(name, more) {
  const sample = tipSample(name);
  const [b] = drawn('tips', name);
  const spec = sample.rows[0].bars[0];
  if (spec.live) roadLooks.set(b, spec.live.look);
  const board = tipBoard(sample, more);
  const { kind, section = '' } = sample.tip;
  if (kind === 'sheet') {
    const box = new Element('div');
    box.append(...Sheet.draw(spec.trip, b, board));
    return box;
  }
  return kind === 'card' ? Tips.card(spec.trip, b, section, board) : kind === 'driver' ? Tips.driver(spec.trip, b, section, board) : Tips[kind](spec.trip, b, board);
}
const tipHead = tip => [tip.querySelector('.scheduler-tip__name')?.childNodes[0]?.textContent, tip.querySelector('.scheduler-tip__count')?.textContent ?? null];
const tipRows = tip => [...tip.querySelectorAll('.scheduler-tip__row')].map(r => [r.classes().find(c => /^scheduler-tip__(lamp--\w+|answer|call|clocks|map|next|links|need|update|add|box|more|none|post|close)$/.test(c))?.slice(15) ?? 'row', r.textContent]);

const [alertsBar] = drawn('tips', 'Alerts');
const alertsTip = tipDrawn('Alerts');
const alertKind = r => r.classes().find(c => /^scheduler-tip__(lamp--\w+|need)$/.test(c))?.slice(15);
expect('Alerts heads with the bar\'s count, each alert a lamp and each need a dashed circle, its words a Carbon link that goes where it is put right',
  [tipHead(alertsTip), alertsTip.classList.contains('scheduler-tip--card'), alertsTip.querySelectorAll('.scheduler-tip__alert').map(alertKind),
    alertsTip.querySelectorAll('.scheduler-tip__alert').every(r => r.querySelector('a.rux--link[data-go]')?.textContent === r.textContent)
      && !alertsTip.querySelector('[role="button"]')],
  [['Alerts', String(factsByBar.get(alertsBar).problems.length)], true,
    [...factsByBar.get(alertsBar).problems.map(a => (a.row === 'scheduler-card__error' ? 'lamp--error' : 'lamp--warning')),
      ...Bar.alertsOf(alertsBar && tipSample('Alerts').rows[0].bars[0].trip, factsByBar.get(alertsBar))
        .filter(a => !factsByBar.get(alertsBar).problems.some(p => p.words === a.words && p.go === a.go)).map(() => 'need')], true]);
expect('a trip with nothing to put right says so, and Alerts holds no update or button',
  [tipHead(tipDrawn('No alerts')), text(tipDrawn('No alerts'), '.scheduler-tip__none'), tipDrawn('No alerts').querySelector('.scheduler-tip__update, [data-card-action], button.rux--btn')],
  [['Alerts', null], 'No alerts.', null]);
const paperTrip = data.sections.find(s => s.id === 'alerts').samples.find(s => s.name === 'A hotel to book').rows[0].bars[0].trip;
const [paperBar] = drawn('alerts', 'A hotel to book');
expect('paperwork does not turn into a counted alert in the tip', tipHead(Tips.card(paperTrip, paperBar, 'needs', tipBoard({ tip: {} }))), ['Other needs', '1']);
const updatesTip = tipDrawn('Updates');
const footOf = tip => { const f = tip.children.at(-1); return [f.classList.contains('rux--toggletip-actions'), f.children.map(c => [c.tagName, c.textContent, c.dataset.cardAction ?? c.dataset.editAct])]; };
expect('Updates heads with its count, each update its words over who wrote it and how long ago with a pencil at its end, and Carbon\'s footer with Add update',
  [tipHead(updatesTip), updatesTip.querySelectorAll('.scheduler-tip__update').map(u => [text(u, '.scheduler-tip__words'), text(u, '.scheduler-tip__by')]),
    updatesTip.querySelectorAll('.scheduler-tip__update > .scheduler-tip__pencil button.rux--btn--icon-only[data-update-open]').length,
    text(updatesTip, '.scheduler-tip__pencil .rux--tooltip-content'), footOf(updatesTip), updatesTip.querySelector('.rux--user-avatar, .scheduler-tip__row')],
  [['Updates', '3'], [['Gate 4 at the stadium, not the main doors', 'Dana · 2h'], ['Coach Ortiz has the rooming list', 'Luis · 1d · edited'],
    ['Quote sent for two coaches', 'Dana · 6d']], 3, 'Edit update', [true, [['BUTTON', 'Add update', 'update']]], null]);
expect('a trip with no updates says so, over Add update', [tipHead(tipDrawn('No updates')), text(tipDrawn('No updates'), '.scheduler-tip__none'), footOf(tipDrawn('No updates'))],
  [['Updates', null], 'No updates yet.', [true, [['BUTTON', 'Add update', 'update']]]]);
expect('more than five: Show all is a link at the footer\'s start, Add update at its end',
  footOf(tipDrawn('More than five')), [true, [['A', 'Show all 7', 'show-all'], ['BUTTON', 'Add update', 'update']]]);
const everyUpdate = tipDrawn('More than five', { editor: () => ({ opened: true, editing: null, quick: null }) });
expect('more than five: the newest five and Show all with the count, and every one once opened, with Show less',
  [tipDrawn('More than five').querySelectorAll('.scheduler-tip__update').length, text(tipDrawn('More than five'), '.scheduler-tip__more'),
    everyUpdate.querySelectorAll('.scheduler-tip__update').length, text(everyUpdate, '.scheduler-tip__more')],
  [5, 'Show all 7', 7, 'Show less']);
const adding = [tipDrawn('Adding an update'), tipDrawn('Adding an update')];
expect('adding: one box in Add\'s place across redraws, keeping what is typed, with Cancel and a primary Save',
  adding.map(c => [c.querySelectorAll('[data-quick] input').map(n => n.value), c.querySelector('.scheduler-tip__add'), c.querySelectorAll('[data-card-action]').map(b => b.dataset.cardAction),
    c.querySelector('[data-card-action="save"]').classList.contains('rux--btn--primary')]),
  Array(2).fill([['Driver to call Coach Ortiz at 7'], null, ['cancel', 'save'], true]));
const changing = tipDrawn('Changing an update');
expect('changing: the update open in its place as its words in a box, with Delete, Cancel and Save, Save off until the words change',
  [changing.querySelectorAll('[data-editing]').length, changing.querySelector('[data-editing] textarea')?.value,
    changing.querySelectorAll('[data-editing] [data-edit-act]').map(b => [b.dataset.editAct, !!b.disabled])],
  [1, 'Gate 4 at the stadium, not the main doors', [['ask-delete', false], ['cancel', false], ['save', true]]]);
expect('deleting asks first', [text(tipDrawn('Deleting an update'), '.scheduler-tip__ask'), tipDrawn('Deleting an update').querySelectorAll('[data-editing] [data-edit-act]').map(b => b.dataset.editAct)],
  ['Delete this update?', ['cancel', 'delete']]);
const after = tipDrawn('Close-out');
expect('close-out: its heading and count, the post-trip entry, back at the yard against the plan, the money and where it is from, then a link for each thing close-out asks, and no footer',
  [tipHead(after), /^Back at the yard .*, 40 min late$/.test(after.querySelector('.scheduler-tip__post .scheduler-tip__words')?.textContent ?? ''), text(after, '.scheduler-tip__by'),
    after.querySelectorAll('.scheduler-tip__close a.rux--link').map(a => [a.dataset.go, a.textContent]), after.querySelector('.rux--toggletip-actions')],
  [['Close-out', '3'], true, 'After the trip · Samsara and Billing', [['billing', 'Actual miles missing'], ['billing', 'Invoice missing'], ['billing', 'Balance due $1,240']], null]);
const afterSample = tipSample('Close-out');
const afterUpdates = Tips.card(afterSample.rows[0].bars[0].trip, drawn('tips', 'Close-out')[0], 'updates', tipBoard(afterSample));
expect('the same trip\'s Updates holds its updates alone, no post-trip entry or close-out links',
  [tipHead(afterUpdates)[0], afterUpdates.querySelector('.scheduler-tip__post'), afterUpdates.querySelectorAll('.scheduler-tip__close').length], ['Updates', null, 0]);

// A driver's tip before the trip, with the board saying what stands in the way of the seat and the rest either side.
const seatTrip = tipSample("A driver's tip").rows[0].bars[0].trip;
const seatAssign = seatTrip.trip_assignments[0].id;
const before = tipDrawn("A driver's tip", {
  standing: () => [{ assignmentId: seatAssign, driverId: 'd1', what: 'Time off' }],
  near: () => ({ near: new Map([['d1', ['Back-to-back with Laredo, 6.5h rest']]]), tight: new Set(['d1']) }),
});
const footLinks = tip => tip.querySelectorAll(':scope > .rux--toggletip-actions > a.rux--link').map(a => [a.textContent, a.href, a.target ?? null]);
expect('a driver\'s tip before the trip: their face and seat, their answer, what stands in the way, the rest either side, and Call in its footer, a link',
  [text(before, '.scheduler-tip__name'), text(before, '.scheduler-tip__text > .scheduler-tip__by'), !!before.querySelector('.scheduler-tip__face'),
    tipRows(before).map(([kind, words]) => [kind, words.replace(/ · .*$/, '')]), footLinks(before)],
  ['Marco Ruiz', 'Driver', true, [['answer', 'Confirmed by the driver'], ['lamp--error', 'Time off'], ['lamp--warning', 'Back-to-back with Laredo, 6.5h rest']],
    [['Call (956) 555-0188', 'tel:9565550188', null]]]);
expect('a driver whose leg changed since they said yes is told so in amber',
  tipRows(tipDrawn('A driver to tell')).filter(([kind]) => kind === 'lamp--warning').map(([, words]) => words.startsWith('Changed since they said yes: ')), [true]);
const onRoad = tipDrawn("A driver's tip on the road", {
  near: () => ({ near: new Map([['d3', ['Back-to-back with Laredo, 6.5h rest']]]), tight: new Set(['d3']) }),
});
expect('a driver\'s tip on the road: their duty, the three clocks amber under an hour, the road\'s warnings, the rest either side, the map, the next stop, and Call and Live map in its footer',
  [text(onRoad, '.scheduler-tip__text > .scheduler-tip__by'), onRoad.querySelectorAll('.scheduler-tip__clock').length, onRoad.querySelectorAll('.scheduler-tip__clock--low').length,
    tipRows(onRoad).map(([kind]) => kind), !!onRoad.querySelector('.scheduler-tip__map .scheduler-card__live-map-box'),
    text(onRoad, '.scheduler-tip__next .scheduler-tip__words'), footLinks(onRoad).map(([words, , target]) => [words, target]), onRoad.querySelector('.scheduler-tip__answer')],
  ['Driving · at the wheel', 3, 1, ['clocks', 'lamp--warning', 'lamp--warning', 'map', 'next'], true, 'Next: Alamodome',
    [['Call (956) 555-0142', null], ['Live map', null]], null]);
const routeTip = tipDrawn('The route');
const routeNames = tip => tip.querySelectorAll('.scheduler-route__point').map(p => p.getAttribute('aria-label'));
const routeDays = tip => tip.querySelectorAll('.scheduler-route__day').map(d => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(d.textContent));
expect('the route: its head, a heading for each of its two days, a point for the yard out, the pickup\'s spot with its arrival judged, and the yard back',
  [text(routeTip, '.scheduler-tip__name'), routeDays(routeTip), routeNames(routeTip), text(routeTip, '.scheduler-route__judged'),
    routeTip.querySelectorAll('.scheduler-route__point').map(p => p.querySelectorAll('.scheduler-route__word').map(w => w.childNodes[0]?.textContent))],
  ['Route', [true, true], ['Yard out', 'Spot · Lakeview High School', 'Yard back'], '4 min late', [['Yard out'], ['Spot'], ['Yard back']]]);
expect('the route on the road: what happened under each planned time, the pickup\'s time by Samsara\'s path, and the next stop\'s estimate after a tilde',
  tipDrawn('The route on the road').querySelectorAll('.scheduler-route__actual').map(a => a.textContent.replace(/[\d:]+[ap]/, 'T')),
  ['--:--', 'T', '~T']);
const fullRoute = tip => tip.querySelectorAll(':scope > .rux--toggletip-actions > a.rux--link').map(a => [a.textContent, a.dataset.go]);
const longTip = tipDrawn('A long route');
expect('a long route shows five points from the yard out, a stop the band stays at with when it departs, and Full route with the count of stops, a link to the editor\'s Route tab',
  [routeNames(longTip), longTip.querySelectorAll('.scheduler-route__point').map(p => p.querySelectorAll('.scheduler-route__word').length), fullRoute(longTip)],
  [['Yard out', 'Spot · Lakeview High School', 'Arrives · Riverside Middle School', 'Arrives · Harbor Elementary', 'Arrives · Oak Park Diner'],
    [1, 1, 1, 1, 2], [['Full route · 7 stops', 'route']]]);
expect('a stop\'s departure is its own time, on the same day, after the word Departs',
  [...longTip.querySelectorAll('.scheduler-route__point')].at(-1).querySelectorAll('.scheduler-route__word').map(w => w.textContent), ['Arrives', 'Departs']);
const longSample = tipSample('A long route');
const [longBar] = drawn('tips', 'A long route');
expect('a long route on the road shows the five points from the last stop reached; a short route, or the half sheet\'s, every point with no Full route',
  [routeNames(tipDrawn('A long route on the road')), fullRoute(tipDrawn('The route')), routeNames(tipDrawn('The route')).length,
    routeNames(Tips.route(longSample.rows[0].bars[0].trip, longBar, tipBoard(longSample), Infinity)).length],
  [['Arrives · Oak Park Diner', 'Arrives · Mission Plaza', 'Arrives · Lakeview Arena', 'Arrives · Bayfront Hotel', 'Yard back'], [], 3, 9]);
const liveCard = tipDrawn('The live card');
expect('the live card: the map of the leg, where the bus is and its links, the stops to come with the next in green, each driver\'s clocks and the engine lamp',
  [liveCard.classList.contains('scheduler-card--live'), !!liveCard.querySelector('.scheduler-card__live-map .scheduler-card__live-map-box'),
    text(liveCard, '.scheduler-card__live-place'), liveCard.querySelectorAll('.scheduler-card__live-link').map(a => a.textContent),
    liveCard.querySelectorAll('.scheduler-card__road-stop').map(s => [text(s, '.scheduler-card__road-name'), s.classList.contains('scheduler-card__road-stop--next')]),
    liveCard.querySelectorAll('.scheduler-card__live-clock').length, text(liveCard, '.scheduler-card__road-lamp .scheduler-card__road-name')],
  [true, true, 'I-37 N near Three Rivers', ['Google Maps', 'Live map'], [['Alamodome', true], ['Yard', false]], 3, 'Engine warning lamp on']);
const sheet = tipDrawn('The half sheet');
expect('the half sheet: its head, its band, what is happening now, its bus and driver, three large buttons, and the rest with the card and Edit trip',
  [text(sheet, '.scheduler-sheet__dest'), has(sheet, '.scheduler-sheet__band'), has(sheet, '.scheduler-sheet__now'), text(sheet, '.scheduler-sheet__bus'),
    sheet.querySelectorAll('.scheduler-sheet__acts > .scheduler-bar-shortcut').map(b => b.dataset.shortcut),
    sheet.querySelectorAll('.scheduler-sheet__facts > dt').map(d => d.textContent), sheet.querySelectorAll('.scheduler-sheet__rest .scheduler-card__update').length,
    text(sheet, '.scheduler-sheet__edit')],
  ['San Antonio, TX', true, true, 'Bus 101', ['itinerary', 'contacts', 'route'], ['Customer', 'Contacts', 'Pickup', 'Bus', 'Driver'], 2, 'Edit trip']);
expect('the half sheet\'s card keeps one Updates box across redraws and preserves the draft',
  [0, 1].map(() => tipDrawn('The half sheet', { editor: () => ({ opened: false, editing: null, quick: 'Draft still being written' }) })
    .querySelectorAll('[data-quick] input').map(n => n.value)), [['Draft still being written'], ['Draft still being written']]);
expect('on the road the sheet says so, and its live card leads the rest',
  [text(tipDrawn('The half sheet on the road'), '.scheduler-sheet__now'), tipDrawn('The half sheet on the road').querySelector('.scheduler-sheet__rest')?.children.map(c => c.classes()[0])],
  ['On the road · on time', ['scheduler-sheet__facts', 'scheduler-card', 'scheduler-card', 'rux--btn']]);

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
const markOf = c => [c.tagName, c.type, c.getAttribute('aria-label'), c.dataset.cardOpener];
expect('each time on a planned and a live bar, and the line between them, is the trip\'s, and a route mark leading the row is the button that opens the leg\'s route tip',
  [[...drawn('trip-bar', 'Either side of the week')[0].querySelectorAll('.scheduler-bar__time .scheduler-bar__when')].map(w => w.tagName),
    [...drawn('trip-bar', 'Either side of the week')[0].querySelectorAll('.scheduler-bar__time .scheduler-bar__track')].map(t => t.tagName),
    [...drawn('trip-bar', 'Either side of the week')[0].querySelectorAll('.scheduler-bar__time > .scheduler-bar__route')].map(markOf),
    [...row(lit('At highway speed')).querySelectorAll('.scheduler-road__when')].map(w => w.tagName),
    [...row(lit('At highway speed')).querySelectorAll('.scheduler-road__track')].map(t => t.tagName),
    [...row(lit('At highway speed')).querySelectorAll(':scope > .scheduler-bar__route')].map(markOf)],
  [['SPAN'], ['SPAN'], [['BUTTON', 'button', 'Route', '']], ['SPAN', 'SPAN'], ['SPAN'], [['BUTTON', 'button', 'Route', '']]]);
const lateWhens = b => [...row(lit(b)).querySelectorAll('.scheduler-road__when')].map(w => w.classList.contains('scheduler-road__when--late'));
expect('late back: the expected return in amber in place of the plan, or the plan in amber once passed, and nothing added to the clock, out, the track and back',
  [lateWhens('Late back to the yard'), lateWhens('Past its return'), lateWhens('At highway speed'), row(lit('Past its return')).children.length],
  [[false, true], [false, true], [false, false], 4]);
expect('the hour the clocks go back: a leg leaves at the first 1:30 and is back at the second',
  [Week.officeInstant('2026-11-01', '01:30'), Week.officeInstant('2026-11-01', '01:30', true),
    Week.backAt({ from: '2026-10-31', to: '2026-10-31', back: '01:30', backDays: 1 }), Week.officeInstant('2026-11-01', '02:30', true)]
    .map(ms => new Date(ms).toISOString()),
  ['2026-11-01T06:30:00.000Z', '2026-11-01T07:30:00.000Z', '2026-11-01T07:30:00.000Z', '2026-11-01T08:30:00.000Z']);
expect('the bar carries no speed or fuel: those are the bus column\'s',
  ['.scheduler-road__card', '.scheduler-road__big', '.scheduler-road__pct'].map(q => has(lit('At highway speed'), q)), [false, false, false]);
expect('a trip in progress wears no bus icon, and its drivers\' marks open the live card, not their row',
  ['At highway speed', 'Idling', 'Engine off', 'Stopped', 'Resting', 'No signal'].map(n => {
    const drivers = lit(n).querySelector(':scope > .scheduler-bar__drivers');
    const marks = drivers.querySelectorAll('button.scheduler-crew__duty, .scheduler-road__who > button.scheduler-crew__mark');
    return [has(lit(n), '.scheduler-road__dot'), drivers.hasAttribute('data-card-opener'),
      marks.length > 0 && marks.every(m => m.hasAttribute('data-card-opener') && m.getAttribute('aria-expanded') === 'false')];
  }),
  ['At highway speed', 'Idling', 'Engine off', 'Stopped', 'Resting'].map(() => [false, false, true]).concat([[false, false, false]]));
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
const riding = [...lit('Co-driver in another bus they ride').querySelectorAll('.scheduler-crew')].find(c => c.dataset.driverId === 'd2');
expect('a co-driver in another bus they ride: that bus said quietly, their status mark kept, no warning',
  [riding.dataset.duty, text(riding, '.scheduler-crew__away'), has(riding, '.scheduler-crew__duty'), has(riding, '.scheduler-crew__mark'), say(lit('Co-driver in another bus they ride'))],
  ['riding', 'in 119', false, true, null]);
expect('under an hour left, the bar and the hours are amber',
  [has(lit('Short on hours'), '.scheduler-crew__left--low'), text(lit('Short on hours'), '.scheduler-crew__hours--low')], [true, '0:50 left']);
expect('every driver wears their duty, the one at the wheel the steering wheel',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => useOf(c.querySelector('.scheduler-crew__duty'))),
  ['#i-BPMN-link--fill', '#i-asleep--filled']);
expect('two drivers: both in the row, the one at the wheel first',
  [...lit('Two drivers').querySelectorAll('.scheduler-crew')].map(c => [c.dataset.duty, c.classList.contains('scheduler-crew--wheel')]),
  [['driving', true], ['sleeper', false]]);
expect('driver rest is no problem of the bus\'s', say(lit('Resting')), null);
expect('no signal: how long since in place of the times', say(lit('No signal')), ['quiet', 'No signal 25m']);
expect('a driver Samsara has in the bus reads confirmed whatever they answered',
  [lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark').classes().find(c => /--(off|warning|error|success)$/.test(c)), icon(lit('In the bus, not yet confirmed').querySelector('.scheduler-crew'))],
  ['scheduler-crew__mark--success', '#i-checkmark--filled']);
expect('a live-confirmed driver uses the success style as well as the success icon',
  lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark svg').getAttribute('class'),
  'rux--icon-indicator--succeeded');
expect('a driver the bar does not name joins the drivers row with their own duty icon',
  [text(lit('Someone else at the wheel'), '.scheduler-road__who > .scheduler-crew__name'),
    has(lit('Someone else at the wheel'), '.scheduler-road__who .scheduler-crew__duty use[href="#i-BPMN-link--fill"]')], ['Omar D.', true]);
expect('a longer bar out stands its rows in today\'s column, and a one-day one on its own',
  [lit('On its second day').style.getPropertyValue('--scheduler-today'), lit('At highway speed').style.getPropertyValue('--scheduler-today')], ['1', '']);
expect('a bus no longer out takes its opener, times and instruments off', (() => { const b = lit('At highway speed'); RoadBar.draw(b, null); return [has(b, ':scope > .scheduler-bar__drivers .scheduler-crew__duty, :scope > .scheduler-bar__drivers .scheduler-road__who'), has(b, '.scheduler-road__card'), has(b, '.scheduler-road__times'), has(b, '.scheduler-crew__left')]; })(), [false, false, false, false]);

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
expect('each seat\'s meter fills to its hours left, its rest while resting, and full in the wrong bus',
  [...[...lit('Two drivers').querySelectorAll('.scheduler-crew')], lit('Wrong bus').querySelector('.scheduler-crew'), lit('Rest duration unknown').querySelector('.scheduler-crew')]
    .map(c => c.style.getPropertyValue('--scheduler-seat-fill')), ['8%', '40.6%', '100%', '0%']);
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
expect('relief specimens expose the role icon', window.SchedulerLegFacts.ROLES.filter(r => r.role.startsWith('relief-')).map(({ label, icon: href }) => {
  const [b] = drawn('icons', `${label} icon`);
  return has(b, `.scheduler-crew__mark use[href="${href}"]`);
}), [true, true]);

console.log('\n  The bus column');
/* A head as data.js makes one, its number in the top row, drawn with a bus
   of samsara-now's answer. */
const busHead = (live, bus = { id: 'b1', capacity: 52 }) => {
  const head = document.createElement('div');
  head.className = 'scheduler-row-head';
  const top = document.createElement('div');
  top.className = 'scheduler-row-head__top';
  head.appendChild(top);
  BusHead.draw(head, bus, live && { bus_id: 'b1', drivers: [], fault: null, faults: [], seen: new Date().toISOString(), ...live });
  return head;
};
const levels = h => h.querySelectorAll('.scheduler-row-head__level').map(g => [g.dataset.tank, g.dataset.level]);
const marks = h => h.querySelectorAll('.scheduler-row-head__mark').map(m => m.classes().find(c => /__mark--/.test(c)).split('--')[1]);
const line = h => text(h, '.scheduler-row-head__line');
const dial = h => [text(h, '.scheduler-row-head__speed'), h.querySelector('.scheduler-row-head__dial').classes().find(c => /__dial--/.test(c)).split('--')[1], has(h, '.scheduler-row-head__dial--running')];
const ago = min => new Date(Date.now() - min * 60e3).toISOString();
// The day `n` days on, as the head counts an inspection's days from the day it is.
const dayIn = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
expect('moving: the speed over mph in a filled green display, the fuel\'s percent and meter, alone while DEF is normal, no line under them, no marks',
  (() => { const h = busHead({ engine: 'on', mph: 64, fuel: 72, def: 60, place: '625 Gregsons Bend, San Marcos, TX, 78666' }); return [dial(h), levels(h), text(h, '.scheduler-row-head__fuel-pct'), line(h), marks(h)]; })(),
  [['64mph', 'moving', true], [['F', 'normal']], '72%', null, []]);
expect('fuel is low at 25% and critical at 10%; DEF is drawn only while low, at 15%, and critical at 5%',
  [[25, 15], [10, 5], [26, 16]].map(([fuel, def]) => levels(busHead({ engine: 'off', mph: 0, fuel, def, place: 'McAllen, TX, 78504' }))),
  [[['F', 'low'], ['D', 'low']], [['F', 'critical'], ['D', 'critical']], [['F', 'normal']]]);
expect('a bus that reports no DEF draws the fuel alone', levels(busHead({ engine: 'off', mph: 0, fuel: 50, def: null })), [['F', 'normal']]);
expect('over 75 mph the display turns amber', dial(busHead({ engine: 'on', mph: 79, fuel: 50 })), ['79mph', 'warning', true]);
expect('a bus standing with its engine on past 30 minutes is as long idle as one Samsara calls idle',
  [busHead({ engine: 'on', mph: 0, engine_at: ago(45), fuel: 50 }), busHead({ engine: 'idle', mph: 0, engine_at: ago(45), fuel: 50 }), busHead({ engine: 'on', mph: 0, engine_at: ago(10), fuel: 50 })].map(dial),
  [['Idle45m', 'warning', true], ['Idle45m', 'warning', true], ['Idle10m', 'quiet', true]]);
expect('standing: Idle over how long, amber past 30 minutes, or Off over how long the engine has been off; the place left to the tip',
  [[busHead({ engine: 'idle', engine_at: ago(14), mph: 0, fuel: 50, place: 'Laredo, TX' })], [busHead({ engine: 'idle', engine_at: ago(45), mph: 0, fuel: 50, place: 'Laredo, TX' })], [busHead({ engine: 'off', engine_at: ago(130), mph: 0, fuel: 50, place: 'McAllen, TX, 78504' })], [busHead({ engine: 'off', mph: 0, fuel: 50 })]]
    .map(([h]) => [...dial(h), h.querySelector('.scheduler-row-head__dial').getAttribute('aria-label'), line(h)]),
  [['Idle14m', 'quiet', true, 'Idling 14m', null], ['Idle45m', 'warning', true, 'Idling 45m, past 30 minutes', null], ['Off2h', 'quiet', false, 'Engine off 2h', null], ['Off', 'quiet', false, 'Engine off', null]]);
const kitOrder = (bus, live) => busHead(live, { id: 'b1', capacity: 52, ...bus }).querySelectorAll('.scheduler-row-head__kit > *').map(m => m.classes().find(c => /__(papers|lamp)$/.test(c)).split('__')[1]);
expect('the kit holds the worst mark first, which is the one the tile shows',
  [kitOrder({ insurance_exp: dayIn(-2) }, { engine: 'on', mph: 40, fuel: 50, fault: 'check' }), kitOrder({ insurance_exp: dayIn(20) }, { engine: 'on', mph: 40, fuel: 50, fault: 'stop' })],
  [['papers', 'lamp'], ['lamp', 'papers']]);
const lamp = h => { const m = h.querySelector('.scheduler-row-head__lamp'); return m ? [m.dataset.tone, m.getAttribute('aria-label')] : null; };
expect('the engine lamp is a mark in the kit, amber or red, with its codes on its label',
  [lamp(busHead({ engine: 'on', mph: 40, fuel: 50, fault: 'check', faults: ['Coolant level: Low'] })), lamp(busHead({ engine: 'on', mph: 40, fuel: 50, fault: 'stop' })), lamp(busHead({ engine: 'on', mph: 40, fuel: 50 }))],
  [['warning', 'Engine warning lamp on. Coolant level: Low'], ['error', 'Engine stop lamp on'], null]);
expect('no signal: a dash over how long since it was seen, the gauges faded, and that said on its label',
  (() => { const h = busHead({ engine: null, mph: null, fuel: 55, place: null, seen: ago(180) }); return [text(h, '.scheduler-row-head__speed'), h.hasAttribute('data-signal-lost'), h.querySelector('.scheduler-row-head__dial').getAttribute('aria-label')]; })(),
  ['–3h', true, 'No signal, last seen 3h ago']);
expect('a bus with its engine running writes its state in the primary ink, moving or idling; one off, or with no signal, is quiet',
  [{ engine: 'on', mph: 40, fuel: 50 }, { engine: 'idle', engine_at: ago(5), mph: 0, fuel: 50 }, { engine: 'off', mph: 0, fuel: 50 }, { engine: null, mph: null, fuel: 50 }]
    .map(l => has(busHead(l), '.scheduler-row-head__dial--running')),
  [true, true, false, false]);
expect('no answer for the bus: the inspection alone, amber within 45 days, and no seats',
  [line(busHead(null)),
    has(busHead(null, { capacity: 56, inspection_exp: dayIn(20) }), '.scheduler-row-head__insp--soon'),
    has(busHead(null, { capacity: 56, inspection_exp: dayIn(90) }), '.scheduler-row-head__insp--soon')],
  [null, true, false]);
expect('a live bus keeps its inspection on the tip, before the lamp\'s line',
  BusHead.tipOf({ inspection_exp: dayIn(20) }, { engine: 'off', mph: 0, fault: 'check', faults: [] }),
  ['Engine off', 'Inspection expires in 20 days', 'Engine warning lamp on']);
const fuel = h => { const f = h.querySelector('.scheduler-row-head__fuel'); return f ? [text(f, '.scheduler-row-head__fuel-pct'), f.dataset.level ?? null, f.style.getPropertyValue('--scheduler-tank')] : null; };
expect('the fuel: its percent over a meter filled to it, low at 25% and critical at 10%',
  [{ engine: 'on', mph: 52, fuel: 68 }, { engine: 'on', mph: 52, fuel: 20 }, { engine: 'idle', engine_at: ago(5), mph: 0, fuel: 8 }].map(l => fuel(busHead(l))),
  [['68%', 'normal', '68%'], ['20%', 'low', '20%'], ['8%', 'critical', '8%']]);
expect('a bus that reports no fuel draws no fuel', fuel(busHead({ engine: 'on', mph: 30, fuel: null })), null);
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
const papers = h => { const m = h.querySelector('.scheduler-row-head__papers'); return m ? [m.dataset.tone, m.getAttribute('aria-label')] : null; };
expect('the papers\' one mark: amber while one expires within 45 days, red once one has expired, the soonest first, and none further off',
  [papers(busHead(null, { capacity: 56, inspection_exp: dayIn(20) })),
    papers(busHead({ engine: 'on', mph: 40 }, { capacity: 56, inspection_exp: dayIn(20), insurance_exp: dayIn(-3), registration_exp: dayIn(90) })),
    papers(busHead(null, { capacity: 56, insurance_exp: dayIn(90) }))],
  [['warning', 'Inspection expires in 20 days'], ['error', 'Insurance expired 3 days ago. Inspection expires in 20 days'], null]);
expect('the tip words each paper in the inspection\'s place',
  [BusHead.tipOf({ registration_exp: dayIn(10), inspection_exp: dayIn(90) }, null),
    BusHead.tipOf({ insurance_exp: dayIn(0) }, { engine: 'off', mph: 0, fault: null, faults: [] })],
  [['Registration expires in 10 days'], ['Engine off', 'Insurance expires today']]);

console.log('\n  The roster');
const H = 3600e3;
expect('a driver\'s line: the time left driving, the duty log\'s word and the time left on duty, the hours rested off or in the berth, a dash with no clock',
  [{ duty: 'driving', left_ms: 6.5 * H }, { duty: 'on', left_ms: 0.6 * H }, { duty: 'yard', left_ms: 3 * H },
    { duty: 'off', left_ms: 10 * H, rest_since: ago(14.2 * 60) }, { duty: 'sleeper', left_ms: 4 * H, rest_since: ago(40) },
    { duty: 'off', rest_since: ago(30 * 60) }, { duty: 'off', rest_since: null }, null]
    .map(l => { const st = DriverHead.stateOf(l); return [st.line, st.tone]; }),
  [['6:30 left', 'normal'], ['On 0:36', 'warning'], ['Yard 3:00', 'normal'], ['Off 14h', 'normal'], ['SB 40m', 'normal'],
    ['Off 24h+', 'normal'], ['Off', 'normal'], ['\u2013', 'quiet']]);
const today = new Date(new Date().setHours(0, 0, 0, 0));
expect('a driver\'s marks, the most urgent first: an expired card, then a card expiring, a change to tell and a leg not sent',
  DriverHead.marksOf({ license_exp: dayIn(12), med_card_expiry: dayIn(-2) },
    [{ kind: 'unsent', trip: { destination: 'McAllen' }, legName: null }, { kind: 'tell', trip: { destination: 'Austin' }, legName: 'Return' }], today)
    .map(m => [m.kind, m.tone, m.words]),
  [['papers', 'error', 'Medical card expired 2 days ago'], ['papers', 'warning', 'Licence expires in 12 days'],
    ['tell', 'warning', 'Tell of a change: Austin, Return'], ['unsent', 'warning', 'Not sent: McAllen']]);
expect('a card further off than 45 days, or none on file, marks nothing',
  DriverHead.marksOf({ license_exp: dayIn(46), med_card_expiry: null }, [], today), []);
const cell = document.createElement('div');
DriverHead.draw(cell, { id: 'd1', name: 'Rigoberto Soto', short_name: 'Rigo', priority: 2, license_exp: dayIn(5) }, { duty: 'driving', left_ms: 2 * H }, []);
expect('the head draws the short name over the line, and the most urgent mark before them',
  [text(cell, '.scheduler-avail__who'), text(cell, '.scheduler-avail__state'), cell.querySelector('.scheduler-avail__mark').dataset.tone],
  ['Rigo', '2:00 left', 'warning']);

console.log(failed ? `\n  ${failed} fault(s) in the bar` : '\n  bar: every case passed');
process.exit(failed ? 1 : 0);
