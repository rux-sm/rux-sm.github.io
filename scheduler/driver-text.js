/* ==========================================================================
   Rux Scheduler — THE WORDING A DRIVER IS SENT
   --------------------------------------------------------------------------
   One leg as a driver reads it in a text, loaded by the Driver week info
   page and by the board and owned by neither: the week info message lists a
   driver's legs over their link, and the Contacts window's reminder sends one
   leg on its own, as its Tell does a leg that changed. One wording, so a
   reminder and the week's message never describe the same leg two ways. The Drivers page loads it for the address
   of a driver's link alone, so the link it copies is the one sent.

   IT TAKES A LEG, NOT A PAGE. Each page reads its own rows and hands in the
   same shape: { trip, leg, role, start, end, bus, spot, swap, instructions,
   partner, from, to, itinerary }, dates as Date and times as stored.

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
      pickup: 'Pickup',
      destination: 'Destination',
      itinerary: link => `Itinerary: ${link}`,
      reminderToday: name => `Hi ${name}, a reminder for your trip today:`,
      reminderTomorrow: name => `Hi ${name}, a reminder for your trip tomorrow:`,
      reminderSoon: name => `Hi ${name}, a reminder for your trip coming up:`,
      // "Hi Maria, your bus and spot time changed for today's trip."
      changed: (name, what, plural, when) => `Hi ${name}, your ${what} changed for ${when}.`,
      changedWhen: { today: "today's trip", tomorrow: "tomorrow's trip", soon: 'your upcoming trip' },
      changedWhat: {
        dates: 'dates', time: 'spot time', place: 'pickup', destination: 'destination', stops: 'stops',
        bus: 'bus', role: 'role', relief: 'relief details', requirements: 'requirements', itinerary: 'itinerary',
      },
      and: 'and',
      week:(name, range) => `Hi ${name}, here are your assignments for ${range}:`,
      noneTicked: name => `Hi ${name}, no trips are ticked yet.`,
      details: 'Trip details and itineraries:',
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
      pickup: 'Recogida',
      destination: 'Destino',
      itinerary: link => `Itinerario: ${link}`,
      reminderToday: name => `Hola ${name}, te recordamos tu viaje de hoy:`,
      reminderTomorrow: name => `Hola ${name}, te recordamos tu viaje de mañana:`,
      reminderSoon: name => `Hola ${name}, te recordamos tu próximo viaje:`,
      // "Hola Maria, cambió el autobús de tu viaje de hoy."
      changed: (name, what, plural, when) => `Hola ${name}, ${plural ? 'cambiaron' : 'cambió'} ${what} de ${when}.`,
      changedWhen: { today: 'tu viaje de hoy', tomorrow: 'tu viaje de mañana', soon: 'tu próximo viaje' },
      changedWhat: {
        dates: 'las fechas', time: 'la hora de llegada', place: 'el lugar de recogida', destination: 'el destino', stops: 'las paradas',
        bus: 'el autobús', role: 'el puesto', relief: 'los detalles del relevo', requirements: 'los requisitos', itinerary: 'el itinerario',
      },
      and: 'y',
      week:(name, range) => `Hola ${name}, estos son tus viajes del ${range}:`,
      noneTicked: name => `Hola ${name}, todavía no hay viajes marcados.`,
      details: 'Detalles e itinerarios de tus viajes:',
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

  /* A leg's stops, in route order. A drop-off and pickup trip saved before
     stops carried their leg keeps both legs in one run, split at the second
     pickup after the first return. */
  const stopsForLeg = (trip, leg) => {
    const all = [...(trip.trip_stops || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let out = all.filter(s => (s.leg || 'outbound') !== 'return');
    let back = all.filter(s => s.leg === 'return');
    if (trip.trip_type === 'dropoff_pickup' && !back.length) {
      const firstReturn = out.findIndex(s => s.type === 'return');
      const second = out.findIndex((s, i) => i > firstReturn && s.type === 'pickup');
      if (firstReturn >= 0 && second > firstReturn) { back = out.slice(second); out = out.slice(0, second); }
    }
    return leg === 'return' ? back : out;
  };

  /* One leg's lines: the day, bus, role and which way a split trip's leg
     runs; then a relief driver's swap, and their instructions, or everyone
     else's spot time; then where the leg runs from and to. `itinerary` adds
     the leg's itinerary link, which a message without a driver link carries. */
  function legLines(l, { itinerary = false, lang = 'en' } = {}) {
    const w = wordsFor(lang);
    const lines = [];
    const legWord = l.trip.trip_type === 'dropoff_pickup' ? (l.leg === 'return' ? w.inbound : w.outbound) : '';
    lines.push([messageDate(l.start, l.end, lang), l.bus ? w.bus(l.bus) : w.busNotSet, roleLabel(l.role, lang), legWord].filter(Boolean).join(' • '));
    if (isRelief(l.role)) {
      lines.push(l.swap ? w.swapAt(timeText(l.swap)) : l.partner ? w.swapWith(l.partner) : w.swapNotSet);
      if (l.instructions) lines.push(l.instructions);
    } else if (l.spot) {
      lines.push(w.spotAt(timeText(l.spot)));
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

  // What changed, in a list a sentence can hold: "bus", "bus and spot time", "bus, pickup and stops".
  const PLURAL = new Set(['dates', 'stops', 'relief', 'requirements']);
  const listOf = (items, and) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and} ${items.at(-1)}`);

  /* The news of a leg that changed, to one driver by their first name: one
     sentence naming what changed, from `changes`, the VIEW_KEYS names
     driver-job.js gives, then the leg's lines as it stands, then their link,
     where the leg reads in full. With no link, the leg's itinerary takes its
     place. */
  function change(first, l, today, changes, link, lang = 'en') {
    const w = wordsFor(lang);
    const keys = [...new Set(changes)].filter(k => w.changedWhat[k]);
    const plural = keys.length > 1 || PLURAL.has(keys[0]);
    const hello = w.changed(first, listOf(keys.map(k => w.changedWhat[k]), w.and), plural, w.changedWhen[whenOf(l, today)]);
    return [hello, '', ...legLines(l, { itinerary: !link, lang }),
      ...(link ? ['', w.details, link] : [])].join('\n');
  }

  window.SchedulerDriverText = {
    SITE, DRIVER_LINK, DOCUMENT_LINK, WORDS, wordsFor,
    messageDate, messageRange, timeText, town, roleLabel, isRelief, stopsForLeg, legLines, reminder, change,
  };
})();
