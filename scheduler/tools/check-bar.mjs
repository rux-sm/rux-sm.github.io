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
for (const file of ['requirements.js', 'leg-facts.js', 'phone.js', 'billing.js', 'follow-up.js', 'week.js', 'road.js', 'live-trip.js',
  'share/driver-words.js', 'driver-job.js', 'clashes.js', 'close-out.js', 'bar.js', 'road-bar.js', 'components-data.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context, { filename: file });
}
const { SchedulerBar: Bar, SchedulerRoadBar: RoadBar, SchedulerLiveTrip: Live, SchedulerWeek: Week } = window;
const data = window.SchedulerComponentsData.build();

// Each sample's bars drawn as components.js draws them.
function drawn(sectionId, name) {
  const sample = data.sections.find(s => s.id === sectionId)?.samples.find(s => s.name === name);
  if (!sample) throw new Error(`no sample ${sectionId} / ${name}`);
  return sample.rows.flatMap(r => r.bars).map(spec => {
    const leg = Week.legsOf(spec.trip).find(l => l.leg === spec.leg);
    const assigns = spec.trip.trip_assignments.filter(a => (a.leg || 'outbound') === spec.leg);
    const b = { trip: spec.trip, leg, slot: spec.slot, lane: 0, assign: 'assign' in spec ? spec.assign : assigns[spec.slot] ?? null,
      place: { start: spec.start, span: spec.span, fromPrev: !!spec.fromPrev, toNext: !!spec.toNext } };
    const { bar } = Bar.draw(b, { ...data, saving: () => !!spec.state?.saving });
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
const mark = bar => { const m = bar.querySelector('.scheduler-bar__msg'); return m ? `${m.classList.contains('scheduler-bar__msg--error') ? 'red' : 'amber'} ${m.getAttribute('aria-label')}` : null; };
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
const kindOf = b => { const k = b.querySelector('.scheduler-bar__time > .scheduler-bar__kind'); return k ? [k.querySelector('use')?.getAttribute('href') ?? null, text(k, '.scheduler-bar__kind-word')] : null; };
expect('one way wears its pill at the time row\'s end, an arrow across', drawn('trip-bar', 'One way').map(kindOf), [['#m-arrow_forward', 'One way']]);
expect('a split\'s drop-off points down and its pickup up; a round trip wears none',
  [...drawn('trip-bar', 'Drop-off and pickup'), ...drawn('trip-bar', 'Colours').slice(0, 1)].map(kindOf),
  [['#m-download', 'Drop-off'], ['#m-upload', 'Pickup'], null]);
expect('three buses: counted, and the third needs a bus',
  drawn('trip-bar', 'More than one bus').map(b => [text(b, '.scheduler-bar__count'), text(b, '.scheduler-bar__crew')]),
  [['×3', 'Marco'], ['×3', 'Lena'], ['×3', 'Needs a bus']]);
// The samples are dated from today, so the weekday is whichever it falls on.
expect('a time outside the week says its weekday: the departure from last week, the return into next',
  drawn('trip-bar', 'Either side of the week').map(b => /^[A-Z][a-z]{2} /.test(text(b, '.scheduler-bar__time > span'))
    ? 'departure' : /\s[A-Z][a-z]{2} \d{1,2}:\d\d[ap]$/.test(text(b, '.scheduler-bar__time > span')) ? 'return' : text(b, '.scheduler-bar__time > span')),
  ['departure', 'return']);
expect('either side of the week', drawn('trip-bar', 'Either side of the week').map(b => [b.classList.contains('scheduler-bar--from-prev'), b.classList.contains('scheduler-bar--to-next')]),
  [[true, false], [false, true]]);
const [back] = drawn('trip-bar', 'Back at the yard');
expect('a trip back stays put and raises no alert, though its record lacks miles and pay', [back.classList.contains('scheduler-bar--back'), mark(back)],
  [true, null]);
expect('a trip back wears Complete, or Paid once paid in full, its update row when it reached the pickup and got back, amber when late, or its miles',
  drawn('trip-bar', 'Back at the yard').map(b => [text(b, '.scheduler-bar__dest > .scheduler-bar__done'), b.querySelector('.scheduler-bar__complete')?.textContent ?? null,
    has(b, '.scheduler-bar__complete-time--late')]),
  [['Complete', '', false], ['Paid', '412 mi', false], ['Complete', 'Back 5:40p', true], ['Paid', 'Spot 6:52a·Back 4:52p', false]]);
expect('the times row', drawn('trip-bar', 'Times').map(b => text(b, '.scheduler-bar__time > span')),
  ['7:30a\u2009\u2013\u20096:00p', '2:10p\u2009\u2013\u200912:30a+1', 'Dep 7:30a', 'Ret 6:00p', 'No times']);
expect('an open trip\'s update takes its age\'s colour, a settled one none',
  drawn('trip-bar', 'Update ages').map(b => b.querySelector('.scheduler-bar__update').classes().find(c => c.startsWith('scheduler-bar__update--')) ?? null),
  ['scheduler-bar__update--new', 'scheduler-bar__update--week', 'scheduler-bar__update--old', null]);
expect('a leg with no bus says so', drawn('trip-bar', 'Needs a bus').map(b => text(b, '.scheduler-bar__crew')), ['Needs a bus']);

console.log('\n  The crew');
// The href of the symbol a mark draws: its svg's one <use>.
const useOf = m => m ? [...m.walk()].find(n => n.tagName === 'USE')?.getAttribute('href') ?? null : null;
const icon = c => useOf(c.querySelector('.scheduler-crew__mark'));
expect('each status its tone and shape, a declined name struck through',
  drawn('crew', 'Each status').map(b => { const c = b.querySelector('.scheduler-crew'); return [c.querySelector('.scheduler-crew__mark').classes().find(x => /--(off|error|warning|success)$/.test(x))?.split('--')[1], icon(c), c.classList.contains('scheduler-crew--declined')]; }),
  [['off', '#m-motion_photos_on', false], ['error', '#m-do_not_disturb_on-fill', false], ['warning', '#m-warning-fill', false],
    ['success', '#m-check_circle-fill', false], ['success', '#m-check_circle-fill', false], ['error', '#m-error-fill', true]]);
const [relief] = drawn('crew', 'Co-driver and relief');
expect('drivers wear their status and relief drivers arrows',
  [...relief.querySelectorAll('.scheduler-crew')].map(c => [c.dataset.seat, icon(c) === '#m-swap_horiz-fill']),
  [['driver', false], ['co-driver', false], ['relief-start', true], ['relief-end', true]]);
expect('an empty seat is in the warning colour only while the leg is due',
  drawn('crew', 'Empty seats').map(b => [...b.querySelectorAll('.scheduler-crew')].filter(c => c.querySelector('.scheduler-bar__none')).map(c => c.classList.contains('scheduler-crew--due'))),
  [[true, true], [false, false]]);

console.log('\n  Alerts');
const alerts = ['A hotel to book', 'No one to call on the day', 'More passengers than seats', 'A driver said no', 'A driver to tell',
  'Hours of service', 'The wrong type of bus', 'A bus short of a need', 'Both'];
expect('each alert counted in its colour', alerts.map(n => mark(drawn('alerts', n)[0])), [
  'amber Hotel booking pending', 'amber Trip contact missing', 'amber More passengers than seats: 52 passengers and 49 seats',
  'amber Rosa declined', 'amber Tell Ben: Stops changed', 'amber HOS form pending', 'red Coach needed', 'red Sleeper needed',
  'red Sleeper needed · Trip contact missing']);
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
const dot = b => { const d = b.querySelector('.scheduler-bar__dest > .scheduler-road__dot'); return d ? d.classes().find(c => /--(error|warning|rest|scan)$/.test(c))?.split('--')[1] ?? 'ok' : null; };
expect('a dot at the destination row\'s end in the bus\'s colour',
  ['At highway speed', 'Late to spot', 'Not rolling', 'Resting', 'No signal'].map(n => dot(lit(n))), ['ok', 'warning', 'error', 'rest', 'scan']);
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
expect('no signal: a grey dash and how long since, and the words in place of the times',
  [tone(lit('No signal')), text(lit('No signal'), '.scheduler-road__big'), text(lit('No signal'), '.scheduler-road__unit'), say(lit('No signal'))], ['scan', '–', '25m', ['quiet', 'No signal 25m']]);
expect('idle is quiet, then amber past half an hour', ['Idling', 'Idling a long time'].map(n => [text(lit(n), '.scheduler-road__big'), has(lit(n), '.scheduler-road__speed--long')]),
  [['Idle', false], ['Idle', true]]);
expect('under a quarter tank the tank is amber', [has(lit('Low fuel'), '.scheduler-road__meter--low'), has(lit('At highway speed'), '.scheduler-road__meter--low')], [true, false]);
expect('a driver Samsara has in the bus reads confirmed whatever they answered',
  [lit('In the bus, not yet confirmed').querySelector('.scheduler-crew__mark').classes().find(c => /--(off|warning|error|success)$/.test(c)), icon(lit('In the bus, not yet confirmed').querySelector('.scheduler-crew'))],
  ['scheduler-crew__mark--success', '#m-check_circle-fill']);
expect('a driver the bar does not name joins the drivers row', text(lit('Someone else at the wheel'), '.scheduler-road__who > .scheduler-crew__name'), 'Omar D.');
expect('a longer bar out stands its rows in today\'s column, and a one-day one on its own',
  [lit('On its second day').style.getPropertyValue('--scheduler-today'), lit('At highway speed').style.getPropertyValue('--scheduler-today')], ['1', '']);
expect('a bus no longer out takes its dot, times and instruments off', (() => { const b = lit('At highway speed'); RoadBar.draw(b, null); return [has(b, '.scheduler-road__dot'), has(b, '.scheduler-road__card'), has(b, '.scheduler-road__times'), has(b, '.scheduler-crew__left')]; })(), [false, false, false, false]);

console.log(failed ? `\n  ${failed} fault(s) in the bar` : '\n  bar: every case passed');
process.exit(failed ? 1 : 0);
