/* ==========================================================================
   share/track.js — A CUSTOMER'S TRACKING LINK
   --------------------------------------------------------------------------
   track.html?t=<token> is the link the Driver info message carries, one a
   trip, opened without a log-in. The samsara-share Edge Function says where
   the trip stands: before a leg's yard-out, when the map starts; while a leg
   is out, Samsara's live map of each of its buses; after the last, that the
   trip has ended. One bus goes straight to its map, and more are listed. A
   page left open before the start asks again when the start comes. A local
   preview other than the cloud preview has no client, and says so.
   ========================================================================== */
(() => {
  'use strict';

  const titleEl = document.getElementById('scheduler-share-title');
  const textEl = document.getElementById('scheduler-share-text');
  const busesEl = document.getElementById('scheduler-share-buses');
  // What happened, then what to do, as Design's error state words it.
  const say = (title, text) => {
    titleEl.textContent = title;
    textEl.textContent = text;
    textEl.hidden = false;
    busesEl.hidden = true;
  };
  const OFFICE = 'Call or email Escamilla Tour Buses if you need help.';
  // A time on the office's clock, which the trip's times are kept on.
  const when = iso => new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  // The longest wait a page left open keeps a timer for.
  const WAIT_MS = 24 * 3600_000;

  const token = (new URLSearchParams(location.search).get('t') ?? '').trim();
  const client = window.Rux?.account?.client;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    say('This link is not complete', 'Open the link from your email again, or ask us to send it again.');
    return;
  }
  if (!client) {
    say('This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to follow the bus.');
    return;
  }

  async function look() {
    let result;
    try { result = await client.functions.invoke('samsara-share', { body: { token } }); } catch (error) { result = { error }; }
    // 404 is a token no trip has; anything else is the connection, the
    // service or Samsara.
    if (result.error?.context?.status === 404) {
      say('This link is not one of ours', 'Open the link from your email again, or ask us to send it again.');
      return;
    }
    const answer = result.error ? null : result.data;
    if (answer?.state === 'before') {
      say('Your bus is not on its way yet', `The map starts ${when(answer.starts)}, when the bus leaves for your pickup. Open this link again then.`);
      const wait = Date.parse(answer.starts) - Date.now();
      if (wait > 0 && wait < WAIT_MS) setTimeout(look, wait + 5000);
      return;
    }
    if (answer?.state === 'ended') { say('This trip has ended', 'Thank you for riding with us.'); return; }
    if (answer?.state === 'none') { say('This trip has no map', OFFICE); return; }
    const buses = answer?.state === 'live' ? answer.buses ?? [] : null;
    const shown = (buses ?? []).filter(b => b.url);
    if (!buses || !shown.length) {
      say("The map can't be opened right now", `Reload the page in a minute. ${OFFICE}`);
      return;
    }
    if (buses.length === 1) { location.replace(shown[0].url); return; }
    titleEl.textContent = 'Follow your buses';
    textEl.textContent = 'Each bus opens on its own map.';
    textEl.hidden = false;
    busesEl.replaceChildren(...buses.map(b => {
      const name = b.number ? `Bus ${b.number}` : 'Bus';
      if (!b.url) {
        const p = document.createElement('p');
        p.textContent = `${name} has no map right now.`;
        return p;
      }
      const a = document.createElement('a');
      a.className = 'rux--btn rux--btn--primary';
      a.href = b.url;
      a.textContent = `${name}: open map`;
      return a;
    }));
    busesEl.hidden = false;
  }
  look();
})();
