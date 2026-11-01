/* THE ACTIVITY LINE, the view menu's Activity: what the page is doing in the
   background, in the header beside the people here. While anything is
   fetched it is Carbon's inline loading, a spinner and what is being asked;
   at rest a check and what the board holds; its tooltip lists the last
   things done, with how long each took.
   Every request the page makes passes through `fetch`, so this script wraps
   it, and is loaded before the Supabase script, whose client keeps the
   `fetch` it finds. data.js says the rest through `SchedulerActivity`: the
   weeks it reads and holds, and the changes that reach it live. The wrap
   costs a map entry a request, so it stays on with the line off. */
(() => {
  const running = new Map();
  const recent = [];
  let seq = 0, held = '', said = '', saidUntil = 0, on = false, line = null, timer = 0;

  // A table's or a function's name as words: trip_assignments, trip assignments.
  const named = s => decodeURIComponent(s).replace(/[_-]+/g, ' ');
  /* What a request is, in words: the database's tables, functions and files,
     the sign-in, and any other site by its name. The page's own files are
     not news, nor is the live channel, which holds one socket open. */
  function wordsFor(url, method) {
    let u;
    try { u = new URL(url, location.href); } catch { return null; }
    if (u.origin === location.origin) return null;
    const path = u.pathname;
    let m;
    if ((m = path.match(/\/rest\/v1\/rpc\/([^/?]+)/))) return `Running ${named(m[1])}`;
    if ((m = path.match(/\/rest\/v1\/([^/?]+)/))) {
      const what = named(m[1]);
      if (method === 'GET' || method === 'HEAD') return `Reading ${what}`;
      return method === 'DELETE' ? `Deleting from ${what}` : `Saving ${what}`;
    }
    if ((m = path.match(/\/functions\/v1\/([^/?]+)/))) return `Asking ${named(m[1])}`;
    if (path.includes('/storage/v1/')) return method === 'GET' ? 'Loading a file' : 'Saving a file';
    if (path.includes('/auth/v1/')) return 'Checking the sign-in';
    if (path.includes('/realtime/')) return null;
    return `Asking ${u.hostname.replace(/^www\./, '')}`;
  }

  const clock = d => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  function remember(label, ms, ok) {
    recent.unshift({ label, ms, ok, at: new Date() });
    recent.length = Math.min(recent.length, 12);
  }

  /* Starts something under way and gives back the call that ends it. A lead
     is what data.js asks for, such as the weeks it reads, and is shown ahead
     of the requests it makes. */
  function begin(label, lead = false) {
    const id = ++seq;
    running.set(id, { label, lead, t: performance.now() });
    paint();
    return (ok = true) => {
      const run = running.get(id);
      if (!run) return;
      running.delete(id);
      remember(run.label, Math.round(performance.now() - run.t), ok);
      if (!ok) { said = `${run.label} failed`; saidUntil = Date.now() + 4000; }
      paint();
    };
  }
  // Something done at once, shown for a moment and kept in the list.
  function note(label) {
    remember(label, null, true);
    said = label;
    saidUntil = Date.now() + 2500;
    paint();
  }
  // What the board holds, said at rest.
  function hold(text) { held = text; paint(); }

  function build() {
    line = document.getElementById('scheduler-activity');
    if (!line) return false;
    line.innerHTML = '<div class="rux--inline-loading__animation"></div><div class="rux--inline-loading__text"></div>';
    return true;
  }
  const SPINNER = '<div class="rux--loading rux--loading--small"><svg class="rux--loading__svg" viewBox="0 0 100 100"><circle class="rux--loading__background" cx="50%" cy="50%" r="42"></circle><circle class="rux--loading__stroke" cx="50%" cy="50%" r="42"></circle></svg></div>';
  const CHECK = '<svg class="rux--inline-loading__checkmark-container" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><use href="#m-check"/></svg>';
  const ERROR = '<svg class="rux--inline-loading--error" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-error--filled"/></svg>';

  function paint() {
    if (!on || (!line && !build())) return;
    clearTimeout(timer);
    const runs = [...running.values()];
    const shown = runs.find(r => r.lead) || runs.at(-1);
    let mark, text, state;
    if (shown) {
      state = 'busy';
      mark = SPINNER;
      // A lead stands for the requests it makes; loose requests say how many more are going.
      text = shown.label + (!shown.lead && runs.length > 1 ? ` +${runs.length - 1}` : '');
    } else if (said && Date.now() < saidUntil) {
      state = said.endsWith('failed') ? 'error' : 'note';
      mark = state === 'error' ? ERROR : CHECK;
      text = said;
      timer = setTimeout(paint, saidUntil - Date.now());
    } else {
      state = 'rest';
      mark = CHECK;
      text = held || 'Nothing loading';
    }
    const anim = line.firstElementChild, words = line.lastElementChild;
    if (line.dataset.state !== state) { anim.innerHTML = mark; line.dataset.state = state; }
    words.textContent = text;
    line.title = recent.length
      ? recent.map(r => `${clock(r.at)}  ${r.label}${r.ms != null ? ` · ${r.ms}ms` : ''}${r.ok ? '' : ' · failed'}`).join('\n')
      : 'Nothing done yet';
  }
  function show(flag) {
    on = !!flag;
    const el = line || document.getElementById('scheduler-activity');
    if (el) el.hidden = !on;
    paint();
  }

  window.SchedulerActivity = { begin, note, hold, show };

  const base = window.fetch;
  if (typeof base !== 'function') return;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input?.url ?? String(input);
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    const label = wordsFor(url, method);
    if (!label) return base.call(window, input, init);
    const end = begin(label);
    return base.call(window, input, init).then(r => { end(r.ok); return r; }, e => { end(false); throw e; });
  };
})();
