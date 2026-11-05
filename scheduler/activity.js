/* THE ACTIVITY LINE, the view menu's Activity: whether the board is up to
   date, in the header beside the people here. While the board's trips load
   it says Loading trips..., while a change is written Saving... and while
   anything else is read Loading..., beside Carbon's inline loading spinner;
   at rest a check and Up to date; and what failed, with Carbon's error mark,
   when something does. Its tooltip lists the last things done, each at its
   time.
   Every request the page makes passes through `fetch`, so this script wraps
   it, and is loaded before the Supabase script, whose client keeps the
   `fetch` it finds. data.js says the rest through `SchedulerActivity`: when
   it reads the board's trips, when a change reaches it live, and whether
   the live board is open. The wrap costs a map entry a request, so it stays
   on with the line off. */
(() => {
  /* What the line says of each kind of work: under way, done, and failed.
     A save done is said for a moment and kept in the tooltip; the board's
     trips loaded are only kept, as Up to date says the rest; any other read
     done is not news. */
  const WORDS = {
    save: { busy: 'Saving…', done: 'Saved', failed: "Couldn't save" },
    trips: { busy: 'Loading trips…', kept: 'Trips loaded', failed: "Couldn't load trips" },
    load: { busy: 'Loading…', failed: "Couldn't load" },
  };
  // The kind said while several are under way: a save first, then the board's trips.
  const FIRST = ['save', 'trips', 'load'];
  const CHANGED = 'Board updated';
  const PAUSED = 'Live changes paused';
  const REST = 'Up to date';
  // Everything the line can say, which sizes it.
  const PHRASES = new Set([...Object.values(WORDS).flatMap(w => [w.busy, w.done, w.kept, w.failed]), CHANGED, PAUSED, REST].filter(Boolean));

  const running = new Map();
  const recent = [];
  let seq = 0, said = null, saidUntil = 0, paused = false, on = false, line = null, timer = 0;

  /* What kind of work a request is: a change written to a table or a file,
     or anything read, from the tables, the files, the database's functions,
     the Edge Functions or another site. A database function is asked by
     POST whatever it does, so it counts as a read, and a change one makes
     is reported by what asked for it; a file's signed link and a folder's
     list are asked for by POST too, and read. The page's own files, the
     sign-in and the live channel are not news. */
  function kindOf(url, method) {
    let u;
    try { u = new URL(url, location.href); } catch { return null; }
    if (u.origin === location.origin) return null;
    const path = u.pathname;
    if (path.includes('/auth/v1/') || path.includes('/realtime/')) return null;
    const reads = method === 'GET' || method === 'HEAD';
    if (path.includes('/rest/v1/rpc/')) return 'load';
    if (path.includes('/rest/v1/')) return reads ? 'load' : 'save';
    if (path.includes('/storage/v1/')) return reads || /\/object\/(sign|list)\//.test(path) ? 'load' : 'save';
    return 'load';
  }

  const clock = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  // Keeps a line for the tooltip; the same words again within ten seconds only move its time.
  function remember(words, failed) {
    const at = new Date(), last = recent[0];
    if (last?.words === words && at - last.at < 10000) { last.at = at; return; }
    recent.unshift({ words, failed, at });
    recent.length = Math.min(recent.length, 12);
  }
  // Says something for a moment, once nothing is under way; a failure still showing is not talked over.
  function say(words, failed, ms) {
    if (!failed && said?.failed && Date.now() < saidUntil) return;
    said = { words, failed };
    saidUntil = Date.now() + ms;
  }

  // Starts a kind of work under way and gives back the call that ends it.
  function begin(kind) {
    const id = ++seq;
    running.set(id, kind);
    paint();
    return (ok = true) => {
      if (!running.delete(id)) return;
      const w = WORDS[kind], words = ok ? w.done ?? w.kept : w.failed;
      if (words) remember(words, !ok);
      if (!ok) say(words, true, 4000);
      else if (w.done) say(words, false, 2500);
      paint();
    };
  }
  // A change that reached the board live, from this page or another.
  function changed() {
    remember(CHANGED, false);
    say(CHANGED, false, 2500);
    paint();
  }
  // Whether the live board is open; while it is not, the board is not up to date.
  function live(open) {
    if (paused === !open) return;
    paused = !open;
    if (paused) remember(PAUSED, true);
    paint();
  }

  function build() {
    line = document.getElementById('scheduler-activity');
    if (!line) return false;
    /* The words stand in one cell over every phrase the line can say,
       hidden, so the line is as wide as its longest and the mark beside
       the words holds still as they change. */
    line.innerHTML = '<div class="rux--inline-loading__animation"></div><div class="rux--inline-loading__text"><span class="scheduler-activity__said"></span></div>';
    for (const phrase of PHRASES) {
      const size = document.createElement('span');
      size.className = 'scheduler-activity__size';
      size.setAttribute('aria-hidden', 'true');
      size.textContent = phrase;
      line.lastElementChild.appendChild(size);
    }
    return true;
  }
  const SPINNER = '<div class="rux--loading rux--loading--small"><svg class="rux--loading__svg" viewBox="0 0 100 100"><circle class="rux--loading__background" cx="50%" cy="50%" r="42"></circle><circle class="rux--loading__stroke" cx="50%" cy="50%" r="42"></circle></svg></div>';
  const CHECK = '<svg class="rux--inline-loading__checkmark-container" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><use href="#m-check"/></svg>';
  const ERROR = '<svg class="rux--inline-loading--error" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-error--filled"/></svg>';

  function paint() {
    if (!on || (!line && !build())) return;
    clearTimeout(timer);
    const kinds = new Set(running.values());
    const busy = FIRST.find(k => kinds.has(k));
    let state, text;
    if (busy) {
      state = 'busy';
      text = WORDS[busy].busy;
    } else if (said && Date.now() < saidUntil) {
      state = said.failed ? 'error' : 'note';
      text = said.words;
      timer = setTimeout(paint, saidUntil - Date.now());
    } else if (paused) {
      state = 'error';
      text = PAUSED;
    } else {
      state = 'rest';
      text = REST;
    }
    const anim = line.firstElementChild, words = line.querySelector('.scheduler-activity__said');
    if (line.dataset.state !== state) {
      anim.innerHTML = state === 'busy' ? SPINNER : state === 'error' ? ERROR : CHECK;
      line.dataset.state = state;
    }
    words.textContent = text;
    line.title = recent.length
      ? recent.map(r => `${clock(r.at)}  ${r.words}`).join('\n')
      : 'Nothing yet';
  }
  function show(flag) {
    on = !!flag;
    const el = line || document.getElementById('scheduler-activity');
    if (el) el.hidden = !on;
    paint();
  }

  window.SchedulerActivity = { begin, changed, live, show };

  const base = window.fetch;
  if (typeof base !== 'function') return;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    const kind = kindOf(url, method);
    if (!kind) return base.call(window, input, init);
    const end = begin(kind);
    return base.call(window, input, init).then(r => { end(r.ok); return r; }, e => { end(false); throw e; });
  };
})();
