/* ==========================================================================
   share/form.js — A DRIVER'S SHEET FOR ONE TRIP LEG
   --------------------------------------------------------------------------
   form.html?s=<token>&form=envelope|driver-itinerary&trip=<id>&leg=<leg>
   shows a driver, without a log-in, the envelope for their seat or the
   office's itinerary for the leg, as the forms page draws them. The card on
   their schedule link opens it; the card holds the basics and this holds the
   rest.

   The trip comes through the link's token, from get_driver_share_trips, so
   the sheet shows only a trip the link carries. The drawing is
   ../print.js's own: this page hands its renderers a subject built the way
   the forms page builds one, and nothing is typed into or marked printed.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const client = window.Rux?.account?.client;
  const forms = window.SchedulerForms;
  const params = new URLSearchParams(location.search);
  const token = (params.get('s') ?? '').trim().toLowerCase();
  const tripId = params.get('trip') ?? '';
  const leg = params.get('leg') === 'return' ? 'return' : 'outbound';
  const form = forms?.FORMS.find(f => f.id === params.get('form') && ['envelope', 'driver-itinerary'].includes(f.id));

  const back = $('scheduler-sheet-back');
  back.href = `driver.html?s=${encodeURIComponent(token)}`;

  const say = (title, text) => {
    $('scheduler-sheet-notice-title').textContent = title;
    $('scheduler-sheet-notice-text').textContent = text || '';
    $('scheduler-sheet-notice').hidden = false;
  };

  // -- the paper at the phone's width -----------------------------------------
  // The envelope is one sheet and keeps its paper's width, as on the forms
  // page, and `zoom` in print.css takes it down whole to the room. The
  // itinerary runs onto as many sheets as it needs, and a Letter page taken
  // down to a phone is too small to read, so it takes the room's width and
  // reflows, with the paper's white margin kept narrow.
  const sheet = $('scheduler-sheet');
  const exact = Boolean(form?.page?.exact);
  const inches = v => (String(v || '').endsWith('in') ? parseFloat(v) * 96 : NaN);
  function fit() {
    const wide = inches(form?.page?.width);
    const root = document.documentElement.style;
    if (!exact || !Number.isFinite(wide)) return root.removeProperty('--scheduler-fit');
    const f = Math.min(1, sheet.clientWidth / wide);
    if (f > 0) root.setProperty('--scheduler-fit', String(Math.round(f * 1000) / 1000));
  }
  function setPaper() {
    const root = document.documentElement.style;
    if (exact) {
      root.setProperty('--scheduler-paper-width', form.page.width);
      root.setProperty('--scheduler-paper-height', form.page.height);
      root.setProperty('--scheduler-paper-margin', form.page.margin);
    } else {
      root.setProperty('--scheduler-paper-margin', 'var(--rux-spacing-05)');
    }
    fit();
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(sheet);

  // -- the subject, as the forms page builds it --------------------------------
  // A seat counts only while its bus lists its role, as on the schedule link.
  const seated = (a, driverId) => {
    const roles = Array.isArray(a.active_roles) ? new Set(a.active_roles.map(e => String(e).split(':', 1)[0])) : null;
    return (a.trip_drivers || []).find(d => String(d.driver_id) === String(driverId)
      && ((d.role || 'driver') === 'driver' || roles === null || roles.has(d.role)));
  };

  async function load() {
    const [share, trips] = await Promise.all([
      client.rpc('get_driver_schedule_share', { p_token: token }),
      client.rpc('get_driver_share_trips', { p_token: token }),
    ]);
    if (share.error || trips.error) return say("This sheet can't be loaded right now", 'Check your connection and try again.');
    if (!share.data || !trips.data) return say('This link is no longer active', 'Contact dispatch if you still need your paperwork.');

    const trip = (trips.data.trips || []).find(t => String(t.id) === String(tripId));
    const driverId = share.data.driver?.id;
    const assignment = trip && (trip.trip_assignments || [])
      .find(a => (a.leg || 'outbound') === leg && seated(a, driverId));
    if (!trip || trip.cancelled_at || !assignment) {
      return say('This trip is no longer assigned to you', 'Go back to your schedule for your current trips.');
    }

    forms.useRequirements(trips.data.requirements);
    const subject = { trip, assignment, leg, seat: seated(assignment, driverId) };
    const cards = [form.render(subject, 'standard')].flat();
    // The paper carries the paper's theme, as on the forms page.
    // Adding a row is the office's, for tidying a sheet before it prints.
    for (const card of cards) {
      card.setAttribute('data-theme', 'g10');
      card.querySelectorAll('.scheduler-driver-itinerary__add').forEach(b => b.remove());
    }
    sheet.replaceChildren(...cards);
    setPaper();
  }

  // -- start --------------------------------------------------------------------
  if (!token) return say('This link has no schedule in it', 'Ask dispatch for a new driver schedule link.');
  if (!form) return say('This sheet does not exist', 'Go back to your schedule and open it from a trip.');
  const name = form.id === 'envelope' ? 'Envelope' : 'Itinerary';
  $('scheduler-sheet-title').textContent = name;
  document.title = `${name} — Scheduler`;
  if (!client) return say('This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to load a sheet.');
  load().catch(() => say('Something went wrong', 'Check your connection and try again.'));
})();
