/* ==========================================================================
   Rux Scheduler — THE WORDING A DRIVER IS SENT
   --------------------------------------------------------------------------
   One leg as a driver reads it in a text, loaded by the Driver week info
   page and by the board and owned by neither: the week info message lists a
   driver's legs over their link, and the Contacts window's reminder sends one
   leg on its own, as its Tell does a leg that changed. One wording, so a
   reminder and the week's message never describe the same leg two ways. The Drivers page loads it for the address
   of a driver's link, so the link it copies is the one sent, and for the
   text its Forms tab sends a driver their forms with.

   IT TAKES A LEG, NOT A PAGE. Each page reads its own rows and hands in the
   same shape: { trip, inbound, role, start, end, bus, spot, dropoff, swap,
   instructions, partner, from, to, toYard, itinerary }, dates as Date and
   times as stored; `dropoff` is when the group is let off, the time the
   bus leaves its last place for the yard. `inbound` is a split trip's pickup, every leg after its
   first, as trip-shape.js orders them.

   IT WRITES IN THE DRIVER'S LANGUAGE, `en` or `es` from their profile, which
   each caller passes in; English when none is. What the office typed, a
   place or an instruction, stays as typed. The Spanish speaks to the driver
   as tú. The two tables hold the same lines, which
   tools/check-driver-words.mjs holds them to.
   ========================================================================== */
(() => {
  'use strict';

  // Always the published site: a link goes to a driver's phone, which cannot
  // reach a preview running on this Mac.
  const SITE = 'https://rux-sm.github.io';
  const DRIVER_LINK = `${SITE}/scheduler/share/driver.html?s=`;
  const DOCUMENT_LINK = `${SITE}/scheduler/share/document.html?id=`;

  const clean = v => String(v ?? '').trim();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const short = (d, opts, locale = 'en-US') => d.toLocaleDateString(locale, opts);
  /* "THU 10/1", or "THU 10/1–SUN 10/4" across days. In Spanish the month is
     a word, "JUE 1 OCT", since a Spanish reader may take 10/1 for January. */
  const messageDate = (a, b, lang = 'en') => {
    const one = lang === 'es'
      ? d => `${short(d, { weekday: 'short' }, 'es-MX')} ${d.getDate()} ${short(d, { month: 'short' }, 'es-MX')}`.replace(/\./g, '').toUpperCase()
      : d => `${short(d, { weekday: 'short' }).toUpperCase()} ${d.getMonth() + 1}/${d.getDate()}`;
    return iso(a) === iso(b) ? one(a) : `${one(a)}–${one(b)}`;
  };
  // "11:43 AM", from a stored "11:43:00".
  const timeText = v => {
    const t = clean(v);
    if (/[ap]m$/i.test(t)) return t.toUpperCase();
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    const h = +m[1];
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
  };
  // "Invented High School, 1 Main St, Brownsville, TX 78520" as "Brownsville".
  const town = v => {
    const parts = clean(v).split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return clean(v);
    if (/^(united states|usa|us)$/i.test(parts.at(-1))) parts.pop();
    if (parts.length > 1 && /^(texas|tx|oklahoma|ok)(\s+\d{5}(?:-\d{4})?)?$/i.test(parts.at(-1))) parts.pop();
    return parts.at(-1);
  };
  /* WHAT A TEXT SAYS, in each language. A line that takes something from the
     leg is a function of it. */
  const WORDS = {
    en: {
      role: { 'driver': 'Driver', 'co-driver': 'Co-driver', 'relief': 'Relief driver' },
      bus: number => `Bus ${number}`,
      busNotSet: 'Bus not set',
      yard: 'Yard',
      inbound: 'Inbound',
      outbound: 'Outbound',
      swapAt: time => `${time} swap`,
      swapWith: name => `Swap: coordinate with ${name}`,
      swapNotSet: 'Swap time not set',
      spotAt: time => `${time} spot`,
      dropoffAt: (time, day) => `${day ? `${day} ` : ''}${time} drop-off`,
      pickup: 'Pickup',
      destination: 'Destination',
      itinerary: link => `Itinerary: ${link}`,
      reminderToday: name => `Hi ${name}, a reminder for your trip today:`,
      reminderTomorrow: name => `Hi ${name}, a reminder for your trip tomorrow:`,
      reminderSoon: name => `Hi ${name}, a reminder for your trip coming up:`,
      // "Hello Maria," and "There was an update to Saturday's trip:".
      hello: name => `Hello ${name},`,
      update: trip => `There was an update to ${trip}:`,
      tripOn: { today: "today's trip", tomorrow: "tomorrow's trip", weekday: day => `${day}'s trip`, date: day => `your trip on ${day}` },
      and: 'and',
      week:(name, range) => `Hi ${name}, here are your assignments for ${range}:`,
      noneTicked: name => `Hi ${name}, no trips are ticked yet.`,
      details: 'Trip details and itineraries:',
      forms: (name, list, link) => `Hi ${name}, please fill out and sign ${list} for Escamilla Tour Buses. It takes a few minutes on your phone: ${link}`,
    },
    es: {
      role: { 'driver': 'Chofer', 'co-driver': 'Segundo chofer', 'relief': 'Chofer de relevo' },
      bus: number => `Autobús ${number}`,
      busNotSet: 'Autobús sin asignar',
      yard: 'Patio',
      inbound: 'Regreso',
      outbound: 'Ida',
      swapAt: time => `Relevo a las ${time}`,
      swapWith: name => `Relevo: acuerda la hora con ${name}`,
      swapNotSet: 'Hora del relevo sin definir',
      spotAt: time => `Llegar a las ${time}`,
      dropoffAt: (time, day) => `dejar al grupo ${day ? `el ${day} ` : ''}a las ${time}`,
      pickup: 'Recogida',
      destination: 'Destino',
      itinerary: link => `Itinerario: ${link}`,
      reminderToday: name => `Hola ${name}, te recordamos tu viaje de hoy:`,
      reminderTomorrow: name => `Hola ${name}, te recordamos tu viaje de mañana:`,
      reminderSoon: name => `Hola ${name}, te recordamos tu próximo viaje:`,
      // "Hola Maria," and "Hubo un cambio en tu viaje del sábado:".
      hello: name => `Hola ${name},`,
      update: trip => `Hubo un cambio en ${trip}:`,
      tripOn: { today: 'tu viaje de hoy', tomorrow: 'tu viaje de mañana', weekday: day => `tu viaje del ${day}`, date: day => `tu viaje del ${day}` },
      and: 'y',
      week:(name, range) => `Hola ${name}, estos son tus viajes del ${range}:`,
      noneTicked: name => `Hola ${name}, todavía no hay viajes marcados.`,
      details: 'Detalles e itinerarios de tus viajes:',
      forms: (name, list, link) => `Hola ${name}, por favor llena y firma ${list} para Escamilla Tour Buses. Toma unos minutos desde tu teléfono: ${link}`,
    },
  };
  const wordsFor = lang => WORDS[lang === 'es' ? 'es' : 'en'];
  /* The days a week's message covers: "Oct 12 – Oct 25, 2026", or one day
     as "Sat, Oct 17, 2026"; in Spanish, after the message's "del", "12 de
     octubre al 25 de octubre de 2026", or "sábado 17 de octubre de 2026". */
  const messageRange = (a, b, lang = 'en') => {
    if (lang === 'es') {
      const day = d => `${d.getDate()} de ${short(d, { month: 'long' }, 'es-MX')}`;
      return iso(a) === iso(b) ? `${short(a, { weekday: 'long' }, 'es-MX')} ${day(a)} de ${a.getFullYear()}`
        : `${day(a)} al ${day(b)} de ${b.getFullYear()}`;
    }
    return iso(a) === iso(b) ? short(a, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : `${short(a, { month: 'short', day: 'numeric' })} – ${short(b, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };
  const ROLE_KEY = { 'driver': 'driver', 'co-driver': 'co-driver', 'relief-start': 'relief', 'relief-end': 'relief' };
  const roleLabel = (r, lang) => wordsFor(lang).role[ROLE_KEY[r] || 'driver'];
  const isRelief = r => r === 'relief-start' || r === 'relief-end';

  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* One leg's lines: the day, bus, role and which way a split trip's leg
     runs; then a relief driver's swap, and their instructions, or everyone
     else's spot time and the time the group is let off, which says how long
     the day runs, with its day on a leg of more than one; then where the leg
     runs from and to. `itinerary` adds the
     leg's itinerary link, which a message without a driver link carries. */
  function legLines(l, { itinerary = false, lang = 'en' } = {}) {
    const w = wordsFor(lang);
    const lines = [];
    const legWord = window.SchedulerTripShape.isSplit(l.trip) ? (l.inbound ? w.inbound : w.outbound) : '';
    lines.push([messageDate(l.start, l.end, lang), l.bus ? w.bus(l.bus) : w.busNotSet, roleLabel(l.role, lang), legWord].filter(Boolean).join(' • '));
    if (isRelief(l.role)) {
      lines.push(l.swap ? w.swapAt(timeText(l.swap)) : l.partner ? w.swapWith(l.partner) : w.swapNotSet);
      if (l.instructions) lines.push(l.instructions);
    } else if (l.spot || l.dropoff) {
      // A leg of more than one day lets the group off on its last, which it names.
      const last = iso(l.start) === iso(l.end) ? ''
        : lang === 'es' ? short(l.end, { weekday: 'long' }, 'es-MX') : short(l.end, { weekday: 'short' }).toUpperCase();
      lines.push(capital([l.spot && w.spotAt(timeText(l.spot)), l.dropoff && w.dropoffAt(timeText(l.dropoff), last)].filter(Boolean).join(' · ')));
    }
    const a = town(l.from), b = town(l.to);
    // `toYard` is a leg that ends back at the yard, which the office may leave unnamed.
    if (a || b || l.toYard) lines.push(`${a || w.pickup} → ${b || (l.toYard ? w.yard : w.destination)}`);
    if (itinerary && l.itinerary) lines.push(w.itinerary(`${DOCUMENT_LINK}${encodeURIComponent(l.itinerary)}`));
    return lines;
  }

  // Whether a leg leaves today, tomorrow or later, from `today` as yyyy-mm-dd.
  const whenOf = (l, today) => {
    const [y, m, d] = today.split('-').map(Number);
    return iso(l.start) === today ? 'today' : iso(l.start) === iso(new Date(y, m - 1, d + 1)) ? 'tomorrow' : 'soon';
  };

  /* The reminder for one leg, to one driver by their first name: today,
     tomorrow, or coming up, from `today` as yyyy-mm-dd on the office's
     calendar, then the leg's lines and its itinerary. */
  function reminder(first, l, today, lang = 'en') {
    const w = wordsFor(lang);
    const when = whenOf(l, today);
    const hello = when === 'today' ? w.reminderToday : when === 'tomorrow' ? w.reminderTomorrow : w.reminderSoon;
    return [hello(first), '', ...legLines(l, { itinerary: true, lang })].join('\n');
  }

  /* The trip a change is to, as the driver says it: today's, tomorrow's,
     one later this week by its weekday, or one further off by its date. A
     leg under way is today's. */
  const tripOn = (l, today, lang) => {
    const w = wordsFor(lang);
    const when = whenOf(l, today);
    if (when !== 'soon') return w.tripOn[when];
    const [y, m, d] = today.split('-').map(Number);
    const days = Math.round((l.start - new Date(y, m - 1, d)) / 86400000);
    if (days < 0) return w.tripOn.today;
    const locale = lang === 'es' ? 'es-MX' : 'en-US';
    const weekday = short(l.start, { weekday: 'long' }, locale);
    if (days < 7) return w.tripOn.weekday(weekday);
    return w.tripOn.date(lang === 'es' ? `${weekday} ${l.start.getDate()} de ${short(l.start, { month: 'long' }, locale)}`
      : short(l.start, { weekday: 'short', month: 'short', day: 'numeric' }, locale));
  };

  /* The news of a leg that changed, to one driver by their first name: that
     the trip had an update, named by its day, then each change on a line of
     its own, as driver-job.js words it in the driver's language, then their
     link, where the leg reads in full, or with none the leg's itinerary. */
  function change(first, l, today, lines, link, lang = 'en') {
    const w = wordsFor(lang);
    const more = link ? [w.details, link] : l.itinerary ? [w.itinerary(`${DOCUMENT_LINK}${encodeURIComponent(l.itinerary)}`)] : [];
    return [w.hello(first), w.update(tripOn(l, today, lang)), ...lines.map(x => `• ${x}`),
      ...(more.length ? ['', ...more] : [])].join('\n');
  }

  /* The text that sends a driver their forms: each title in their language,
     joined as a sentence joins them, and their link, which opens with the
     forms at the top. */
  const forms = (name, titles, token, lang = 'en') => {
    const w = wordsFor(lang);
    const list = titles.length > 1 ? `${titles.slice(0, -1).join(', ')} ${w.and} ${titles.at(-1)}` : titles[0] ?? '';
    return w.forms(name, list, `${DRIVER_LINK}${token}`);
  };

  window.SchedulerDriverText = {
    SITE, DRIVER_LINK, DOCUMENT_LINK, WORDS, wordsFor, forms,
    messageDate, messageRange, timeText, town, roleLabel, isRelief, legLines, reminder, change,
  };
})();
