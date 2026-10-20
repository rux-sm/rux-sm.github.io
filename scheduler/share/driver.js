/* ==========================================================================
   share/driver.js — A DRIVER'S SCHEDULE LINK
   --------------------------------------------------------------------------
   driver.html?s=<token> shows a driver, without a log-in, the trip legs
   dispatch sent them, one card each, and lets them accept or decline. A card
   holds the basics: the day, where to be and when, the bus, and who to call.
   The rest is on the itinerary file uploaded to the trip and the driver's
   envelope from form.html, which the card opens. A trip changed since it was
   accepted asks again, saying what changed.

   Everything comes through token-checked functions, so the page keeps
   working once the database admits only staff:
     get_driver_schedule_share       the driver, the legs and the link's dates
     get_driver_share_trips          the trips with stops, crew and itinerary files
     get_driver_assignment_statuses  each answer
     get_driver_accepted_views       what each accepted card showed
     confirm_ / decline_trip_assignment, record_driver_accepted_view

   WHAT THE DRIVER ACCEPTED IS KEPT. Accept sends, with the answer, the card's
   view of the driver's own job (`jobView`). A later load compares that with
   the card now: a difference lists before and after and asks again. Edits
   that are not the driver's job, like price or colour, are not in the view,
   so they ask nothing. A leg accepted before views were kept asks again, with
   no list, when the trip was saved after the answer, since there is no view to compare.

   THE PAGE SPEAKS THE DRIVER'S LANGUAGE. Every word it writes is in
   driver-words.js, in English and Spanish; the link's first read returns the
   driver's language from their profile, and a driver can switch the page on
   their phone, which remembers it. What the card keeps when a driver accepts
   stays in English whatever the page shows, so a change of language asks
   nothing again.

   Two pages load this. The public page takes the token from its address.
   The staff page, driver-view.html, marks its body data-driver="staff" and
   draws the same cards through `SchedulerDriverPage` below, with Accept and
   Decline disabled, because staff answer from the trip; driver-view.js
   picks the driver and makes their link.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const staffPage = document.body.dataset.driver === 'staff';
  const client = window.Rux?.account?.client;
  const phone = value => window.SchedulerPhone?.format(value) ?? String(value ?? '');

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
  const { clean, dateOnly, dayFmt, rangeText, timeText, todayIso, roleKey, jobView, keyOf } = Job;
  let requirementNames = new Map();
  const legOf = (ref, trip, driverId) => Job.legOf(ref, trip, driverId, requirementNames);
  const pageWords = () => ({ w, keptValue, keptRequirement });
  const changesBetween = (was, now, l) => Job.changesBetween(was, now, l, pageWords());
  const stateOf = l => Job.stateOf(l, { statuses, views }, pageWords());

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
    // The staff page is the office's, in English, around the driver's cards.
    const scope = staffPage ? [$('scheduler-leg-intro'), $('scheduler-leg-list')] : [document.documentElement];
    for (const n of scope) if (n) n.lang = lang;
    if (!staffPage) document.title = `${w.pageTitle} — Scheduler`;
    const put = (id, text) => { const n = $(id); if (n) n.textContent = text; };
    put('scheduler-share-retry', w.tryAgain);
    put('scheduler-leg-decline-h', w.declineTitle);
    put('scheduler-leg-decline-text', w.declineText);
    put('scheduler-leg-decline-cancel', w.cancel);
    put('scheduler-leg-decline-confirm', w.declineConfirm);
    $('scheduler-leg-decline-close')?.setAttribute('aria-label', w.declineKeep);
    const skip = document.querySelector('.rux--skip-to-content');
    if (skip) skip.textContent = w.skip;
    const other = $('scheduler-leg-language');
    if (other) { other.textContent = w.switchTo; other.lang = lang === 'es' ? 'en' : 'es'; }
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

  /* Dates an accepted card kept, in English, written again in the page's
     language for the list of what changed: "Sat, Oct 17, 2026", alone or as
     one end of a range, the year taken from the end that carries it. */
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const keptDates = text => {
    if (lang === 'en' || !text) return text;
    const parts = String(text).split(' – ');
    const years = parts.map(p => /, (\d{4})$/.exec(p)?.[1] ?? null);
    const shown = parts.map((p, i) => {
      const m = new RegExp(`^(?:${DAYS.join('|')}), (${MONTHS.join('|')}) (\\d{1,2})(?:, (\\d{4}))?$`).exec(p);
      if (!m) return p;
      const year = +(m[3] ?? years.find(Boolean) ?? todayIso().slice(0, 4));
      const d = new Date(Date.UTC(year, MONTHS.indexOf(m[1]), +m[2]));
      return dayFmt({ weekday: 'short', month: 'short', day: 'numeric', ...(m[3] ? { year: 'numeric' } : {}) }, WORDS.LOCALE[lang]).format(d);
    });
    return shown.join(' – ');
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

  // A file opens through its document page, which asks for a link signed for
  // ten minutes each time it is opened, since the bucket is closed. Absolute,
  // so it opens in its own tab as the file itself did.
  const fileUrl = id => (id ? `${location.origin}/scheduler/share/document.html?id=${encodeURIComponent(id)}` : '');

  // A kept value, which is English, as the page's language writes it.
  const keptValue = (key, v) => {
    if (!v || lang === 'en') return v;
    if (key === 'dates') return keptDates(v);
    if (key === 'role') return w.role[Object.keys(WORDS.en.role).find(k => WORDS.en.role[k] === v)] ?? v;
    if (key === 'destination') return v === WORDS.en.yard ? w.yard : v === WORDS.en.destination ? w.destination : v;
    if (key === 'relief') return v.replace(/^Handoff at (.+?)(?= · |$)/, (_, time) => w.handoffAt(time));
    return v;
  };
  const keptRequirement = name => {
    const id = Object.keys(WORDS.en.legacy).find(k => WORDS.en.legacy[k] === name);
    return id ? w.legacy[id] : name;
  };
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

  // -- a card -------------------------------------------------------------------
  // Whole class names, so the check can find each one in this file.
  const TAG = {
    blue: 'rux--tag rux--tag--blue rux--layout--size-md',
    gray: 'rux--tag rux--tag--gray rux--layout--size-md',
    green: 'rux--tag rux--tag--green rux--layout--size-md',
    red: 'rux--tag rux--tag--red rux--layout--size-md',
  };
  const tag = (text, color, iconId) => {
    const t = el('span', TAG[color]);
    if (iconId) { const i = icon(iconId); i.setAttribute('class', 'rux--tag__custom-icon'); t.appendChild(i); }
    t.appendChild(el('span', 'rux--tag__label', text));
    return t;
  };
  /* A PERSON ON ONE ROW: the name and a second line, then Call and Text at
     the right, each an icon with its word under it. In words beside the icon,
     as Carbon's buttons put them, the pair took the room a name needs on a
     phone; this keeps the words and fits. The same for the day-of contact
     and the crew, so a call looks one way on the card. */
  const callButton = (word, href, iconId, label) => {
    const a = el('a', 'scheduler-call-button');
    a.href = href;
    a.setAttribute('aria-label', label);
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    a.append(icon(iconId, 20), el('span', null, word));
    return a;
  };
  const person = (name, detail, tel, strong = false) => {
    const row = el('div', 'scheduler-leg-card__person');
    const lines = el('div');
    lines.appendChild(el('p', strong ? 'rux--type-heading-compact-02' : 'rux--type-body-compact-02', name));
    if (detail) lines.appendChild(el('p', 'rux--type-body-compact-01 scheduler-leg-card__muted', detail));
    row.appendChild(lines);
    if (tel) {
      const digits = tel.replace(/[^\d+]/g, '');
      const actions = el('div', 'scheduler-leg-card__actions');
      actions.append(callButton(w.call, `tel:${digits}`, '#m-call', w.callName(name)), callButton(w.text, `sms:${digits}`, '#m-chat', w.textName(name)));
      row.appendChild(actions);
    }
    return row;
  };
  const section = (title, ...children) => {
    const s = el('section', 'scheduler-leg-card__section');
    if (title) s.appendChild(el('h3', 'scheduler-leg-card__label', title));
    s.append(...children.filter(Boolean));
    return s;
  };

  /* WHO TO CALL, each under a one-word label: the leg's contact, then the
     rest of its contacts as Backup, then the crew by their role, as
     Co-driver or Relief. Every one reads the same, the
     name in bold and the number under it. */
  const callSection = (label, name, tel) =>
    section(label, person(name || w.noName, tel ? phone(tel) : '', tel, true));

  /* THE LEG'S PAPERWORK, where the details are, at the foot of the card
     for whoever wants more than the card gives: the itinerary file uploaded
     to the trip, or No itinerary, disabled, where there is none, and always
     the driver's envelope. The staff page opens them in a tab, so its driver
     stays picked. */
  const sheetUrl = (l, form) => `/scheduler/share/form.html?${new URLSearchParams({ s: token, form, trip: l.trip.id, leg: l.leg })}`;
  function paperworkOf(l) {
    const wrap = el('div', 'scheduler-leg-card__papers');
    const button = (label, href, iconId) => {
      const a = el('a', 'rux--btn rux--btn--secondary rux--layout--size-lg', label);
      a.href = href;
      if (staffPage || /^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
      const i = icon(iconId); i.setAttribute('class', 'rux--btn__icon'); a.appendChild(i);
      return a;
    };
    const files = l.itineraries.map(d => [d, fileUrl(d.id)]).filter(([, url]) => url);
    for (const [d, url] of files) wrap.appendChild(button(w.viewItinerary(d.updated), url, '#m-description'));
    if (!files.length) {
      const none = el('button', 'rux--btn rux--btn--secondary rux--layout--size-lg', w.noItinerary);
      none.type = 'button';
      none.disabled = true;
      const i = icon('#m-description'); i.setAttribute('class', 'rux--btn__icon'); none.appendChild(i);
      wrap.appendChild(none);
    }
    wrap.appendChild(button(w.viewEnvelope, sheetUrl(l, 'envelope'), '#m-mail'));
    return wrap;
  }

  function responseOf(l, card) {
    const state = stateOf(l);
    // An answer stands in the card's head, beside the bus; only a question
    // takes room here.
    if (state.status === 'accepted' || state.status === 'declined') return null;
    const wrap = el('div', 'scheduler-leg-card__response');
    if (state.status === 'changed') {
      const box = el('div', 'rux--inline-notification rux--inline-notification--warning rux--inline-notification--low-contrast scheduler-leg-card__changed');
      box.setAttribute('role', 'status');
      const details = el('div', 'rux--inline-notification__details');
      const i = icon('#m-warning-fill', 20); i.setAttribute('class', 'rux--inline-notification__icon');
      const text = el('div', 'rux--inline-notification__text-wrapper');
      text.appendChild(el('div', 'rux--inline-notification__title', w.changedTitle));
      const sub = el('div', 'rux--inline-notification__subtitle');
      if (state.lines.length) {
        const ul = el('ul', 'scheduler-leg-card__changes');
        for (const line of state.lines) ul.appendChild(el('li', null, line));
        sub.appendChild(ul);
      } else {
        sub.textContent = w.changedCheck;
      }
      text.appendChild(sub);
      details.append(i, text);
      box.appendChild(details);
      wrap.appendChild(box);
    }
    const buttons = el('div', 'scheduler-leg-card__buttons');
    // Solid and large, both: the answer is what the card is for.
    const decline = el('button', 'rux--btn rux--btn--danger rux--layout--size-lg', w.decline);
    const accept = el('button', 'rux--btn rux--btn--primary rux--layout--size-lg', w.accept);
    decline.type = accept.type = 'button';
    const error = el('p', 'rux--form-requirement scheduler-leg-card__error');
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
           a leg that changed since the card was drawn is drawn again to be
           read, not accepted. */
        if (action === 'accept' && !staffPage) {
          const shownView = JSON.stringify(jobView(l));
          await load();
          const now = items?.find(i => !i.error && !i.cancelled && i.trip.id === l.trip.id && i.leg === l.leg && i.role === l.role);
          if (!now || JSON.stringify(jobView(now)) !== shownView) { say('warning', w.changedJustNow, ''); return; }
          await answer(now, action);
          draw();
        } else {
          await answer(l, action);
          card.replaceWith(cardOf(l));
          summarize();
        }
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

  function cardOf(l) {
    const card = el('article', 'rux--tile scheduler-leg-card');
    const id = `scheduler-leg-${l.trip.id}-${l.leg}`;
    card.setAttribute('aria-labelledby', id);

    const head = el('header', 'scheduler-leg-card__head');
    const soon = soonText(l.start, l.end);
    const dates = rangeText(l.start, l.end, true, WORDS.LOCALE[lang]);
    const title = el('h2', 'rux--type-productive-heading-03', [soon, dates].filter(Boolean).join(' · ') || w.assignment);
    title.id = id;
    head.appendChild(title);
    head.appendChild(el('p', 'rux--type-body-compact-02 scheduler-leg-card__where', l.destinationWord ? w[l.destinationWord] : l.destination));
    if (l.customer) head.appendChild(el('p', 'rux--type-body-compact-01 scheduler-leg-card__customer', l.customer));
    const tags = el('div', 'scheduler-leg-card__tags');
    tags.appendChild(tag(l.bus ? w.bus(l.bus) : w.busNotSet, 'blue', '#m-directions_bus'));
    // The role only where it is not the usual one.
    if ((l.role || 'driver') !== 'driver') tags.appendChild(tag(w.role[roleKey(l.role)], 'gray', '#m-person'));
    const status = stateOf(l).status;
    if (status === 'accepted') tags.appendChild(tag(w.accepted, 'green', '#m-check_circle-fill'));
    if (status === 'declined') tags.appendChild(tag(w.declined, 'red', '#m-cancel-fill'));
    head.appendChild(tags);
    card.appendChild(head);

    // Where to be, and when, first: it is what the driver comes back for.
    // The time and the place on the left, Map on the right, as a call is.
    const plan = el('div', 'scheduler-leg-card__person');
    const lines = el('div', 'scheduler-leg-card__plan');
    if (l.relief) {
      /* A relief driver works to the handoff, not the bus's spot time, so the
         card gives the one and never the other. With no time set, relief
         drivers agree it between themselves. */
      lines.appendChild(el('p', 'rux--type-heading-compact-02', l.relief.at ? w.handoffAt(timeText(l.relief.at))
        : l.relief.from ? w.agreeHandoff(l.relief.from) : w.handoffComing));
      if (l.relief.instructions) lines.appendChild(el('p', 'rux--type-body-compact-01', l.relief.instructions));
    } else if (l.time) {
      lines.appendChild(el('p', 'rux--type-heading-compact-02', w.spotAt(timeText(l.time))));
    }
    const where = [l.place.name, l.place.address].filter(Boolean).join(', ');
    // The bus's pickup, which is not where a relief driver takes over, so
    // their card says whose it is.
    if (where) lines.appendChild(el('address', 'rux--type-body-compact-01', l.relief ? w.tripPickup(where) : where));
    plan.appendChild(lines);
    if (where) {
      const actions = el('div', 'scheduler-leg-card__actions');
      actions.appendChild(callButton(w.map, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`, '#m-location_on', w.directionsTo(where)));
      plan.appendChild(actions);
    }
    if (lines.childElementCount) card.appendChild(plan);
    // The answer under what it answers, then who to call on the day.
    const response = responseOf(l, card);
    if (response) card.appendChild(response);
    const stops = stopsOf(l);
    if (stops) card.appendChild(stops);
    l.contacts.forEach((c, i) => card.appendChild(callSection(i ? w.backup : w.contact, c.name, c.phone)));

    // The driver's own bus first; another bus's crew says which bus.
    const crew = l.crew.flatMap(bus => bus.people.map(p => callSection(
      [w.crewRole[p.role], bus.mine ? '' : (bus.bus ? w.bus(bus.bus) : w.busNotSet)].filter(Boolean).join(' · '), p.name || w.crewMember, p.phone)));
    // A big trip's crew past the first three waits behind a button.
    crew.forEach((c, i) => { c.hidden = i > 2; card.appendChild(c); });
    if (crew.length > 3) {
      const all = w.showAllCrew(crew.length);
      const more = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', all);
      more.type = 'button';
      more.setAttribute('aria-expanded', 'false');
      more.addEventListener('click', () => {
        const open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', String(open));
        crew.forEach((c, i) => { if (i > 2) c.hidden = !open; });
        more.textContent = open ? w.showLessCrew : all;
      });
      card.appendChild(more);
    }
    card.appendChild(section(null, paperworkOf(l)));
    return card;
  }

  /* EACH STOP, FOLDED: the list the driver carries on paper, so Stops
     changed can be read here. A stop says when the bus gets there and when
     it leaves, which is the next stop's leaving time. */
  function stopsOf(l) {
    if (!l.stops.length) return null;
    const fold = el('details', 'scheduler-leg-card__stops');
    fold.appendChild(el('summary', 'rux--type-body-compact-01', w.stops(l.stops.length)));
    const list = el('ol', 'scheduler-leg-card__stop-list');
    l.stops.forEach((st, i) => {
      const arrive = st.type === 'pickup' ? st.spot || st.arrive : st.arrive;
      const leave = l.stops[i + 1]?.depart_prev;
      const item = el('li', 'rux--type-body-compact-01');
      item.append(el('span', 'scheduler-leg-card__stop-name', clean(st.name) || clean(st.address) || clean(st.label) || w.stopUnnamed),
        el('span', 'scheduler-leg-card__stop-times', [arrive && w.stopArrive(timeText(arrive)), leave && w.stopLeave(timeText(leave))].filter(Boolean).join(' · ')));
      list.appendChild(item);
    });
    fold.appendChild(list);
    return fold;
  }

  /* A CANCELLED TRIP stays until its day passes, so a driver who had it
     knows it is off: its days, where it was going, and nothing to answer. */
  function cancelledCard(i) {
    const card = el('article', 'rux--tile scheduler-leg-card');
    const head = el('header', 'scheduler-leg-card__head');
    head.append(el('h2', 'rux--type-productive-heading-03', rangeText(i.start, i.end, true, WORDS.LOCALE[lang]) || w.assignment),
      el('p', 'rux--type-body-compact-02 scheduler-leg-card__where', i.destination || w.destination));
    const tags = el('div', 'scheduler-leg-card__tags');
    tags.appendChild(tag(w.cancelled, 'red', '#m-cancel-fill'));
    head.appendChild(tags);
    card.append(head, el('p', 'rux--type-body-compact-01', w.cancelledText));
    return card;
  }
  // A cancelled leg's days and destination, as its card shows them.
  function cancelledOf(ref, trip) {
    const leg = ref.leg || 'outbound';
    const inbound = leg === 'return' && trip.trip_type === 'dropoff_pickup';
    return {
      cancelled: true, trip, leg,
      start: inbound ? trip.return_start_date : trip.start_date,
      end: inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date),
      destination: clean(trip.destination),
    };
  }

  // `why` names a line in driver-words.js.
  function problemCard(why) {
    const card = el('article', 'rux--tile scheduler-leg-card');
    card.append(el('h2', 'rux--type-productive-heading-03', w.unavailable), el('p', 'rux--type-body-compact-01', w[why]));
    return card;
  }

  // -- loading ------------------------------------------------------------------
  const listEl = $('scheduler-leg-list');
  const introEl = $('scheduler-leg-intro');
  const clear = () => { listEl.replaceChildren(); introEl.hidden = true; };

  // How many legs wait for the driver's answer, under the greeting.
  let shown = [];
  function summarize() {
    const n = shown.filter(l => ['pending', 'changed'].includes(stateOf(l).status)).length;
    $('scheduler-leg-summary').textContent = n ? w.waiting(n) : w.allAnswered;
  }

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
    const [trips, answers, kept] = await Promise.all([
      client.rpc('get_driver_share_trips', { p_token: token }),
      client.rpc('get_driver_assignment_statuses', { p_token: token }),
      client.rpc('get_driver_accepted_views', { p_token: token }),
    ]);
    if (trips.error || !trips.data) { clear(); say('error', w.cannotLoad, w.checkConnection, load); return; }
    requirementNames = new Map((Array.isArray(trips.data.requirements) ? trips.data.requirements : []).map(r => [r.id, r.label]));
    statuses = new Map((answers.data || []).map(a => [keyOf(a.tripId, a.leg, a.role), a]));
    // A database without kept views answers with an error; nothing is kept.
    views = new Map((kept.error ? [] : kept.data || []).map(v => [keyOf(v.tripId, v.leg, v.role), v.view]));

    const today = todayIso();
    items = (s.assignmentRefs || []).map(ref => {
      const trip = (trips.data.trips || []).find(t => String(t.id) === String(ref.tripId));
      if (!trip) return { error: 'notLoaded' };
      if (trip.cancelled_at) return cancelledOf(ref, trip);
      return legOf(ref, trip, s.driver.id);
    }).filter(Boolean).filter(i => i.error || String(i.end || i.start || '').slice(0, 10) >= today)
      // Soonest first, and a leg that would not load after the rest.
      .sort((a, b) => (!!a.error - !!b.error) || String(a.start || '').localeCompare(String(b.start || '')));
    driverName = s.driver.shortName || s.driver.name;
    loadedAt = Date.now();
    draw();
  }
  let loadedAt = 0;

  // The greeting and the cards, drawn again in the other language when the
  // driver switches.
  let items = null;
  let driverName = '';
  function draw() {
    if (!items) return;
    $('scheduler-leg-hello').textContent = w.hello(driverName);
    shown = items.filter(i => !i.error && !i.cancelled);
    summarize();
    introEl.hidden = false;
    listEl.replaceChildren(...items.map(i => (i.error ? problemCard(i.error) : i.cancelled ? cancelledCard(i) : cardOf(i))));
    say(null);
    if (!items.length) say('info', w.noTrips, w.noTripsText);
  }

  /* THE SWITCH, under the greeting, written in the language it switches to,
     so a driver finds it whichever the page is in. The phone remembers it. */
  $('scheduler-leg-language')?.addEventListener('click', () => {
    const next = lang === 'es' ? 'en' : 'es';
    try { localStorage.setItem(LANG_KEY, next); } catch { /* the page still switches */ }
    setLanguage(next);
    draw();
  });

  /* The staff page, driver-view.html, draws a driver's page through this:
     driver-view.js picks the driver and their link, and hands over the token. */
  window.SchedulerDriverPage = {
    show: t => { token = t; return load().catch(() => say('error', w.wentWrong, w.checkConnection, load)); },
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
    $('scheduler-leg-language').hidden = false;
    run(load);
    // Coming back to the page reads the trips again, so an open phone never shows yesterday's card.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - loadedAt > 30e3) run(load);
    });
  }
})();
