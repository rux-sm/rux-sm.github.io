/* Who else has the Scheduler open, and where.

   Every Scheduler page joins one presence channel and says who is here and
   which page they are on. The header shows everyone else as faces beside the
   Account action, and a face is a link to the page that person is on, or to
   the trip they have open on the schedule. Nothing is stored: a person
   disappears when their tab closes, their Mac sleeps or the network drops.

   The schedule's board says more on the same channel -- which trip is
   selected or open -- through `window.SchedulerPeople`, so one connection
   carries both the header faces and the faces on its trip bars. */
(() => {
  const account = window.Rux?.account;
  const client = account?.client;
  const hostEl = document.getElementById('scheduler-people');

  /* PRIVATE, so only a signed-in staff account may join. A public channel is
     joinable by anyone holding the publishable key, and everything tracked on
     it -- name, photo, account, page and trip -- would be readable and
     forgeable from outside. The database decides, through a rule on
     realtime.messages; without that rule nobody joins and no face is drawn,
     which is the safe way to fail. */
  const TOPIC = 'scheduler-presence';
  const FACES = 3;
  const phone = window.matchMedia('(max-width: 41.98rem)');

  // The page's name as the side nav says it, else the tab title's first part.
  const pageName = () =>
    document.querySelector('.rux--side-nav__link--current .rux--side-nav__link-text')?.textContent.trim()
    || document.title.split(' — ')[0].trim();

  let me = null;
  let key = null;
  let channel = null;
  // What the board last asked to add: the trip it has selected or open.
  let extra = {};
  const syncHandlers = [];
  const joinHandlers = [];

  const base = () => ({
    ...me,
    page: pageName(),
    href: location.pathname + location.search,
    at: Date.now(),
  });

  /* Says who this tab is, plus whatever the board adds. The answer is 'ok'
     when the server took it; it takes only so many a second and drops the
     rest, so the board retries on anything else. */
  async function track(more = {}) {
    extra = more;
    if (!me || channel?.state !== 'joined') return 'not joined';
    return channel.track({ ...base(), ...extra }).catch(() => 'error');
  }

  function open() {
    channel = client.channel(TOPIC, { config: { private: true, presence: { key } } });
    channel.on('presence', { event: 'sync' }, () => {
      draw();
      for (const fn of syncHandlers) fn();
    });
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        console.info('scheduler: presence is off -- realtime.messages has no rule letting staff join.');
        return;
      }
      if (status !== 'SUBSCRIBED') return;
      joined();
    });
  }

  // A page with nothing to add says itself; the board says itself with its trip.
  function joined() {
    if (joinHandlers.length) for (const fn of joinHandlers) fn();
    else track(extra);
  }

  /* Coming back says this tab again. A presence lives on the connection, so
     one that died while the Mac slept took it along, and the library refuses
     to join the same channel twice, so a dead channel is thrown out and a new
     one opened. Even a live one may have timed this tab out while it was
     away. */
  function wake() {
    if (!channel) return;
    if (channel.state === 'joined') { joined(); return; }
    if (channel.state === 'joining') return;
    client.removeChannel(channel);
    open();
  }

  // Everyone but me, one each, at the page they touched last.
  function others() {
    const byId = new Map();
    for (const entries of Object.values(channel?.presenceState?.() ?? {})) {
      for (const who of entries) {
        if (!who?.id || who.id === me?.id) continue;
        const had = byId.get(who.id);
        if (!had || (who.at ?? 0) > (had.at ?? 0)) byId.set(who.id, who);
      }
    }
    return [...byId.values()].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
  }

  // Where a face leads: the trip they have open on the schedule, else their page.
  const hrefOf = who => (who.tripId && who.state === 'open' && who.tripDate)
    ? `./?trip=${encodeURIComponent(who.tripId)}&date=${encodeURIComponent(who.tripDate)}`
    : who.href || './';
  // A tab without a page is the schedule's, from before every page said one.
  const whereOf = who => (who.tripId && who.state === 'open' && who.trip)
    ? `${who.page || 'Schedule'}, ${who.trip}`
    : who.page || 'Schedule';
  const said = who => `${who.name || 'Somebody'}, on ${whereOf(who)}`;

  /* The faces sit at the Account action's size. Past `FACES` the rest are a
     count whose tooltip says who and where; a phone's header has room beside
     the logo for one face only. */
  function draw() {
    if (!hostEl) return;
    const list = others();
    hostEl.replaceChildren();
    hostEl.hidden = !list.length;
    if (!list.length) return;
    const shown = list.slice(0, phone.matches ? 1 : FACES);
    for (const who of shown) {
      const link = document.createElement('a');
      link.className = 'scheduler-header-people__link';
      link.href = hrefOf(who);
      link.title = said(who);
      link.setAttribute('aria-label', said(who));
      const face = document.createElement('span');
      face.className = 'rux--user-avatar rux--user-avatar--sm';
      face.setAttribute('aria-hidden', 'true');
      account.drawAvatar(face, who, 'sm');
      link.appendChild(face);
      hostEl.appendChild(link);
    }
    if (list.length > shown.length) {
      const rest = list.slice(shown.length);
      const more = document.createElement('span');
      more.className = 'scheduler-header-people__more';
      more.textContent = `+${rest.length}`;
      more.title = rest.map(said).join('\n');
      more.setAttribute('aria-label', `Also here: ${rest.map(said).join('; ')}`);
      hostEl.appendChild(more);
    }
  }

  phone.addEventListener?.('change', draw);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  // The network coming back is the other half of a sleep, and it does not
  // always arrive with a visibility change.
  window.addEventListener('online', wake);

  /* One tab is one presence, so the key is this tab and not the account: the
     same person on a laptop and a phone is two, and closing one leaves the
     other. Only a staff account joins; anyone else has nobody to show. */
  const ready = (async () => {
    if (!client?.channel) return null;
    const who = await Promise.resolve(account.person?.()).catch(() => null);
    if (!who?.staff) return null;
    me = { id: who.id, name: who.name, photoPath: who.photoPath, colour: who.colour };
    key = `${me.id}:${Math.random().toString(36).slice(2, 8)}`;
    open();
    return me;
  })();

  window.SchedulerPeople = {
    ready,
    track,
    joined: () => channel?.state === 'joined',
    state: () => channel?.presenceState?.() ?? {},
    onSync: fn => { syncHandlers.push(fn); },
    onJoin: fn => { joinHandlers.push(fn); },
  };
})();
