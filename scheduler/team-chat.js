/* The team chat: one room for the office staff, in a header panel on every
   Scheduler page.

   A message is its text, whether it is urgent, the people it names and the
   records it links to, in one `chat_messages` row; the database stamps who
   sent it, when, and any edit or delete. `chat_reads` holds the newest
   message each person has seen, so the dot on the header action is right on
   every computer. Both tables arrive live on the `scheduler-team-chat`
   channel.

   An urgent message opens the panel on the screen of each person it names,
   or of everyone when it names no one, and leaves the focus where it was.
   Any other new message is a dot on the action and, while no other toast is
   up, a toast; a message that names the person turns the dot urgent. */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const header = document.querySelector('.rux--header');
  const globalEl = header?.querySelector('.rux--header__global');
  if (!client?.from || !globalEl) return;

  const PAGE = 100;
  const MAX = 2000;
  const SOUND_KEY = 'scheduler.chat.sound';
  const NOTIFY_KEY = 'scheduler.chat.notify';
  const coarse = window.matchMedia('(pointer: coarse)');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size = '16') => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };
  const iconButton = (icon, label, cls = '') => {
    const b = el('button', `rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm ${cls}`.trim());
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.appendChild(svgUse(icon));
    return b;
  };
  const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch { /* the choice lasts the visit */ } };

  /* WHAT A LINK IS. Each kind's icon, the page it opens, and how its label
     is read from the record as it is now. A Missive thread has no record
     here, so it keeps the label it was sent with. */
  const KINDS = {
    trip: { icon: '#m-calendar_month', name: 'Trip' },
    customer: { icon: '#m-apartment', name: 'Customer', page: 'customers.html' },
    contact: { icon: '#m-account_circle', name: 'Contact', page: 'contacts.html' },
    driver: { icon: '#m-person', name: 'Driver', page: 'drivers.html' },
    bus: { icon: '#m-directions_bus', name: 'Bus', page: 'fleet.html' },
    location: { icon: '#m-location_on', name: 'Location', page: 'locations.html' },
    missive: { icon: '#m-mail', name: 'Email thread' },
  };
  const DAY = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const tripLabel = t => [t.trip_ref, t.destination || 'Trip'].filter(Boolean).join(' ')
    + (t.start_date ? `, ${DAY.format(new Date(`${t.start_date}T12:00`))}` : '');
  const READS = {
    trip: { table: 'trips', cols: 'id,trip_ref,destination,customer,start_date,cancelled_at', label: tripLabel },
    customer: { table: 'customers', cols: 'id,name', label: r => r.name || 'Customer' },
    contact: { table: 'contacts', cols: 'id,name,phone', label: r => r.name || 'Contact' },
    driver: { table: 'drivers', cols: 'id,name,phone,texting_url', label: r => r.name || 'Driver' },
    bus: { table: 'buses', cols: 'id,number', label: r => `Bus ${r.number ?? ''}`.trim() },
    location: { table: 'locations', cols: 'id,name', label: r => r.name || 'Location' },
  };
  const missiveUrl = id => `https://mail.missiveapp.com/#inbox/conversations/${encodeURIComponent(id)}`;
  const hrefOf = (link, record) => {
    if (link.kind === 'missive') return missiveUrl(link.id);
    if (link.kind === 'trip') {
      const date = record?.start_date ?? link.date;
      return `./?trip=${encodeURIComponent(link.id)}${date ? `&date=${encodeURIComponent(date)}` : ''}`;
    }
    return `${KINDS[link.kind].page}?id=${encodeURIComponent(link.id)}`;
  };

  // Records read for links, by `kind:id`: the row, or null when it is gone.
  const records = new Map();
  async function readRecords(links) {
    const wanted = new Map();
    for (const l of links) {
      if (!READS[l.kind] || records.has(`${l.kind}:${l.id}`)) continue;
      if (!wanted.has(l.kind)) wanted.set(l.kind, new Set());
      wanted.get(l.kind).add(l.id);
    }
    await Promise.all([...wanted].map(async ([kind, ids]) => {
      const spec = READS[kind];
      const { data, error } = await client.from(spec.table).select(spec.cols).in('id', [...ids]);
      if (error) return;
      for (const id of ids) records.set(`${kind}:${id}`, null);
      for (const row of data ?? []) records.set(`${kind}:${row.id}`, row);
    }));
  }

  /* THE STATE. `messages` by id; `reads`, each person's newest read; the
     people a message can name; and what the box holds while it is written. */
  let me = null;
  let owner = false;
  const people = new Map();
  const messages = new Map();
  const reads = new Map();
  let oldest = Infinity;
  let more = true;
  let channel = null;
  let draft = { links: [], mentions: new Map(), editing: null };
  let sending = false;

  /* THE ACTION AND THE PANEL. The action sits before the Account action and
     is claimed by the shell like any header action, opening the panel that
     its aria-controls names. */
  const action = el('button', 'rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only scheduler-team-action');
  action.type = 'button';
  action.setAttribute('aria-label', 'Team chat');
  action.setAttribute('aria-expanded', 'false');
  action.setAttribute('aria-controls', 'scheduler-team');
  action.title = 'Team chat';
  action.appendChild(svgUse('#m-chat', '20'));
  const dot = el('span', 'scheduler-team-action__dot');
  dot.hidden = true;
  action.appendChild(dot);

  const panel = el('section', 'rux--header-panel scheduler-team');
  panel.id = 'scheduler-team';
  panel.setAttribute('aria-label', 'Team chat');

  const head = el('div', 'scheduler-team__head');
  const title = el('h2', 'scheduler-team__title', 'Team chat');
  const soundBtn = iconButton('#m-volume_up', 'Sound for urgent messages');
  const notifyBtn = iconButton('#m-notifications', 'Notifications');
  const closeBtn = iconButton('#m-close', 'Close team chat');
  head.append(title, soundBtn, notifyBtn, closeBtn);

  const list = el('ol', 'scheduler-team__list');
  list.setAttribute('role', 'log');
  list.setAttribute('aria-label', 'Messages');
  const earlier = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm scheduler-team__earlier', 'Show earlier');
  earlier.type = 'button';
  earlier.hidden = true;
  const scroller = el('div', 'scheduler-team__scroll');
  const empty = el('p', 'scheduler-team__empty', 'No messages yet. Type @ to name someone, and # to link a trip, a driver, a bus or a customer.');
  empty.hidden = true;
  scroller.append(earlier, empty, list);

  const compose = el('form', 'scheduler-team__compose');
  compose.noValidate = true;
  const editingBar = el('div', 'scheduler-team__editing');
  const editingText = el('span', null, 'Editing your message');
  const editingCancel = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm', 'Cancel');
  editingCancel.type = 'button';
  editingBar.append(editingText, editingCancel);
  editingBar.hidden = true;
  const chips = el('div', 'scheduler-team__chips');
  chips.hidden = true;
  const picker = el('ul', 'scheduler-team__pick');
  picker.id = 'scheduler-team-pick';
  picker.setAttribute('role', 'listbox');
  picker.setAttribute('aria-label', 'Suggestions');
  picker.hidden = true;
  const boxWrap = el('div', 'rux--text-area__wrapper scheduler-team__box-wrap');
  const box = el('textarea', 'rux--text-area scheduler-team__box');
  box.rows = 1;
  box.maxLength = MAX;
  box.placeholder = 'Message the team';
  box.title = 'Type @ to name someone, # to link a trip, driver, bus or customer';
  box.setAttribute('aria-label', 'Message');
  box.setAttribute('aria-controls', picker.id);
  boxWrap.appendChild(box);
  const row = el('div', 'scheduler-team__row');
  const urgentItem = el('div', 'rux--form-item rux--checkbox-wrapper scheduler-team__urgent');
  const urgent = el('input', 'rux--checkbox');
  urgent.type = 'checkbox';
  urgent.id = 'scheduler-team-urgent';
  const urgentLab = el('label', 'rux--checkbox-label');
  urgentLab.setAttribute('for', urgent.id);
  urgentLab.appendChild(el('div', 'rux--checkbox-label-text', 'Urgent'));
  urgentItem.append(urgent, urgentLab);
  const send = el('button', 'rux--btn rux--btn--primary rux--btn--icon-only rux--layout--size-sm scheduler-team__send');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Send');
  send.title = 'Send';
  send.appendChild(svgUse('#m-send'));
  row.append(urgentItem, send);
  compose.append(editingBar, chips, picker, boxWrap, row);

  panel.append(head, scroller, compose);

  const isOpen = () => panel.classList.contains('rux--header-panel--expanded');
  // A shut panel's controls leave the tab order, as the shell does for its own.
  const tabStops = open => {
    for (const n of panel.querySelectorAll('a, button, input, textarea')) n.tabIndex = open ? 0 : -1;
  };

  /* SOUND AND NOTIFICATIONS. The sound is two short notes drawn by the
     browser, so there is no file to load; a browser plays nothing until the
     page has been pressed once, so the player starts on the first press. */
  let audio = null;
  document.addEventListener('pointerdown', () => {
    try { audio ??= new AudioContext(); audio.resume?.(); } catch { /* no sound on this browser */ }
  }, { capture: true });
  const soundOn = () => stored(SOUND_KEY) !== '0';
  function chime() {
    if (!soundOn() || !audio) return;
    try {
      const t = audio.currentTime;
      for (const [freq, at] of [[880, 0], [1175, 0.15]]) {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t + at);
        gain.gain.exponentialRampToValueAtTime(0.18, t + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.3);
        osc.connect(gain).connect(audio.destination);
        osc.start(t + at);
        osc.stop(t + at + 0.35);
      }
    } catch { /* a sound is a courtesy */ }
  }
  const canNotify = 'Notification' in window;
  const notifyOn = () => canNotify && Notification.permission === 'granted' && stored(NOTIFY_KEY) === '1';
  function drawSwitches() {
    const sound = soundOn();
    soundBtn.setAttribute('aria-pressed', String(sound));
    soundBtn.querySelector('use').setAttribute('href', sound ? '#m-volume_up' : '#m-volume_off');
    soundBtn.title = sound ? 'Sound for urgent messages is on' : 'Sound for urgent messages is off';
    notifyBtn.hidden = !canNotify;
    const on = notifyOn();
    notifyBtn.setAttribute('aria-pressed', String(on));
    notifyBtn.querySelector('use').setAttribute('href', on ? '#m-notifications_active' : '#m-notifications');
    notifyBtn.title = on ? 'Notifications are on' : 'Notifications are off';
  }
  soundBtn.addEventListener('click', () => {
    store(SOUND_KEY, soundOn() ? '0' : '1');
    drawSwitches();
    if (soundOn()) chime();
  });
  notifyBtn.addEventListener('click', async () => {
    if (notifyOn()) { store(NOTIFY_KEY, '0'); drawSwitches(); return; }
    const answer = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (answer === 'granted') store(NOTIFY_KEY, '1');
    else window.SchedulerToast?.toast('info', 'Notifications are blocked', "Allow them for this site in the browser's settings.");
    drawSwitches();
  });
  function notify(msg) {
    if (!notifyOn() || !document.hidden) return;
    try {
      const n = new Notification(`${msg.urgent ? 'Urgent: ' : ''}${nameOf(msg.author_id)}`, {
        body: msg.body.slice(0, 160), tag: `scheduler-team-${msg.id}`,
      });
      n.onclick = () => { window.focus(); openPanel(true); n.close(); };
    } catch { /* a notification is a courtesy */ }
  }

  /* PEOPLE. A name is read from `chat_people()`, so a renamed person shows
     their new name; someone no longer on the staff is Former staff. */
  const nameOf = id => people.get(id)?.name ?? 'Former staff';
  const firstName = id => nameOf(id).split(/\s+/)[0];
  const forMe = msg => msg.mentions?.includes(me.id);
  const urgentForMe = msg => msg.urgent && (!msg.mentions?.length || forMe(msg));

  /* DRAWING. Newest at the foot. A day starts with its date, and a message
     from the same person within five minutes of their last one leaves out
     the face and the name. */
  const TIME = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const DATE = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const dayKey = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  function dayName(d) {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (dayKey(d) === dayKey(today)) return 'Today';
    if (dayKey(d) === dayKey(yesterday)) return 'Yesterday';
    return DATE.format(d);
  }
  const sorted = () => [...messages.values()].sort((a, b) => a.id - b.id);

  // The text, with each name the message holds marked where it is written.
  function bodyOf(msg) {
    const body = el('div', 'scheduler-team-msg__body');
    const names = (msg.mentions ?? []).map(id => people.get(id)?.name).filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!names.length) { body.textContent = msg.body; return body; }
    const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = msg.body.split(new RegExp(`(@(?:${names.map(escape).join('|')}))`, 'g'));
    for (const part of parts) {
      if (part.startsWith('@') && names.includes(part.slice(1))) body.appendChild(el('span', 'scheduler-team-msg__name', part));
      else if (part) body.appendChild(document.createTextNode(part));
    }
    return body;
  }

  /* A link as its kind's icon and its label from the record now, opening the
     record's page; a record deleted since keeps the label it was sent with,
     marked removed. A driver's link offers Call and Text beside it. */
  function linkOf(link, removable) {
    const record = READS[link.kind] ? records.get(`${link.kind}:${link.id}`) : undefined;
    const gone = READS[link.kind] && record === null;
    const label = record ? READS[link.kind].label(record) : link.label;
    const wrap = el('span', 'scheduler-team-link');
    const tag = el(gone || removable ? 'span' : 'a', 'scheduler-team-link__open');
    if (!gone && !removable) {
      tag.href = hrefOf(link, record);
      if (link.kind === 'missive') { tag.target = '_blank'; tag.rel = 'noopener'; }
    }
    tag.title = `${KINDS[link.kind].name}: ${label}${gone ? ' (removed)' : ''}`;
    tag.append(svgUse(KINDS[link.kind].icon), el('span', 'scheduler-team-link__label', label));
    if (gone) { wrap.dataset.gone = ''; tag.appendChild(el('span', 'scheduler-team-link__gone', 'removed')); }
    if (record?.cancelled_at) tag.appendChild(el('span', 'scheduler-team-link__gone', 'cancelled'));
    wrap.appendChild(tag);
    if (!removable && link.kind === 'driver' && record) {
      if (record.phone) {
        const call = el('a', 'scheduler-team-link__extra');
        call.href = `tel:${record.phone.replace(/[^\d+]/g, '')}`;
        call.setAttribute('aria-label', `Call ${label}`);
        call.title = `Call ${label}, ${record.phone}`;
        call.appendChild(svgUse('#m-call'));
        wrap.appendChild(call);
      }
      if (record.texting_url) {
        const text = el('a', 'scheduler-team-link__extra');
        text.href = record.texting_url;
        text.target = '_blank';
        text.rel = 'noopener';
        text.setAttribute('aria-label', `Text ${label}`);
        text.title = `Text ${label}`;
        text.appendChild(svgUse('#m-chat'));
        wrap.appendChild(text);
      }
    }
    if (removable) {
      const x = el('button', 'scheduler-team-link__extra');
      x.type = 'button';
      x.setAttribute('aria-label', `Take off ${label}`);
      x.title = 'Take off';
      x.appendChild(svgUse('#m-close'));
      x.addEventListener('click', () => {
        draft.links = draft.links.filter(l => l !== link);
        drawChips();
        box.focus();
      });
      wrap.appendChild(x);
    }
    return wrap;
  }

  // Who has read an urgent message: those it names, or everyone but its sender.
  function readLine(msg) {
    const who = msg.mentions?.length ? msg.mentions : [...people.keys()];
    const others = who.filter(id => id !== msg.author_id);
    const seen = others.filter(id => (reads.get(id) ?? 0) >= msg.id).map(firstName);
    const line = el('div', 'scheduler-team-msg__read');
    line.textContent = seen.length ? `Read by ${seen.join(', ')}` : 'Not read yet';
    return line;
  }

  let deleteArmed = null;
  function messageOf(msg, prev) {
    const item = el('li', 'scheduler-team-msg');
    item.dataset.id = msg.id;
    const mine = msg.author_id === me.id;
    const when = new Date(msg.created_at);
    const follows = prev && prev.author_id === msg.author_id && !prev.deleted_at
      && dayKey(new Date(prev.created_at)) === dayKey(when)
      && when - new Date(prev.created_at) < 5 * 60 * 1000 && !msg.urgent;
    if (follows) item.dataset.follows = '';
    if (msg.urgent && !msg.deleted_at) item.dataset.urgent = '';
    if (mine) item.dataset.mine = '';
    if (forMe(msg) && !msg.deleted_at) item.dataset.named = '';

    const face = el('span', 'rux--user-avatar rux--user-avatar--sm scheduler-team-msg__face');
    face.setAttribute('aria-hidden', 'true');
    const person = people.get(msg.author_id);
    account.drawAvatar(face, person ?? { id: msg.author_id ?? 'former', name: 'Former staff' }, 'sm');
    const main = el('div', 'scheduler-team-msg__main');
    const meta = el('div', 'scheduler-team-msg__meta');
    meta.appendChild(el('span', 'scheduler-team-msg__who', nameOf(msg.author_id)));
    const time = el('time', 'scheduler-team-msg__time', TIME.format(when));
    time.dateTime = msg.created_at;
    time.title = when.toLocaleString();
    meta.appendChild(time);
    if (msg.urgent && !msg.deleted_at) meta.appendChild(el('span', 'scheduler-team-msg__urgent', 'Urgent'));
    main.appendChild(meta);

    if (msg.deleted_at) {
      main.appendChild(el('div', 'scheduler-team-msg__deleted', 'Message deleted'));
    } else {
      main.appendChild(bodyOf(msg));
      if (msg.links?.length) {
        const links = el('div', 'scheduler-team-msg__links');
        for (const link of msg.links) links.appendChild(linkOf(link, false));
        main.appendChild(links);
      }
      if (msg.edited_at) main.appendChild(el('div', 'scheduler-team-msg__edited', 'Edited'));
      if (msg.urgent) main.appendChild(readLine(msg));
    }
    item.append(face, main);

    if (!msg.deleted_at && (mine || owner)) {
      const tools = el('div', 'scheduler-team-msg__tools');
      if (mine) {
        const edit = iconButton('#m-edit', 'Edit message');
        edit.addEventListener('click', () => startEdit(msg));
        tools.appendChild(edit);
      }
      const del = iconButton('#m-delete', 'Delete message');
      if (deleteArmed === msg.id) {
        del.classList.add('scheduler-team-msg__confirm');
        del.setAttribute('aria-label', 'Press again to delete');
        del.title = 'Press again to delete';
      }
      del.addEventListener('click', () => removeMessage(msg));
      tools.appendChild(del);
      item.appendChild(tools);
    }
    return item;
  }

  function draw() {
    const atFoot = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40;
    const all = sorted();
    const frag = document.createDocumentFragment();
    let prev = null;
    let day = '';
    for (const msg of all) {
      const d = new Date(msg.created_at);
      if (dayKey(d) !== day) {
        day = dayKey(d);
        frag.appendChild(el('li', 'scheduler-team-day', dayName(d)));
        prev = null;
      }
      frag.appendChild(messageOf(msg, prev));
      prev = msg;
    }
    list.replaceChildren(frag);
    empty.hidden = all.length > 0;
    earlier.hidden = !more;
    if (!isOpen()) tabStops(false);
    if (atFoot) scroller.scrollTop = scroller.scrollHeight;
  }

  /* THE DOT. Messages from someone else past this person's newest read,
     urgent in colour when one of them is urgent for this person or names
     them. */
  function drawDot() {
    const mine = reads.get(me.id) ?? 0;
    const unread = sorted().filter(m => m.id > mine && m.author_id !== me.id && !m.deleted_at);
    dot.hidden = !unread.length;
    dot.dataset.tone = unread.some(m => urgentForMe(m) || forMe(m)) ? 'urgent' : '';
    action.setAttribute('aria-label', unread.length ? `Team chat, ${unread.length} unread` : 'Team chat');
  }

  // Marks every message shown read, while the panel is open on a page in view.
  let marking = null;
  function markRead() {
    if (!isOpen() || document.hidden) return;
    const newest = Math.max(0, ...messages.keys());
    if (newest <= (reads.get(me.id) ?? 0)) return;
    reads.set(me.id, newest);
    drawDot();
    clearTimeout(marking);
    marking = setTimeout(() => {
      client.rpc('chat_mark_read', { upto: newest }).then(({ error }) => {
        if (error) console.info('scheduler: the chat could not mark messages read --', error.message);
      });
    }, 300);
  }

  /* READING. The newest page on opening, each earlier page on asking, and
     the newest page again after the page wakes, which also picks up edits
     made while it slept. */
  async function readPage(before = null) {
    let query = client.from('chat_messages').select('*').order('id', { ascending: false }).limit(PAGE);
    if (before) query = query.lt('id', before);
    const { data, error } = await query;
    if (error) throw error;
    // Whether there is more is known from the first page and each earlier one, not a page read on waking.
    if (before || !Number.isFinite(oldest)) more = data.length === PAGE;
    for (const msg of data) messages.set(msg.id, msg);
    if (data.length) oldest = Math.min(oldest, data[data.length - 1].id);
    await readRecords(data.flatMap(m => m.links ?? []));
    return data;
  }
  async function readReads() {
    const { data } = await client.from('chat_reads').select('profile_id,last_read_id');
    for (const r of data ?? []) reads.set(r.profile_id, Math.max(reads.get(r.profile_id) ?? 0, Number(r.last_read_id)));
  }
  earlier.addEventListener('click', async () => {
    const top = scroller.scrollHeight - scroller.scrollTop;
    earlier.disabled = true;
    try { await readPage(oldest); } catch { /* the button stays to try again */ }
    earlier.disabled = false;
    draw();
    scroller.scrollTop = scroller.scrollHeight - top;
  });

  /* LIVE. A new message from someone else is announced; an edit, a delete or
     anyone's read mark redraws. A channel that died while the Mac slept is
     thrown out and opened again, and the room read again. */
  function listen() {
    channel = client.channel('scheduler-team-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, async ({ eventType, new: msg }) => {
        if (!msg?.id) return;
        const isNew = eventType === 'INSERT' && !messages.has(msg.id);
        messages.set(msg.id, msg);
        await readRecords(msg.links ?? []);
        draw();
        if (isNew && msg.author_id !== me.id) arrive(msg);
        drawDot();
        markRead();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_reads' }, ({ new: r }) => {
        if (!r?.profile_id) return;
        reads.set(r.profile_id, Math.max(reads.get(r.profile_id) ?? 0, Number(r.last_read_id)));
        draw();
        drawDot();
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR') console.info('scheduler: the team chat is not live -- its tables are not on realtime for staff.');
      });
  }
  async function wake() {
    if (!channel) return;
    if (channel.state !== 'joined' && channel.state !== 'joining') {
      client.removeChannel(channel);
      listen();
    }
    try {
      const before = Math.max(0, ...messages.keys());
      const fresh = await readPage();
      await readReads();
      draw();
      for (const msg of fresh) if (msg.id > before && msg.author_id !== me.id && before) arrive(msg);
      drawDot();
      markRead();
    } catch { /* the next wake tries again */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { wake(); } });
  window.addEventListener('online', wake);

  // A message from someone else, as it reaches this page.
  function arrive(msg) {
    if (msg.deleted_at) return;
    if (urgentForMe(msg)) {
      if (!isOpen()) openPanel(false);
      chime();
      notify(msg);
      return;
    }
    if (forMe(msg)) notify(msg);
    if (isOpen() && !document.hidden) return;
    const toastEl = document.getElementById('scheduler-toast');
    if (toastEl && !toastEl.hidden) return;
    const firstLine = msg.body.split('\n')[0];
    window.SchedulerToast?.toast('info', `${nameOf(msg.author_id)} in Team chat`,
      firstLine.length > 90 ? `${firstLine.slice(0, 89)}…` : firstLine);
  }

  /* OPENING. A press on the action opens it through the shell and puts the
     cursor in the box; an urgent message opens it and leaves the focus where
     it was, so nothing being typed is lost. */
  let focusOnOpen = true;
  function openPanel(focus) {
    focusOnOpen = focus;
    if (isOpen()) { if (focus) box.focus(); return; }
    window.Rux?.uiShell?.openPanel(action);
  }
  panel.addEventListener('rux:header-panel-opened', () => {
    tabStops(true);
    draw();
    scroller.scrollTop = scroller.scrollHeight;
    if (focusOnOpen) box.focus({ preventScroll: true });
    focusOnOpen = true;
    markRead();
  });
  panel.addEventListener('rux:header-panel-closed', () => {
    tabStops(false);
    closePicker();
  });
  closeBtn.addEventListener('click', () => {
    if (isOpen()) action.click();
    action.focus();
  });

  /* WRITING. The box grows with what is typed, up to a third of the panel.
     Enter sends and Shift-Enter starts a line; on a touch screen Enter starts
     a line and Send sends. */
  function fit() {
    box.style.blockSize = 'auto';
    box.style.blockSize = `${Math.min(box.scrollHeight + 2, Math.max(80, panel.clientHeight / 3))}px`;
  }
  function drawChips() {
    chips.replaceChildren(...draft.links.map(l => linkOf(l, true)));
    chips.hidden = !draft.links.length;
    if (isOpen()) tabStops(true);
  }
  function resetDraft() {
    draft = { links: [], mentions: new Map(), editing: null };
    box.value = '';
    urgent.checked = false;
    editingBar.hidden = true;
    drawChips();
    fit();
  }
  function startEdit(msg) {
    draft = { links: [...(msg.links ?? [])], mentions: new Map(), editing: msg.id };
    for (const id of msg.mentions ?? []) if (people.has(id)) draft.mentions.set(people.get(id).name, id);
    box.value = msg.body;
    urgent.checked = msg.urgent;
    editingBar.hidden = false;
    drawChips();
    fit();
    box.focus();
  }
  editingCancel.addEventListener('click', () => { resetDraft(); box.focus(); });

  // A name stays on the message only while its @name is still in the text.
  const mentionsIn = body => [...new Set([...draft.mentions]
    .filter(([name]) => body.includes(`@${name}`)).map(([, id]) => id))];

  compose.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const body = box.value.trim();
    if (!body) { box.focus(); return; }
    const row = { body, urgent: urgent.checked, mentions: mentionsIn(body), links: draft.links };
    sending = true;
    send.disabled = true;
    const write = draft.editing
      ? client.from('chat_messages').update(row).eq('id', draft.editing).select().single()
      : client.from('chat_messages').insert(row).select().single();
    const { data, error } = await write;
    sending = false;
    send.disabled = false;
    if (error) {
      window.SchedulerToast?.toast('error', 'Message not sent', error.message);
      return;
    }
    messages.set(data.id, data);
    resetDraft();
    draw();
    scroller.scrollTop = scroller.scrollHeight;
    markRead();
    box.focus();
  });

  async function removeMessage(msg) {
    if (deleteArmed !== msg.id) {
      deleteArmed = msg.id;
      draw();
      list.querySelector(`[data-id="${msg.id}"] .scheduler-team-msg__confirm`)?.focus();
      setTimeout(() => { if (deleteArmed === msg.id) { deleteArmed = null; draw(); } }, 4000);
      return;
    }
    deleteArmed = null;
    const { data, error } = await client.from('chat_messages')
      .update({ deleted_at: new Date().toISOString() }).eq('id', msg.id).select().single();
    if (error) { window.SchedulerToast?.toast('error', 'Message not deleted', error.message); draw(); return; }
    messages.set(data.id, data);
    if (draft.editing === data.id) resetDraft();
    draw();
  }

  /* THE PICKER. `@` and a few letters lists the staff; `#` and two letters
     or more lists trips, drivers, buses, customers, contacts and locations.
     Picking a name writes it into the text; picking a record takes the typed
     word out and adds the record as a link above the box. */
  let pick = { mark: null, start: 0, items: [], active: 0, ask: 0 };
  function closePicker() {
    picker.hidden = true;
    picker.replaceChildren();
    pick.items = [];
  }
  function drawPicker() {
    picker.replaceChildren();
    if (!pick.items.length) { closePicker(); return; }
    pick.items.forEach((item, i) => {
      const opt = el('li', 'scheduler-team__option');
      opt.id = `scheduler-team-opt-${i}`;
      opt.setAttribute('role', 'option');
      opt.setAttribute('aria-selected', String(i === pick.active));
      opt.appendChild(svgUse(item.icon));
      const words = el('span', 'scheduler-team__option-words');
      words.appendChild(el('span', 'scheduler-team__option-label', item.label));
      if (item.detail) words.appendChild(el('span', 'scheduler-team__option-detail', item.detail));
      opt.appendChild(words);
      opt.addEventListener('pointerdown', e => { e.preventDefault(); choose(i); });
      picker.appendChild(opt);
    });
    picker.hidden = false;
  }
  // `#` words go into a filter as plain text, with the filter's own marks taken out.
  const clean = q => q.replace(/[,()%*\\:"']/g, ' ').trim();
  async function search(q) {
    const like = `%${clean(q)}%`;
    if (clean(q).length < 2) return [];
    const near = d => Math.abs(new Date(`${d}T12:00`) - Date.now());
    const [trips, drivers, buses, customers, contacts, locations] = await Promise.all([
      client.from('trips').select(READS.trip.cols)
        .or(`destination.ilike.${like},customer.ilike.${like},trip_ref.ilike.${clean(q)}%`).limit(30),
      client.from('drivers').select(READS.driver.cols).ilike('name', like).limit(4),
      client.from('buses').select(READS.bus.cols).ilike('number', `${clean(q)}%`).limit(3),
      client.from('customers').select(READS.customer.cols).ilike('name', like).limit(4),
      client.from('contacts').select(READS.contact.cols).ilike('name', like).limit(3),
      client.from('locations').select(READS.location.cols).ilike('name', like).limit(3),
    ]);
    const out = [];
    const add = (kind, rows, detail) => {
      for (const r of rows ?? []) {
        records.set(`${kind}:${r.id}`, r);
        out.push({ kind, id: String(r.id), label: READS[kind].label(r), detail: detail?.(r), icon: KINDS[kind].icon,
          link: { kind, id: String(r.id), label: READS[kind].label(r).slice(0, 200), ...(r.start_date ? { date: r.start_date } : {}) } });
      }
    };
    add('trip', (trips.data ?? []).filter(t => !t.cancelled_at)
      .sort((a, b) => near(a.start_date) - near(b.start_date)).slice(0, 6), t => t.customer);
    add('driver', drivers.data, () => 'Driver');
    add('bus', buses.data, () => 'Bus');
    add('customer', customers.data, () => 'Customer');
    add('contact', contacts.data, () => 'Contact');
    add('location', locations.data, () => 'Location');
    return out;
  }
  async function onType() {
    fit();
    const before = box.value.slice(0, box.selectionStart);
    const m = before.match(/(^|\s)([@#])([^\s@#]{0,30})$/);
    if (!m) { closePicker(); return; }
    const [, , mark, word] = m;
    pick.mark = mark;
    pick.start = before.length - word.length - 1;
    pick.active = 0;
    if (mark === '@') {
      const w = word.toLowerCase();
      pick.items = [...people.values()]
        .filter(p => p.id !== me.id && p.name && p.name.toLowerCase().split(/\s+/).some(part => part.startsWith(w)))
        .slice(0, 6)
        .map(p => ({ icon: '#m-person', label: p.name, person: p }));
      drawPicker();
      return;
    }
    const ask = ++pick.ask;
    const items = await search(word).catch(() => []);
    if (ask !== pick.ask) return;
    pick.items = items;
    drawPicker();
  }
  function choose(i) {
    const item = pick.items[i];
    if (!item) return;
    const end = box.selectionStart;
    if (item.person) {
      const text = `@${item.person.name} `;
      box.setRangeText(text, pick.start, end, 'end');
      draft.mentions.set(item.person.name, item.person.id);
    } else {
      box.setRangeText('', pick.start, end, 'end');
      addLink(item.link);
    }
    closePicker();
    fit();
    box.focus();
  }
  function addLink(link) {
    if (draft.links.length >= 20) return;
    if (draft.links.some(l => l.kind === link.kind && l.id === link.id)) return;
    draft.links.push(link);
    drawChips();
  }

  box.addEventListener('input', onType);
  box.addEventListener('click', onType);
  box.addEventListener('blur', () => setTimeout(closePicker, 150));
  box.addEventListener('keydown', e => {
    if (!picker.hidden && pick.items.length) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        pick.active = (pick.active + (e.key === 'ArrowDown' ? 1 : -1) + pick.items.length) % pick.items.length;
        drawPicker();
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(pick.active); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePicker(); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !coarse.matches && !e.isComposing) {
      e.preventDefault();
      compose.requestSubmit();
    }
  });

  /* PASTING AN ADDRESS. A Scheduler link to a trip or a record, or a Missive
     thread, becomes a link above the box rather than text. */
  const RECORD_PAGES = Object.fromEntries(Object.entries(KINDS).filter(([, k]) => k.page).map(([kind, k]) => [k.page, kind]));
  function linkFromUrl(text) {
    const missive = text.match(/^https:\/\/mail\.missiveapp\.com\/#[\w-]+\/conversations\/([\w-]{8,64})/i);
    if (missive) return { kind: 'missive', id: missive[1], label: 'Email thread' };
    let url;
    try { url = new URL(text); } catch { return null; }
    if (url.host !== location.host && url.host !== 'rux-sm.github.io') return null;
    const page = url.pathname.match(/\/scheduler\/([\w-]*\.html)?$/);
    if (!page) return null;
    const file = page[1] || 'index.html';
    if (file === 'index.html' && url.searchParams.get('trip')) {
      return { kind: 'trip', id: url.searchParams.get('trip'), date: url.searchParams.get('date') };
    }
    const kind = RECORD_PAGES[file];
    return kind && url.searchParams.get('id') ? { kind, id: url.searchParams.get('id') } : null;
  }
  box.addEventListener('paste', async e => {
    const text = e.clipboardData?.getData('text')?.trim();
    if (!text || /\s/.test(text)) return;
    const link = linkFromUrl(text);
    if (!link) return;
    e.preventDefault();
    if (READS[link.kind]) {
      await readRecords([link]);
      const record = records.get(`${link.kind}:${link.id}`);
      if (!record) { window.SchedulerToast?.toast('info', 'Nothing found at that link', 'It may have been deleted.'); return; }
      link.label = READS[link.kind].label(record).slice(0, 200);
      if (link.kind === 'trip') { if (record.start_date) link.date = record.start_date; else delete link.date; }
    }
    if (!link.date) delete link.date;
    addLink(link);
  });

  /* SEND TO CHAT. A page hands over one record or several, each
     `{ kind, id, record }`, where `record` is the row it already holds, or a
     Missive thread as `{ kind: 'missive', url }`; the chat opens with them as
     links above the box. A record not handed over is read; one that cannot be
     found is left out. */
  async function share(given) {
    if (!me) return;
    const asked = [given].flat();
    await readRecords(asked.filter(l => READS[l?.kind] && l.id && !l.record).map(l => ({ kind: l.kind, id: String(l.id) })));
    for (const link of asked) {
      if (link?.kind === 'missive') {
        const thread = link.url && linkFromUrl(link.url.trim());
        if (thread?.kind === 'missive') addLink(thread);
        continue;
      }
      if (!READS[link?.kind] || !link.id) continue;
      const id = String(link.id);
      if (link.record) records.set(`${link.kind}:${id}`, link.record);
      const record = records.get(`${link.kind}:${id}`);
      if (!record) continue;
      const clean = { kind: link.kind, id, label: READS[link.kind].label(record).slice(0, 200) };
      if (link.kind === 'trip' && record.start_date) clean.date = record.start_date;
      addLink(clean);
    }
    openPanel(true);
  }

  /* STARTING. Only a staff account has the chat; anyone else's header is
     left as it was. */
  (async () => {
    const who = await Promise.resolve(account.person?.()).catch(() => null);
    if (!who?.staff) return;
    me = who;
    const accountBtn = globalEl.querySelector('[aria-controls="rux-account-panel"]');
    globalEl.insertBefore(action, accountBtn ?? null);
    const accountPanel = document.getElementById('rux-account-panel');
    (accountPanel ?? globalEl).after(panel);
    tabStops(false);
    drawSwitches();
    window.SchedulerTeamChat = { share, open: () => openPanel(true) };
    document.dispatchEvent(new CustomEvent('scheduler:team-chat-ready'));
    try {
      const [{ data: staff }, { data: isOwner }] = await Promise.all([
        client.rpc('chat_people'), client.rpc('is_owner'),
      ]);
      for (const p of staff ?? []) people.set(p.id, { id: p.id, name: p.display_name, photoPath: p.photo_path, colour: p.avatar_color });
      owner = !!isOwner;
      await Promise.all([readPage(), readReads()]);
    } catch (error) {
      console.info('scheduler: the team chat could not be read --', error?.message ?? error);
      return;
    }
    draw();
    drawDot();
    listen();
  })();
})();
