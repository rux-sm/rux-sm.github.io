/* ==========================================================================
   leg-facts.js — WHAT A LEG'S BUSES, SEATS AND CONTACT SAY
   --------------------------------------------------------------------------
   The one reading of a trip's needs, of who rides each bus and of its day-of
   contact, loaded by every Scheduler page, so the to-do list on any page
   reads a leg as the board does. Four parts:

     Needs     the office's requirement list, which of a trip's needs are a
               vehicle's, and where a bus falls short of one
     Crew      the roles an assignment turns on, who fills each and their status
     Contact   a contact as the trip records it, and its day-of contact
     Facts     `factsOf`, what checklist.js is handed for a leg

   Nothing here reads the database or the page. The page that read the
   office's list hands it to `setRequirementList`, and `factsOf` is handed
   the buses, the drivers and the driver statuses by whoever read them.
   Needs requirements.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  /* WHAT A TRIP NEEDS, and how a bar says it. The table itself is
     `requirements.js`, which the forms page loads too, so a requirement is one
     drawing and one name wherever it shows.

     THE LIST IS THE OFFICE'S. rux-ui's Settings page edits it and it already
     holds more than that table does, so a requirement is named from the
     office's list and falls back to the table, then to its own id. Dropping
     one the table does not know would take it off the bar without saying so. */
  const REQUIREMENTS = window.SchedulerRequirements || {};

  /* The office's list, as Settings holds it: `{ id, label, type, active,
     sortOrder }`. Empty until the week is read, and empty if that read was
     refused, which leaves the names above standing. */
  let requirementList = [];
  function setRequirementList(list) {
    if (!Array.isArray(list)) return;
    requirementList = list.filter(r => r && typeof r.id === 'string' && r.label);
  }
  const requirementLabel = id =>
    requirementList.find(r => r.id === id)?.label || REQUIREMENTS[id]?.label || id;
  // The drawing, from this app's table or else by the name the office's list gives it.
  const REQUIREMENT_ICONS = window.SchedulerRequirementIcons || {};
  const requirementIcon = id => REQUIREMENTS[id]?.icon
    || REQUIREMENT_ICONS[requirementList.find(r => r.id === id)?.icon] || null;

  /* The needs the editor offers: the office's active list, vehicle before
     driver and each in its own order, which is how rux-ui's trip panel groups
     them. Before that list has been read the five this app names itself stand,
     so the row is never empty and the connector always has a tag to type into. */
  const FALLBACK_NEEDS = ['sleeper', 'pax56', 'adaLift', 'hotel', 'fuelCard'];
  function editableNeeds() {
    const active = requirementList.filter(r => r.active !== false);
    if (!active.length) return FALLBACK_NEEDS.map(id => ({ id, label: REQUIREMENTS[id].label }));
    const byType = t => active.filter(r => (r.type || 'vehicle') === t)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return [...byType('vehicle'), ...byType('driver')];
  }

  /* A need is the vehicle's or the trip's. Sleeper, 56 passengers, ADA lift and
     anything else the office lists as vehicle equipment are asked of each
     vehicle, on its own `trip_assignments` row; Hotel and Fuel card are the
     trip's. Before the office's list is read, the three this app knows are the
     vehicle's. */
  const VEHICLE_FALLBACK = new Set(['sleeper', 'pax56', 'adaLift']);
  const isVehicleNeed = id => {
    const r = requirementList.find(x => x.id === id);
    return r ? (r.type || 'vehicle') === 'vehicle' : VEHICLE_FALLBACK.has(id);
  };

  // The ids a needs object holds true, sorted, so two can be compared.
  const needIds = o => (o && typeof o === 'object' ? Object.keys(o).filter(k => o[k] === true).sort() : []);

  /* The ids a trip carries, from `trip_reqs` where it is set and the older
     columns where it is not -- the pair rux-ui reads, and print.js with it. */
  function requirementsOf(trip) {
    const reqs = trip.trip_reqs;
    const on = reqs && typeof reqs === 'object' && Object.keys(reqs).length
      ? Object.entries(reqs).filter(([, v]) => v).map(([k]) => k)
      : [['pax56', trip.req_56pax], ['sleeper', trip.req_sleeper], ['adaLift', trip.req_ada],
         ['hotel', trip.need_hotel], ['fuelCard', trip.need_fuel_card]]
        .filter(([, v]) => v).map(([k]) => k);
    /* In the office's own order, the same one the editor lays its tags out in,
       so a need sits in the same place on the bar as in the panel. Anything
       the trip carries that is not on the list -- a need since deactivated --
       follows in the order the trip holds it, rather than being dropped. */
    const order = editableNeeds().map(r => r.id);
    return [...order.filter(id => on.includes(id)), ...on.filter(id => !order.includes(id))];
  }

  /* Where the bus this leg is on falls short of a requirement, said in full,
     or null. No bus means nothing to compare, and an unrecorded capacity is
     not a shortfall. */
  function shortfall(id, bus) {
    if (!bus) return null;
    if (id === 'sleeper' && !bus.sleeper) return 'Sleeper needed';
    if (id === 'adaLift' && !bus.ada_lift) return 'ADA lift needed';
    if (id === 'pax56' && bus.capacity != null && bus.capacity < 56) return '56 seats needed';
    // Any other equipment is the unit's `equipment`, set on the Fleet page.
    if (!VEHICLE_FALLBACK.has(id) && isVehicleNeed(id) && !bus.equipment?.[id]) {
      return `${requirementLabel(id)} needed`;
    }
    return null;
  }

  /* A bar's needs: its vehicle's own, which its row holds, then the trip's;
     a bar with no row yet, an empty slot, takes the trip's whole list. In the
     office's order, anything off the list after it. */
  function needsFor(trip, assign) {
    const all = requirementsOf(trip);
    if (!assign) return all;
    const on = new Set([...needIds(assign.needs), ...all.filter(id => !isVehicleNeed(id))]);
    const order = editableNeeds().map(r => r.id);
    return [...order.filter(id => on.has(id)), ...[...on].filter(id => !order.includes(id))];
  }

  /* The warning for a bus of another type than the trip needs, or null. A trip
     with no type takes any bus, and a bus with no type is not a mismatch. */
  function wrongType(type, bus) {
    if (!type || !bus?.type || bus.type === type) return null;
    return `${type} needed`;
  }

  /* A driver's role and status on a bar. The roles are rux-ui's four, in the
     order the drivers row lists them. Relief is the one role that is not a
     person, so it cannot be taken for a co-driver at 12px. */
  const ROLES = [
    /* The box is the one the <svg> around the <use> takes, and it is a plain
       `0 0 n n` for every role. It is NOT the symbol's own viewBox: Material
       draws on `0 -960 960 960`, and a <use> with no x or y sits at the outer
       box's origin, so an outer box starting at -960 puts the glyph a whole
       viewport below what is shown and nothing appears. The symbol scales its
       own drawing into whatever box it is given. */
    { role: 'driver', label: 'Driver', icon: '#m-person-fill', box: '0 0 32 32' },
    { role: 'co-driver', label: 'Co-driver', icon: '#m-person-fill', box: '0 0 32 32' },
    { role: 'relief-start', label: 'Relief start', icon: '#m-swap_horiz-fill', box: '0 0 32 32' },
    { role: 'relief-end', label: 'Relief end', icon: '#m-swap_horiz-fill', box: '0 0 32 32' },
  ];
  /* The five states `trip_driver_statuses` holds, and the tone each paints.
     Not sent is grey rather than no disc at all: it is the first step of the
     run, not the absence of one. Its stored value stays `off`, which is what
     rux-ui writes. */
  const DRIVER_STATUSES = [
    { value: 'off', label: 'Not sent', tone: 'off' },
    { value: 'pending-assignment', label: 'Pending assignment', tone: 'error' },
    { value: 'pending-response', label: 'Pending response', tone: 'warning' },
    { value: 'confirmed', label: 'Confirmed', tone: 'success' },
    { value: 'declined', label: 'Declined', tone: 'error' },
  ];
  // A status row's identity, as rux-ui keys it: trip, driver, leg and role.
  const statusKey = (tripId, driverId, leg, role) =>
    [tripId, driverId, leg || 'outbound', role || 'driver'].join(':');

  // The tone names rux-ui once saved in place of a status.
  const LEGACY_STATUS = { default: 'off', danger: 'pending-assignment', warning: 'pending-response', success: 'confirmed' };

  /* The roles an assignment turns on, each with the status rux-ui once saved
     after it as `role:state`, which a trip with no status row still shows. An
     assignment without the column keeps every role it has a driver in, and
     the driver role is always on. */
  function activeRolesOf(assign) {
    const on = new Map([['driver', 'off']]);
    const saved = Array.isArray(assign.active_roles)
      ? assign.active_roles.map(String)
      : (assign.trip_drivers || []).map(d => d.role || 'driver');
    for (const entry of saved) {
      const [role, state] = entry.split(':');
      on.set(role, LEGACY_STATUS[state] ?? state ?? 'off');
    }
    return on;
  }

  /* An assignment's crew in role order: each driver in a role that is on, with
     their status, and each role that is on with nobody in it. */
  function crewOf(trip, assign, driversById, statuses) {
    const on = activeRolesOf(assign);
    const leg = assign.leg || 'outbound';
    const crew = [];
    for (const r of ROLES) {
      if (!on.has(r.role)) continue;
      const filled = (assign.trip_drivers || []).filter(d => d.driver_id && (d.role || 'driver') === r.role);
      for (const d of filled) {
        const row = statuses?.get(statusKey(trip.id, d.driver_id, leg, r.role)) ?? null;
        const value = row ? row.status : on.get(r.role);
        crew.push({
          ...r, leg, row, driverId: d.driver_id, who: driversById.get(d.driver_id), reportTime: d.report_time ?? null,
          status: DRIVER_STATUSES.find(x => x.value === value) ?? DRIVER_STATUSES[0],
        });
      }
      if (!filled.length) crew.push({ ...r, leg, needed: true });
    }
    return crew;
  }

  /* A contact as the trip records it. rux-ui keeps each contact's name, phone
     and email on the trip itself and links the contact beside them, so the
     trip's own copy comes first; a trip with only a link shows the linked
     contact. Slot 0 is the booking contact, 1 to 5 the day-of ones. */
  function tripContact(trip, slot) {
    const pre = slot === 0 ? 'booking_contact' : `trip_contact_${slot}`;
    const linked = slot === 0 ? trip.contacts : trip[`c${slot}`];
    const name = trip[`${pre}_name`];
    if (name) {
      return { id: trip[`${pre}_id`] ?? null, name, phone: trip[`${pre}_phone`] ?? null,
               email: slot === 0 ? trip.booking_contact_email ?? null : null };
    }
    return linked ? { id: linked.id, name: linked.name ?? '', phone: linked.phone ?? null, email: linked.email ?? null } : null;
  }

  /* The trip's day-of contact: the first of the five slots that holds anyone,
     or null. The card says when there is none. */
  const dayOfContact = trip => [1, 2, 3, 4, 5].map(n => tripContact(trip, n)).find(Boolean) ?? null;

  /* A leg's buses and seats as its checklist reads them: how many buses it
     needs and has, how many fall short of the trip, the seats open and filled,
     the drivers not confirmed, the envelopes and the itineraries not printed,
     whether a part-time driver rides, how many of them still lack their
     hours-of-service form, and how many of the leg's buses have no fuel card
     number yet, which only a trip with a card asks. */
  function factsOf(trip, leg, { busesById = new Map(), driversById = new Map(), statuses = new Map() } = {}) {
    const assigns = (trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === leg);
    const busesNeeded = leg === 'return' ? (trip.return_bus_count || trip.bus_count || 1) : (trip.bus_count || 1);
    const facts = { busesNeeded, busesAssigned: 0, busesShort: 0, seatsOpen: 0, seats: 0, unconfirmed: 0, envelopesLeft: 0, itinerariesLeft: 0, partTime: false, hosLeft: 0,
      fuelCardsLeft: Math.max(0, busesNeeded - assigns.filter(a => String(a.fuel_card_number ?? '').trim()).length) };
    for (const a of assigns) {
      if (a.bus_id == null) continue;
      facts.busesAssigned++;
      const bus = busesById.get(a.bus_id);
      if (bus && (wrongType(a.vehicle_type, bus) || needsFor(trip, a).some(id => id !== 'hotel' && shortfall(id, bus)))) facts.busesShort++;
    }
    for (const a of assigns) {
      for (const c of crewOf(trip, a, driversById, statuses)) {
        if (c.needed) { facts.seatsOpen++; continue; }
        facts.seats++;
        if (c.status?.value !== 'confirmed') facts.unconfirmed++;
      }
      const roles = activeRolesOf(a);
      for (const d of a.trip_drivers || []) {
        if (!d.driver_id || !roles.has(d.role || 'driver')) continue;
        if (!d.envelope_printed) facts.envelopesLeft++;
        if (!d.itinerary_printed) facts.itinerariesLeft++;
        if (driversById.get(d.driver_id)?.employment_type === 'part-time') {
          facts.partTime = true;
          if (!d.hos_form_printed) facts.hosLeft++;
        }
      }
    }
    return facts;
  }

  window.SchedulerLegFacts = {
    REQUIREMENTS, setRequirementList, requirementLabel, requirementIcon, editableNeeds, isVehicleNeed,
    needIds, requirementsOf, shortfall, needsFor, wrongType,
    ROLES, DRIVER_STATUSES, statusKey, activeRolesOf, crewOf, tripContact, dayOfContact, factsOf,
  };
})();
