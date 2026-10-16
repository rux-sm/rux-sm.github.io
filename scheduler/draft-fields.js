/* ==========================================================================
   draft-fields.js — WHAT A DRAFT MAY FILL
   --------------------------------------------------------------------------
   The one list of the trip fields a draft may carry, read by the Claude
   app's connector, which refuses any other, and by the trip editor, which
   types each into its control. Each field has the kind of value it takes,
   checked before a draft is parked, and the place the editor puts it:

     id, kind    the control it is typed into, and how: text, date, time
     fleet       the trip's first vehicle, its type or the `need` it carries
     trip        a switch the editor keeps on the trip, under `tripKey`
     buses       empty vehicles added on a leg's Buses tab, up to the count
     billing     a purchase order or a signed contract, laid onto the
                 Billing list as a row a person adds there
     stops       the places between the pickup and the drop-off, each with
                 its day, laid out on the Route tab; on a change they
                 replace the opened leg's, after the editor asks
     stopChanges changes to a saved trip's stops, each named by the stop's
                 id as get_trip answers it: its arrive and leave times, its
                 day and leave day, and what its wait counts as. A change
                 never adds, removes or moves a stop.

   THE ORDER IS THE ORDER THEY ARE TYPED IN, whatever order a draft lists
   them: a field that shows or fills another comes before it, as the type
   comes before the pickup leg's dates it brings into the panel. The
   billing rows, the stops and the stop changes come last and have no
   control: the Billing and Route tabs lay them out.

   A deposit is money a person takes, so it is not here; a draft says it in
   its notes.
   ========================================================================== */
(() => {
  'use strict';

  const TRIP_TYPES = ['round_trip', 'one_way', 'dropoff_pickup'];
  // What a change to a saved stop may carry: its id and what changes.
  const STOP_CHANGES = ['id', 'arrive', 'leave', 'date', 'leave_date', 'dwell'];
  // What a purchase order and a signed contract may carry.
  const PURCHASE_ORDER = ['ref', 'date', 'amount'];
  const CONTRACT = ['signed_on', 'signed_by'];

  /* Each kind of value, and what a value of it must be. A check answers null
     for a value that fits, or the words for what it must be. */
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const realDate = v => DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
    && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
  const clock = v => /^\d{1,2}:\d{2}$/.test(String(v)) && Number(String(v).split(':')[0]) < 24 && Number(String(v).split(':')[1]) < 60;
  const dayOrNone = v => v == null || (typeof v === 'string' && realDate(v));
  const only = (v, keys) => !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v).length > 0 && Object.keys(v).every(k => keys.includes(k));
  const number = v => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/[$,\s]/g, '')) : NaN);
  const KINDS = {
    text: v => (typeof v === 'string' && v.trim() && v.length <= 200 ? null : 'words, up to 200 characters'),
    phone: v => (typeof v === 'string' && /^[\d\s()+.\-x]{7,30}$/.test(v.trim()) ? null : 'a phone number'),
    email: v => (typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'an email address'),
    date: v => (typeof v === 'string' && realDate(v) ? null : 'a date as YYYY-MM-DD'),
    time: v => (clock(v) ? null : 'a time as HH:MM'),
    tripType: v => (TRIP_TYPES.includes(v) ? null : `one of ${TRIP_TYPES.join(', ')}`),
    vehicleType: v => (typeof v === 'string' && v.trim() && v.length <= 20 ? null : 'a vehicle type, such as Coach or Van'),
    count: v => (Number.isInteger(number(v)) && number(v) >= 1 && number(v) <= 50 ? null : 'a whole number from 1 to 50'),
    people: v => (Number.isInteger(number(v)) && number(v) >= 1 && number(v) <= 1000 ? null : 'a whole number from 1 to 1000'),
    miles: v => (Number.isFinite(number(v)) && number(v) >= 0 && number(v) <= 20000 ? null : 'a number of miles'),
    money: v => (Number.isFinite(number(v)) && number(v) >= 0 ? null : 'an amount in dollars'),
    flag: v => (typeof v === 'boolean' ? null : 'true or false'),
    thread: v => (typeof v === 'string' && /^https:\/\/mail\.missiveapp\.com\//.test(v) ? null
      : 'the thread\'s address in Missive, starting https://mail.missiveapp.com/'),
    stops: v => (Array.isArray(v) && v.length <= 30 && v.every(s => !!s && typeof s === 'object'
      && (typeof s.name === 'string' || typeof s.address === 'string')
      && (s.arrive == null || clock(s.arrive)) && (s.leave == null || clock(s.leave))
      && dayOrNone(s.date) && dayOrNone(s.leave_date))
      ? null : 'a list of up to 30 places, each { name, address, arrive, leave, date, leave_date }: a name or an address, times as HH:MM, and days as YYYY-MM-DD'),
    stopChanges: v => (Array.isArray(v) && v.length && v.length <= 50 && v.every(c => !!c && typeof c === 'object'
      && /^[0-9a-f-]{36}$/i.test(String(c.id ?? ''))
      && Object.keys(c).every(k => STOP_CHANGES.includes(k)) && Object.keys(c).length > 1
      && ['arrive', 'leave'].every(k => !(k in c) || c[k] === null || clock(c[k]))
      && ['date', 'leave_date'].every(k => !(k in c) || (typeof c[k] === 'string' && realDate(c[k])))
      && (!('dwell' in c) || ['on', 'off', 'sleeper'].includes(c.dwell)))
      ? null : 'a list of up to 50 changes, each { id, arrive, leave, date, leave_date, dwell }: the stop\'s id from get_trip and at least one of the rest, times as HH:MM or null, days as YYYY-MM-DD, and dwell one of on, off, sleeper'),
    purchaseOrder: v => (only(v, PURCHASE_ORDER)
      && (v.ref == null || (typeof v.ref === 'string' && v.ref.trim() && v.ref.length <= 60))
      && dayOrNone(v.date) && (v.amount == null || (Number.isFinite(number(v.amount)) && number(v.amount) >= 0))
      && (v.ref != null || v.amount != null)
      ? null : '{ ref, date, amount }: its number or its amount at least, the day as YYYY-MM-DD and the amount in dollars'),
    contract: v => (only(v, CONTRACT) && dayOrNone(v.signed_on)
      && (v.signed_by == null || (typeof v.signed_by === 'string' && v.signed_by.trim() && v.signed_by.length <= 200))
      ? null : '{ signed_on, signed_by }: the day it was signed as YYYY-MM-DD and who signed it'),
  };

  const FIELDS = [
    { key: 'destination', value: 'text', id: 'scheduler-f-destination', kind: 'text' },
    { key: 'customer', value: 'text', id: 'scheduler-f-customer', kind: 'text' },
    { key: 'trip_type', value: 'tripType', id: 'scheduler-f-type', kind: 'select' },
    { key: 'start_date', value: 'date', id: 'scheduler-f-start', kind: 'date' },
    { key: 'end_date', value: 'date', id: 'scheduler-f-end', kind: 'date' },
    { key: 'return_start_date', value: 'date', id: 'scheduler-f-rstart', kind: 'date' },
    { key: 'return_end_date', value: 'date', id: 'scheduler-f-rend', kind: 'date' },
    { key: 'passengers', value: 'people', id: 'scheduler-f-passengers', kind: 'text' },
    // The email thread's address, behind the Email label's Email thread link.
    { key: 'booking_contact_missive_url', value: 'thread', id: 'scheduler-f-cthread', kind: 'text' },
    // What the vehicle is and needs goes to the trip's first vehicle.
    { key: 'vehicle_type', value: 'vehicleType', kind: 'fleet' },
    { key: 'req_sleeper', value: 'flag', kind: 'fleet', need: 'sleeper' },
    { key: 'req_ada', value: 'flag', kind: 'fleet', need: 'adaLift' },
    { key: 'req_56pax', value: 'flag', kind: 'fleet', need: 'pax56' },
    // The hotel reminder and the fuel card are the trip's own, kept in the editor.
    { key: 'need_hotel', value: 'flag', kind: 'trip', tripKey: 'hotelWanted' },
    { key: 'need_fuel_card', value: 'flag', kind: 'trip', tripKey: 'fuelCard' },
    /* How many vehicles a leg has. Empty ones are added on the Buses tab up
       to the count, each asking what the first asks, and none is taken away;
       they come after the first vehicle's type and needs, which they copy. */
    { key: 'bus_count', value: 'count', kind: 'buses', leg: 'outbound' },
    { key: 'return_bus_count', value: 'count', kind: 'buses', leg: 'return' },
    { key: 'quoted_price', value: 'money', id: 'scheduler-f-quoted', kind: 'text' },
    { key: 'est_miles', value: 'miles', id: 'scheduler-f-estmiles', kind: 'text' },
    { key: 'booking_contact_name', value: 'text', id: 'scheduler-f-cfind', kind: 'text' },
    { key: 'booking_contact_phone', value: 'phone', id: 'scheduler-f-cphone', kind: 'text' },
    { key: 'booking_contact_email', value: 'email', id: 'scheduler-f-cemail', kind: 'text' },
    { key: 'trip_contact_1_name', value: 'text', id: 'scheduler-f-d1', kind: 'text' },
    { key: 'trip_contact_1_phone', value: 'phone', id: 'scheduler-f-dphone1', kind: 'text' },
    { key: 'trip_contact_2_name', value: 'text', id: 'scheduler-f-d2', kind: 'text' },
    { key: 'trip_contact_2_phone', value: 'phone', id: 'scheduler-f-dphone2', kind: 'text' },
    // The Route tab. It is built when the panel opens, so these are on screen from the start.
    { key: 'pickup_location', value: 'text', id: 'scheduler-f-pickupname', kind: 'text' },
    { key: 'pickup_address', value: 'text', id: 'scheduler-f-pickup', kind: 'place' },
    { key: 'dropoff_location', value: 'text', id: 'scheduler-f-dropname', kind: 'text' },
    { key: 'dropoff_address', value: 'text', id: 'scheduler-f-dropoff', kind: 'place' },
    // The group's two times; the bus's own are worked out from them.
    { key: 'departure_time', value: 'time', id: 'scheduler-f-leave', kind: 'time' },
    { key: 'return_time', value: 'time', id: 'scheduler-f-endtrip', kind: 'time' },
    // A purchase order and a signed contract, rows of the Billing list.
    { key: 'purchase_order', value: 'purchaseOrder', kind: 'billing' },
    { key: 'contract', value: 'contract', kind: 'billing' },
    // The places between the pickup and the drop-off; on a change, the opened leg's again.
    { key: 'stops', value: 'stops', kind: 'stops' },
    // Changes to a saved trip's stops, which only a change to a trip takes.
    { key: 'stop_changes', value: 'stopChanges', kind: 'stopChanges' },
  ];
  const byKey = new Map(FIELDS.map(f => [f.key, f]));

  /* What is wrong with a draft's fields, as sentences, or none. `change` is a
     draft of an existing trip, which alone changes saved stops. A null value
     clears nothing and is refused, since a draft only fills. */
  function problems(fields, { change = false } = {}) {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return ['fields is an object of trip fields.'];
    const keys = Object.keys(fields);
    if (!keys.length) return ['A draft with no fields is nothing to check.'];
    const out = [];
    const unknown = keys.filter(k => !byKey.has(k));
    if (unknown.length) {
      out.push(`These are not trip fields a draft can fill: ${unknown.join(', ')}. Allowed: ${FIELDS.map(f => f.key).join(', ')}.`);
    }
    for (const key of keys.filter(k => byKey.has(k))) {
      const wrong = KINDS[byKey.get(key).value](fields[key]);
      if (wrong) out.push(`${key} is ${wrong}.`);
    }
    if ('stops' in fields && 'stop_changes' in fields) {
      out.push('stops replace the leg\'s stops, so a draft carries stops or stop_changes, not both.');
    }
    if (!change && 'stop_changes' in fields) {
      out.push('stop_changes changes a saved trip\'s stops, so it goes with a change to a trip; a new trip\'s are its stops.');
    }
    return out;
  }

  window.SchedulerDraftFields = { FIELDS, KINDS, TRIP_TYPES, STOP_CHANGES, PURCHASE_ORDER, CONTRACT, byKey, problems };
})();
