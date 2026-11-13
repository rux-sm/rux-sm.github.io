/* ==========================================================================
   share/driver.js — A DRIVER'S SCHEDULE LINK
   --------------------------------------------------------------------------
   driver.html?s=<token> shows a driver, without a log-in, the trip legs
   dispatch sent them and the forms they have to sign, and lets them accept
   or decline each leg. The page is a few screens, named in the address's
   hash so the phone's Back button walks them:

     (none)                       home: My trips and My documents, the next
                                  trip, and the office's Call and Text
     #trips                       one row a leg, soonest first, by month
     #trip/<trip>/<leg>           one leg: where and when, who to call, its
                                  papers, and Accept and Decline at the foot
     #trip/<trip>/<leg>/stops     that leg's stops and times
     #documents                   the forms to sign, then the signed ones

   The rest of a trip is on the itinerary file uploaded to it and the
   driver's envelope from form.html, which come back to the leg. A trip
   changed since it was accepted asks again, saying what changed.

   Everything comes through token-checked functions, so the page keeps
   working once the database admits only staff:
     get_driver_schedule_share       the driver, the legs and the link's dates
     get_driver_share_trips          the trips with stops, crew and itinerary files
     get_driver_assignment_statuses  each answer
     get_driver_accepted_views       what each accepted leg showed
     confirm_ / decline_trip_assignment, record_driver_accepted_view
     get_driver_forms                the forms to sign, and the signed ones
   A leg is named by its id, as trip-shape.js reads the trips, and the
   functions take it so; a link's older rows name it by its old word too. A
   leg on the link that is no longer the driver's, or whose trip is gone, is
   left off: there is nothing for them to do with it.

   WHAT THE DRIVER ACCEPTED IS KEPT. Accept sends, with the answer, the leg's
   view of the driver's own job (`jobView`). A later load compares that with
   the leg now: a difference lists before and after and asks again. Edits
   that are not the driver's job, like price or colour, are not in the view,
   so they ask nothing. A leg accepted before views were kept asks again, with
   no list, when the trip was saved after the answer, since there is no view to compare.

   THE PAGE SPEAKS THE DRIVER'S LANGUAGE. Every word it writes is in
   driver-words.js, in English and Spanish; the link's first read returns the
   driver's language from their profile, and a driver can switch the page on
   their phone, which remembers it. What a leg keeps when a driver accepts
   stays in English whatever the page shows, so a change of language asks
   nothing again.

   Two pages load this. The public page takes the token from its address.
   The staff page, the Send trips tab of a driver's record on drivers.html,
   marks its body data-driver="staff" and draws the same screens through
   `SchedulerDriverPage` below, with Accept and Decline disabled, because
   staff answer from the trip; driver-send.js makes the driver's link.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const staffPage = document.body.dataset.driver === 'staff';
  const client = window.Rux?.account?.client;
  const phone = value => window.SchedulerPhone?.format(value) ?? String(value ?? '');

  /* The office's two numbers, as the letterhead gives them: the line rings
     and the cell takes a text. */
  const OFFICE = { call: '9569941169', text: '9566489691' };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  // An icon from the page's sprite, named whole with its hash so the sprite
  // tool finds it: icon('#m-call').
  const icon = (id, size = 16) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', id);
    svg.appendChild(use);
    return svg;
  };
  /* The rules for a driver's job, shared with the office: driver-job.js.
     The page hands in what only it holds: the office's names for the trip's
     needs, the answers, the kept views and its words. */
  const Job = window.SchedulerDriverJob;
  const { clean, dateOnly, rangeText, timeText, todayIso, roleKey, placeText, jobView, keyOf } = Job;
  let requirementNames = new Map();
  const legOf = (ref, trip, driverId) => Job.legOf(ref, trip, driverId, requirementNames);
  // What changed is said in the page's language, which the driver can switch.
  const stateOf = l => Job.stateOf(l, { statuses, views }, Job.sayIn(lang));

  // -- the language ---------------------------------------------------------------
  /* The page starts in the language the driver chose on this phone, else the
     phone's own until the link says the profile's. The staff page shows the
     profile's alone, so the office sees what the driver sees. */
  const WORDS = window.SchedulerDriverWords;
  const LANG_KEY = 'scheduler-driver-language';
  const chosen = (() => {
    if (staffPage) return null;
    try { const v = localStorage.getItem(LANG_KEY); return v === 'en' || v === 'es' ? v : null; } catch { return null; }
  })();
  let lang = chosen ?? (/^es\b/i.test(navigator.language || '') ? 'es' : 'en');
  let w = WORDS[lang];
  // The words driver.html carries, written again in the page's language.
  function setLanguage(next) {
    lang = next === 'es' ? 'es' : 'en';
    w = WORDS[lang];
    // The staff page is the office's, in English, around the driver's screens.
    const scope = staffPage ? [$('scheduler-driver-screen')] : [document.documentElement];
    for (const n of scope) if (n) n.lang = lang;
    if (!staffPage) document.title = `${w.pageTitle} — Scheduler`;
    const put = (id, text) => { const n = $(id); if (n) n.textContent = text; };
    put('scheduler-share-retry', w.tryAgain);
    put('scheduler-leg-decline-h', w.declineTitle);
    put('scheduler-leg-decline-text', w.declineText);
    put('scheduler-leg-decline-cancel', w.cancel);
    put('scheduler-leg-decline-confirm', w.declineConfirm);
    $('scheduler-leg-decline-close')?.setAttribute('aria-label', w.declineKeep);
    if (!staffPage) {
      const skip = document.querySelector('.rux--skip-to-content');
      if (skip) skip.textContent = w.skip;
    }
  }
  setLanguage(lang);

  // -- the page's notice ------------------------------------------------------
  const NOTICE = {
    info: ['rux--inline-notification rux--inline-notification--info', '#m-info-fill'],
    error: ['rux--inline-notification rux--inline-notification--error', '#m-error-fill'],
    warning: ['rux--inline-notification rux--inline-notification--warning', '#m-warning-fill'],
  };
  let retry = null;
  const say = (kind, title, text, again) => {
    const wrap = $('scheduler-share-notice');
    if (!kind) { wrap.hidden = true; return; }
    $('scheduler-share-notice-box').className = NOTICE[kind][0];
    $('scheduler-share-notice-icon').setAttribute('href', NOTICE[kind][1]);
    $('scheduler-share-notice-title').textContent = title;
    $('scheduler-share-notice-text').textContent = text || '';
    retry = again || null;
    $('scheduler-share-retry').hidden = !again;
    wrap.hidden = false;
  };
  $('scheduler-share-retry')?.addEventListener('click', () => retry?.());

  const announce = text => {
    const live = $('scheduler-leg-announcer');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  };

  // "Today" while a leg is under way and "Tomorrow" the day before, in the
  // office's time, so the day a driver checks for reads first.
  const soonText = (from, to) => {
    const today = todayIso();
    const start = String(from || '').slice(0, 10), end = String(to || from || '').slice(0, 10);
    if (!start) return '';
    if (start <= today && today <= end) return w.today;
    const d = dateOnly(today); d.setUTCDate(d.getUTCDate() + 1);
    return start === d.toISOString().slice(0, 10) ? w.tomorrow : '';
  };
  // How many days a leg runs, counted from its first to its last.
  const daysOf = l => {
    const a = dateOnly(String(l.start || '').slice(0, 10)), b = dateOnly(String(l.end || l.start || '').slice(0, 10));
    return a && b ? Math.max(1, Math.round((b - a) / 864e5) + 1) : 1;
  };
  const locale = () => WORDS.LOCALE[lang];
  // A day in the office's own words: "Sun", "8", "November 2026".
  const dayPart = (iso, part) => {
    const d = dateOnly(String(iso || '').slice(0, 10));
    return d ? d.toLocaleDateString(locale(), { timeZone: 'UTC', ...part }) : '';
  };

  // A file opens through its document page, which asks for a link signed for
  // ten minutes each time it is opened, since the bucket is closed. Absolute,
  // so it opens in its own tab as the file itself did.
  const fileUrl = id => (id ? `${location.origin}/scheduler/share/document.html?id=${encodeURIComponent(id)}` : '');

  // -- the answer ---------------------------------------------------------------
  let token = '';
  let statuses = new Map();
  let views = new Map();

  async function answer(l, action) {
    const { data, error } = await client.rpc(action === 'accept' ? 'confirm_trip_assignment' : 'decline_trip_assignment',
      { p_token: token, p_trip_id: l.trip.id, p_leg: l.leg });
    if (error || !data) throw error || new Error('No answer');
    const key = keyOf(l.trip.id, l.leg, data.role || l.role);
    statuses.set(key, { status: action === 'accept' ? 'confirmed' : 'declined', confirmedAt: data.confirmedAt || data.acceptedAt || null });
    if (action === 'accept') {
      const view = jobView(l);
      // Kept for the next load; a database without the column keeps nothing.
      const kept = await client.rpc('record_driver_accepted_view', { p_token: token, p_trip_id: l.trip.id, p_leg: l.leg, p_view: view });
      if (!kept.error) views.set(key, view);
    } else {
      views.delete(key);
    }
  }

  // -- decline, confirmed first -------------------------------------------------
  const declineModal = $('scheduler-leg-decline-modal');
  let declineResolve = null;
  const confirmDecline = trigger => new Promise(resolve => {
    declineResolve = resolve;
    window.Rux?.modal?.open(declineModal, trigger);
  });
  $('scheduler-leg-decline-confirm')?.addEventListener('click', () => {
    const done = declineResolve; declineResolve = null;
    window.Rux?.modal?.close(declineModal);
    done?.(true);
  });
  // Escape, Cancel or the close button: the modal says it closed.
  declineModal?.addEventListener('rux:modal-closed', () => { const done = declineResolve; declineResolve = null; done?.(false); });

  // -- the screens' address -------------------------------------------------------
  /* A screen is named in the hash, and a leg by its trip and leg ids. The
     staff page keeps its own address clean, so it holds the hash in memory
     and draws from that. */
  const legHash = l => `trip/${encodeURIComponent(l.trip.id)}/${encodeURIComponent(l.leg)}`;
  let staffHash = '';
  const currentHash = () => (staffPage ? staffHash : location.hash.replace(/^#/, ''));
  function go(hash) {
    if (staffPage) { staffHash = hash; draw(true); return; }
    if (currentHash() === hash) { draw(true); return; }
    location.hash = hash;
  }
  if (!staffPage) window.addEventListener('hashchange', () => draw(true));
  // A screen's link: an address on the driver's page, a step in memory on the staff page.
  function linkTo(a, hash) {
    a.href = `#${hash}`;
    if (staffPage) a.addEventListener('click', e => { e.preventDefault(); go(hash); });
    return a;
  }
  function route() {
    const parts = currentHash().split('/').map(p => { try { return decodeURIComponent(p); } catch { return p; } });
    if (parts[0] === 'trips') return { screen: 'trips' };
    if (parts[0] === 'documents') return { screen: 'documents' };
    if (parts[0] === 'trip' && parts[1]) {
      const item = items?.find(i => !i.error && String(i.trip.id) === parts[1] && String(i.leg) === parts[2]);
      if (item) return { screen: parts[3] === 'stops' && !item.cancelled ? 'stops' : 'trip', item };
      return { screen: 'trips' };
    }
    return { screen: 'home' };
  }

  // -- the parts every screen is made of -------------------------------------------
  // Whole class names, so the check can find each one in this file.
  const TAG = {
    blue: 'rux--tag rux--tag--blue rux--layout--size-md',
    gray: 'rux--tag rux--tag--gray rux--layout--size-md',
    green: 'rux--tag rux--tag--green rux--layout--size-md',
    red: 'rux--tag rux--tag--red rux--layout--size-md',
    warm: 'rux--tag rux--tag--warm-gray rux--layout--size-md',
    magenta: 'rux--tag rux--tag--magenta rux--layout--size-md',
    cyan: 'rux--tag rux--tag--cyan rux--layout--size-md',
  };
  const tag = (text, color, iconId) => {
    const t = el('span', TAG[color]);
    if (iconId) { const i = icon(iconId); i.setAttribute('class', 'rux--tag__custom-icon'); t.appendChild(i); }
    t.appendChild(el('span', 'rux--tag__label', text));
    return t;
  };
  // A leg's one tag: what it waits for, or how it was answered.
  const STATUS_TAG = {
    pending: () => tag(w.needsAnswer, 'blue', '#m-pending-fill'),
    changed: () => tag(w.changedTag, 'warm', '#m-warning-fill'),
    accepted: () => tag(w.accepted, 'green', '#m-check_circle-fill'),
    declined: () => tag(w.declined, 'red', '#m-cancel-fill'),
  };
  const statusTag = l => (l.cancelled ? tag(w.cancelled, 'red', '#m-cancel-fill') : (STATUS_TAG[stateOf(l).status] ?? STATUS_TAG.pending)());
  /* Whether the customer has confirmed the trip, read with it each load, so
     a confirmation reaches the driver with nothing sent. A row says only Not
     confirmed yet; the trip's own screen says Confirmed too. */
  const unconfirmed = l => !l.cancelled && l.trip?.confirmed === false;
  const rowTags = l => {
    if (!unconfirmed(l)) return statusTag(l);
    const both = el('span', 'scheduler-driver-row__tags');
    both.append(statusTag(l), tag(w.notConfirmed, 'magenta', '#m-schedule'));
    return both;
  };

  /* A screen's head: a way back where there is one, the heading, which takes
     focus when the screen changes so a screen reader starts there, and a
     line under it. */
  function head(title, line, back) {
    const wrap = el('div', 'rux--stack-vertical rux--stack-scale-3');
    if (back) {
      const a = linkTo(el('a', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-driver-back', back.label), back.hash);
      const i = icon('#m-arrow_back'); i.setAttribute('class', 'rux--btn__icon'); a.prepend(i);
      wrap.appendChild(el('div')).appendChild(a);
    }
    const h = el('h1', 'rux--type-productive-heading-04', title);
    h.tabIndex = -1;
    h.id = 'scheduler-driver-heading';
    wrap.appendChild(h);
    if (line) wrap.appendChild(el('p', 'rux--type-body-01 scheduler-driver-muted', line));
    return wrap;
  }

  /* A ROW THAT OPENS SOMETHING: Carbon's clickable tile, an icon or a day at
     the left, the words, then a tag and a chevron at the right. A screen's
     row opens in place; a paper's opens on its own page. A row with nothing
     to open yet, `disabled`, is a plain tile with the same parts and no
     chevron, as a signed form's row is. */
  function row({ hash, href, newTab, lead, title, line, end, disabled }) {
    const a = disabled ? el('div', 'rux--tile scheduler-driver-row') : el('a', 'rux--tile rux--tile--clickable scheduler-driver-row');
    if (hash) linkTo(a, hash);
    else if (href) a.href = href;
    if (newTab || (staffPage && href)) { a.target = '_blank'; a.rel = 'noopener'; }
    if (lead) a.appendChild(lead);
    const words = el('span', 'scheduler-driver-row__words');
    words.appendChild(el('span', 'rux--type-heading-compact-02', title));
    if (line) words.appendChild(el('span', 'rux--type-body-compact-01 scheduler-driver-muted', line));
    a.appendChild(words);
    if (end) a.appendChild(end);
    if (!disabled) a.appendChild(icon(newTab ? '#m-open_in_new' : '#m-keyboard_arrow_right', 20));
    return a;
  }
  const rowIcon = id => { const s = el('span', 'scheduler-driver-row__icon'); s.appendChild(icon(id, 24)); return s; };
  const rows = (...children) => { const list = el('div', 'scheduler-driver-rows'); list.append(...children.filter(Boolean)); return list; };
  const section = (title, ...children) => {
    const s = el('section', 'rux--stack-vertical rux--stack-scale-3');
    s.appendChild(el('h2', 'rux--type-heading-compact-02', title));
    s.append(...children.filter(Boolean));
    return s;
  };

  /* A PERSON ON ONE ROW: the name and a second line, then Call and Text at
     the right, each an icon with its word under it. In words beside the icon,
     as Carbon's buttons put them, the pair took the room a name needs on a
     phone; this keeps the words and fits. The same for the office, the
     day-of contact and the crew, so a call looks one way on every screen. */
  const callButton = (word, href, iconId, label) => {
    const a = el('a', 'scheduler-call-button');
    a.href = href;
    a.setAttribute('aria-label', label);
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    a.append(icon(iconId, 20), el('span', null, word));
    return a;
  };
  const person = (label, name, detail, tel, textTel = tel) => {
    const box = el('div', 'rux--tile scheduler-driver-person');
    const lines = el('div', 'scheduler-driver-person__lines');
    if (label) lines.appendChild(el('p', 'rux--type-label-01 scheduler-driver-muted', label));
    lines.appendChild(el('p', 'rux--type-heading-compact-02', name));
    if (detail) lines.appendChild(el('p', 'rux--type-body-compact-01 scheduler-driver-muted', detail));
    box.appendChild(lines);
    if (tel) {
      const digits = v => v.replace(/[^\d+]/g, '');
      const actions = el('div', 'scheduler-driver-person__actions');
      actions.append(callButton(w.call, `tel:${digits(tel)}`, '#m-call', w.callName(name)),
        callButton(w.text, `sms:${digits(textTel)}`, '#m-chat', w.textName(name)));
      box.appendChild(actions);
    }
    return box;
  };

  // A leg's day, a small weekday over a large date, at a row's left.
  function dayBlock(iso) {
    const b = el('span', 'scheduler-driver-day');
    b.append(el('span', 'rux--type-label-01', dayPart(iso, { weekday: 'short' })),
      el('span', 'rux--type-productive-heading-03', dayPart(iso, { day: 'numeric' })));
    return b;
  }
  const whereOf = l => (l.cancelled ? l.destination || w.destination : l.destinationWord ? w[l.destinationWord] : l.destination);
  const lengthOf = l => [daysOf(l) === 1 ? w.dayTrip : w.days(daysOf(l)), l.bus ? w.bus(l.bus) : null].filter(Boolean).join(' · ');

  // -- home ----------------------------------------------------------------------
  function homeScreen() {
    const screen = el('div', 'rux--stack-vertical rux--stack-scale-6');
    const today = dayPart(todayIso(), { weekday: 'long', month: 'long', day: 'numeric' });
    screen.appendChild(head(w.hello(driverName), today));

    const waiting = shown.filter(l => ['pending', 'changed'].includes(stateOf(l).status)).length;
    const toSign = forms.filter(f => f.waiting).length;
    const count = n => (n ? tag(String(n), 'blue') : null);
    screen.appendChild(rows(
      row({ hash: 'trips', lead: rowIcon('#m-directions_bus'), title: w.myTrips,
        line: waiting ? w.waiting(waiting) : shown.length ? w.allAnswered : w.noTrips, end: count(waiting) }),
      forms.length ? row({ hash: 'documents', lead: rowIcon('#m-description'), title: w.myDocuments,
        line: toSign ? w.forms.waiting(toSign) : w.allSigned, end: count(toSign) }) : null,
    ));

    // The soonest leg the driver has not turned down, one line to open it by.
    const next = shown.find(l => stateOf(l).status !== 'declined');
    if (next) {
      const when = [soonText(next.start, next.end) || rangeText(next.start, next.end, true, locale()), whereOf(next)].filter(Boolean).join(' · ');
      const at = next.relief?.at ? w.handoffAt(timeText(next.relief.at)) : next.time ? w.spotAt(timeText(next.time)) : '';
      screen.appendChild(section(w.nextUp, rows(row({ hash: legHash(next), lead: dayBlock(next.start), title: when,
        line: [at, next.bus ? w.bus(next.bus) : null].filter(Boolean).join(' · ') }))));
    }

    screen.appendChild(person(null, w.office, phone(OFFICE.call), OFFICE.call, OFFICE.text));

    /* THE SWITCH, at the foot, written in the language it switches to, so a
       driver finds it whichever the page is in. The phone remembers it. The
       staff page shows the profile's language alone. */
    if (!staffPage) {
      const other = el('button', 'rux--btn rux--btn--ghost rux--btn--md rux--layout--size-md scheduler-driver-language', w.switchTo);
      other.type = 'button';
      other.lang = lang === 'es' ? 'en' : 'es';
      other.addEventListener('click', () => {
        const next = lang === 'es' ? 'en' : 'es';
        try { localStorage.setItem(LANG_KEY, next); } catch { /* the page still switches */ }
        setLanguage(next);
        draw();
      });
      screen.appendChild(el('div')).appendChild(other);
    }
    return screen;
  }

  // -- my trips ------------------------------------------------------------------
  function tripsScreen() {
    const screen = el('div', 'rux--stack-vertical rux--stack-scale-6');
    const waiting = shown.filter(l => ['pending', 'changed'].includes(stateOf(l).status)).length;
    screen.appendChild(head(w.myTrips, waiting ? w.waiting(waiting) : shown.length ? w.allAnswered : w.noTripsText,
      { label: w.home, hash: '' }));
    // Under each month, as the office's own list is.
    const months = new Map();
    for (const i of items.filter(i => !i.error)) {
      const month = dayPart(i.start, { month: 'long', year: 'numeric' });
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(i);
    }
    for (const [month, legs] of months) {
      screen.appendChild(section(month, rows(...legs.map(l => row({ hash: legHash(l), lead: dayBlock(l.start),
        title: whereOf(l), line: lengthOf(l), end: rowTags(l) })))));
    }
    return screen;
  }

  // -- one trip --------------------------------------------------------------------
  function tripScreen(l) {
    const screen = el('div', 'rux--stack-vertical rux--stack-scale-6 scheduler-driver-trip');
    const dates = [soonText(l.start, l.end), rangeText(l.start, l.end, true, locale())].filter(Boolean).join(' · ');
    const top = head(whereOf(l), [dates, l.cancelled ? null : l.bus ? w.bus(l.bus) : w.busNotSet].filter(Boolean).join(' · '),
      { label: w.myTrips, hash: 'trips' });
    const tags = el('div', 'scheduler-driver-tags');
    tags.appendChild(statusTag(l));
    if (!l.cancelled) tags.appendChild(unconfirmed(l) ? tag(w.notConfirmed, 'magenta', '#m-schedule') : tag(w.confirmedTag, 'cyan', '#m-check'));
    // The role only where it is not the usual one.
    if (!l.cancelled && (l.role || 'driver') !== 'driver') tags.appendChild(tag(w.role[roleKey(l.role)], 'gray', '#m-person'));
    top.appendChild(tags);
    if (!l.cancelled && l.customer) top.appendChild(el('p', 'rux--type-body-compact-01 scheduler-driver-muted', l.customer));
    if (unconfirmed(l)) top.appendChild(el('p', 'rux--type-body-compact-01', w.notConfirmedText));
    screen.appendChild(top);

    // A cancelled trip stays until its day passes, so a driver who had it
    // knows it is off, with nothing to answer.
    if (l.cancelled) { screen.appendChild(el('p', 'rux--type-body-01', w.cancelledText)); return screen; }

    const state = stateOf(l);
    if (state.status === 'changed') screen.appendChild(changedNotice(state));

    // Where to be, and when, first: it is what the driver comes back for.
    const where = placeText(l.place);
    const when = l.relief
      /* A relief driver works to the handoff, not the bus's spot time, so the
         screen gives the one and never the other. With no time set, relief
         drivers agree it between themselves. */
      ? (l.relief.at ? w.handoffAt(timeText(l.relief.at)) : l.relief.from ? w.agreeHandoff(l.relief.from) : w.handoffComing)
      : l.time ? w.spotAt(timeText(l.time)) : '';
    if (when || where) {
      const plan = el('div', 'rux--tile scheduler-driver-person');
      const lines = el('div', 'scheduler-driver-person__lines');
      if (when) lines.appendChild(el('p', 'rux--type-productive-heading-03', when));
      if (l.relief?.instructions) lines.appendChild(el('p', 'rux--type-body-compact-01', l.relief.instructions));
      // The bus's pickup, which is not where a relief driver takes over, so
      // their screen says whose it is.
      if (where) lines.appendChild(el('address', 'rux--type-body-compact-01 scheduler-driver-muted', l.relief ? w.tripPickup(where) : where));
      plan.appendChild(lines);
      if (where) {
        const actions = el('div', 'scheduler-driver-person__actions');
        actions.appendChild(callButton(w.map, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`, '#m-location_on', w.directionsTo(where)));
        plan.appendChild(actions);
      }
      screen.appendChild(plan);
    }

    /* WHO TO CALL: the leg's contact, then the rest of its contacts as
       Backup, then the crew by their role, the driver's own bus first; another
       bus's crew says which bus. A big trip's crew past the first three waits
       behind a button. */
    const people = [
      ...l.contacts.map((c, i) => person(i ? w.backup : w.contact, c.name || w.noName, c.phone ? phone(c.phone) : '', c.phone)),
      ...l.crew.flatMap(bus => bus.people.map(p => person(
        [w.crewRole[p.role], bus.mine ? '' : (bus.bus ? w.bus(bus.bus) : w.busNotSet)].filter(Boolean).join(' · '),
        p.name || w.crewMember, p.phone ? phone(p.phone) : '', p.phone))),
    ];
    if (people.length) {
      const list = rows(...people);
      const crewStart = l.contacts.length;
      const hideFrom = Math.max(crewStart + 3, 4);
      people.forEach((p, i) => { p.hidden = i >= hideFrom; });
      const s = section(w.whoToCall, list);
      if (people.length > hideFrom) {
        const all = w.showAllCrew(people.length - crewStart);
        const more = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', all);
        more.type = 'button';
        more.setAttribute('aria-expanded', 'false');
        more.addEventListener('click', () => {
          const open = more.getAttribute('aria-expanded') !== 'true';
          more.setAttribute('aria-expanded', String(open));
          people.forEach((p, i) => { if (i >= hideFrom) p.hidden = !open; });
          more.textContent = open ? w.showLessCrew : all;
        });
        s.appendChild(el('div')).appendChild(more);
      }
      screen.appendChild(s);
    }

    /* THE LEG'S PAPERS, where the details are: its stops, the itinerary file
       uploaded to the trip, or No itinerary yet where there is none, and the
       driver's envelope, which comes back here. */
    const files = l.itineraries.map(d => [d, fileUrl(d.id)]).filter(([, url]) => url);
    screen.appendChild(section(w.details, rows(
      l.stops.length ? row({ hash: `${legHash(l)}/stops`, lead: rowIcon('#m-route'), title: w.stops(l.stops.length) }) : null,
      ...(files.length
        ? files.map(([d, url]) => row({ href: url, newTab: true, lead: rowIcon('#m-description'), title: w.itinerary, line: d.updated ? w.updated : '' }))
        : [row({ disabled: true, lead: rowIcon('#m-description'), title: w.itinerary, line: w.noItinerary })]),
      row({ href: sheetUrl(l, 'envelope'), lead: rowIcon('#m-mail'), title: w.envelope }),
    )));

    const response = responseOf(l, state);
    if (response) screen.appendChild(response);
    return screen;
  }
  const sheetUrl = (l, form) => `/scheduler/share/form.html?${new URLSearchParams({ s: token, form, trip: l.trip.id, leg: l.leg })}`;

  function changedNotice(state) {
    const box = el('div', 'rux--inline-notification rux--inline-notification--warning scheduler-driver-changed');
    box.setAttribute('role', 'status');
    const details = el('div', 'rux--inline-notification__details');
    const i = icon('#m-warning-fill', 20); i.setAttribute('class', 'rux--inline-notification__icon');
    const text = el('div', 'rux--inline-notification__text-wrapper');
    text.appendChild(el('div', 'rux--inline-notification__title', w.changedTitle));
    const sub = el('div', 'rux--inline-notification__subtitle');
    if (state.lines.length) {
      const ul = el('ul', 'scheduler-driver-changes');
      for (const line of state.lines) ul.appendChild(el('li', null, line));
      sub.appendChild(ul);
    } else {
      sub.textContent = w.changedCheck;
    }
    text.appendChild(sub);
    details.append(i, text);
    box.appendChild(details);
    return box;
  }

  /* ACCEPT AND DECLINE, at the foot of the screen while the leg waits for an
     answer, solid and large, both: the answer is what the leg is for. */
  function responseOf(l, state) {
    if (state.status === 'accepted' || state.status === 'declined') return null;
    const wrap = el('div', 'scheduler-driver-answer');
    const buttons = el('div', 'scheduler-driver-answer__buttons');
    const decline = el('button', 'rux--btn rux--btn--danger rux--layout--size-lg', w.decline);
    const accept = el('button', 'rux--btn rux--btn--primary rux--layout--size-lg', w.accept);
    decline.type = accept.type = 'button';
    const error = el('p', 'rux--form-requirement scheduler-driver-answer__error');
    error.setAttribute('role', 'alert');
    error.hidden = true;
    if (staffPage) {
      decline.disabled = accept.disabled = true;
      buttons.title = 'Drivers answer here. Set a driver status from the trip.';
    }
    const act = async (button, action) => {
      if (action === 'decline' && !(await confirmDecline(button))) return;
      error.hidden = true;
      decline.disabled = accept.disabled = true;
      button.textContent = action === 'accept' ? w.accepting : w.declining;
      try {
        /* ACCEPT TAKES WHAT IS THERE NOW: the trips are read again first, and
           a leg that changed since the screen was drawn is drawn again to be
           read, not accepted. */
        if (action === 'accept') {
          const shownView = JSON.stringify(jobView(l));
          await load();
          const now = items?.find(i => !i.error && !i.cancelled && i.trip.id === l.trip.id && i.leg === l.leg && i.role === l.role);
          if (!now || JSON.stringify(jobView(now)) !== shownView) { say('warning', w.changedJustNow, ''); return; }
          await answer(now, action);
        } else {
          await answer(l, action);
        }
        draw();
        announce(action === 'accept' ? w.acceptedSaid : w.declinedSaid);
      } catch {
        decline.disabled = accept.disabled = false;
        decline.textContent = w.decline;
        accept.textContent = w.accept;
        error.textContent = action === 'accept' ? w.couldNotAccept : w.couldNotDecline;
        error.hidden = false;
      }
    };
    decline.addEventListener('click', () => act(decline, 'decline'));
    accept.addEventListener('click', () => act(accept, 'accept'));
    buttons.append(decline, accept);
    wrap.append(buttons, error);
    return wrap;
  }

  /* EACH STOP: the list the driver carries on paper, so a change to the stops
     can be read here. A stop says when the bus gets there and when it leaves,
     which is the next stop's leaving time. */
  function stopsScreen(l) {
    const screen = el('div', 'rux--stack-vertical rux--stack-scale-6');
    screen.appendChild(head(w.stopsTitle, [whereOf(l), rangeText(l.start, l.end, true, locale())].filter(Boolean).join(' · '),
      { label: whereOf(l), hash: legHash(l) }));
    const list = el('ol', 'scheduler-driver-stops');
    l.stops.forEach((st, i) => {
      const arrive = st.type === 'pickup' ? st.spot || st.arrive : st.arrive;
      const leave = l.stops[i + 1]?.depart_prev;
      const item = el('li', 'rux--tile');
      item.append(el('p', 'rux--type-heading-compact-02', clean(st.name) || clean(st.address) || clean(st.label) || w.stopUnnamed));
      if (clean(st.name) && clean(st.address)) item.appendChild(el('address', 'rux--type-body-compact-01 scheduler-driver-muted', clean(st.address)));
      const times = [arrive && w.stopArrive(timeText(arrive)), leave && w.stopLeave(timeText(leave))].filter(Boolean).join(' · ');
      if (times) item.appendChild(el('p', 'rux--type-body-compact-01', times));
      list.appendChild(item);
    });
    screen.appendChild(list);
    return screen;
  }

  // -- my documents ------------------------------------------------------------------
  /* The forms the office has set up: the ones waiting first, each opening
     sign.html, which comes back here, and the signed ones with their day.
     The staff page shows them as the driver reads them; the office keeps
     forms on the Drivers page. */
  function documentsScreen() {
    const f = w.forms;
    const screen = el('div', 'rux--stack-vertical rux--stack-scale-6');
    const waiting = forms.filter(x => x.waiting);
    const signed = forms.filter(x => !x.waiting);
    screen.appendChild(head(w.myDocuments, f.cardText, { label: w.home, hash: '' }));
    const day = v => new Date(String(v).length === 10 ? `${v}T12:00:00` : v)
      .toLocaleDateString(locale(), { month: 'short', day: 'numeric', year: 'numeric' });
    const title = form => (lang === 'es' ? form.titleEs : form.title);
    if (waiting.length) {
      screen.appendChild(section(f.toSign, rows(...waiting.map(form => row({
        href: `sign.html?${new URLSearchParams({ s: token, form: form.id })}`, lead: rowIcon('#m-edit'),
        title: title(form), line: f.fillOut, end: tag(f.toSign, 'blue', '#m-pending-fill') })))));
    }
    if (signed.length) {
      const list = rows(...signed.map(form => {
        const r = el('div', 'rux--tile scheduler-driver-row');
        r.appendChild(rowIcon('#m-check_circle'));
        const words = el('span', 'scheduler-driver-row__words');
        words.appendChild(el('span', 'rux--type-heading-compact-02', title(form)));
        if (form.signedAt) words.appendChild(el('span', 'rux--type-body-compact-01 scheduler-driver-muted',
          form.endsOn ? f.signedUntil(day(form.signedAt), day(form.endsOn)) : f.signedOn(day(form.signedAt))));
        r.append(words, tag(f.signed, 'green', '#m-check_circle-fill'));
        return r;
      }));
      screen.appendChild(section(f.signed, list));
    }
    return screen;
  }

  // -- loading ------------------------------------------------------------------
  const screenEl = $('scheduler-driver-screen');
  const clear = () => { screenEl.replaceChildren(); };

  async function load() {
    say(null);
    const share = await client.rpc('get_driver_schedule_share', { p_token: token });
    if (share.error) { clear(); say('error', w.cannotLoad, w.checkConnection, load); return; }
    if (!share.data) {
      clear();
      say('error', w.inactive, staffPage ? 'Make a new link for this driver above.' : w.inactiveText, load);
      return;
    }
    const s = share.data;
    // The profile's language, unless the driver chose another on this phone.
    if (!chosen) setLanguage(s.driver.language);
    const [trips, answers, kept, waiting] = await Promise.all([
      client.rpc('get_driver_share_trips', { p_token: token }),
      client.rpc('get_driver_assignment_statuses', { p_token: token }),
      client.rpc('get_driver_accepted_views', { p_token: token }),
      client.rpc('get_driver_forms', { p_token: token }),
    ]);
    // A form that will not load leaves the trips to show.
    forms = waiting.error ? [] : waiting.data || [];
    if (trips.error || !trips.data) { clear(); say('error', w.cannotLoad, w.checkConnection, load); return; }
    requirementNames = new Map((Array.isArray(trips.data.requirements) ? trips.data.requirements : []).map(r => [r.id, r.label]));
    /* Each answer and kept view under its leg's id, which a screen names its
       leg by, and its old word, for a trip read without its legs. */
    const byLeg = (rows, value) => new Map(rows.flatMap(x => [
      ...(x.legId ? [[keyOf(x.tripId, x.legId, x.role), value(x)]] : []), [keyOf(x.tripId, x.leg, x.role), value(x)]]));
    statuses = byLeg(answers.data || [], a => a);
    // A database without kept views answers with an error; nothing is kept.
    views = byLeg(kept.error ? [] : kept.data || [], v => v.view);

    const today = todayIso();
    items = (s.assignmentRefs || []).map(ref => {
      const trip = (trips.data.trips || []).find(t => String(t.id) === String(ref.tripId));
      if (!trip) return null;
      if (trip.cancelled_at) return cancelledOf(ref, trip);
      const l = legOf(ref, trip, s.driver.id);
      return l.error ? null : l;
    }).filter(Boolean).filter(i => String(i.end || i.start || '').slice(0, 10) >= today)
      .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));
    driverName = s.driver.shortName || s.driver.name;
    loadedAt = Date.now();
    draw();
  }
  let loadedAt = 0;

  /* A cancelled leg's days and destination, as its row shows them: the
     leg's own, by its id, on a trip read with its legs. */
  function cancelledOf(ref, trip) {
    const Shape = window.SchedulerTripShape;
    const shaped = Array.isArray(trip.trip_legs)
      ? Shape.legOf(trip, ref.legId) ?? Shape.legOfWord(trip, ref.leg) : null;
    const leg = shaped?.id ?? ref.leg ?? 'outbound';
    const inbound = !!shaped && Shape.isPickup(trip, shaped.id);
    return {
      cancelled: true, trip, leg,
      start: shaped ? shaped.start : inbound ? trip.return_start_date : trip.start_date,
      end: shaped ? shaped.end : inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date),
      destination: clean(trip.destination),
    };
  }

  /* The screen the address names, drawn again in the other language when the
     driver switches. A move to another screen starts at its top, with its
     heading focused; a redraw of the same screen keeps the driver's place. */
  let items = null;
  let shown = [];
  let forms = [];
  let driverName = '';
  function draw(moved = false) {
    if (!items) return;
    shown = items.filter(i => !i.cancelled);
    const r = route();
    const screen = r.screen === 'trips' ? tripsScreen()
      : r.screen === 'trip' ? tripScreen(r.item)
        : r.screen === 'stops' ? stopsScreen(r.item)
          : r.screen === 'documents' ? documentsScreen()
            : homeScreen();
    screenEl.replaceChildren(screen);
    say(null);
    if (moved) {
      if (!staffPage) window.scrollTo(0, 0);
      $('scheduler-driver-heading')?.focus({ preventScroll: true });
    }
  }

  /* The staff page draws a driver's page through this: driver-send.js
     reads the driver's link and hands over the token.
     A new driver starts at their home. */
  window.SchedulerDriverPage = {
    show: t => {
      if (t !== token) staffHash = '';
      token = t;
      return load().catch(() => say('error', w.wentWrong, w.checkConnection, load));
    },
    clear: () => { items = null; clear(); say(null); },
    say,
  };

  // -- start ------------------------------------------------------------------------
  if (!client) {
    say('info', 'This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to load a schedule.');
    return;
  }
  const run = f => f().catch(() => say('error', w.wentWrong, w.checkConnection, () => run(f)));
  if (!staffPage) {
    token = (new URLSearchParams(location.search).get('s') ?? '').trim().toLowerCase();
    if (!token) { say('error', w.noToken, w.noTokenText); return; }
    run(load);
    // Coming back to the page reads the trips again, so an open phone never shows yesterday's trip.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - loadedAt > 30e3) run(load);
    });
  }
})();
