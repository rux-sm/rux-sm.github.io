// app.js -- the behaviour of LN Guide. index.html carries every screen as
// tools/build-views.mjs wrote it; this shows the one the address asks for and
// keeps the address in step, so Back, a reload and a shared link all work.
// Where the reader stopped, and which tasks they finished, is kept in this
// browser only.

(function () {
  const app = document.querySelector('.ln-app');
  if (!app) return;
  const params = () => new URLSearchParams(location.search);
  const screens = [...app.querySelectorAll('.ln-screen')];
  const one = (sel) => app.querySelector(sel);
  const q = (v) => CSS.escape(v);

  // ---- what is remembered -------------------------------------------------
  const KEY = 'ln-progress';
  const recall = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem('notes-progress')) ?? {}; } catch (e) { return {}; } };
  const remember = (change) => { try { localStorage.setItem(KEY, JSON.stringify({ ...recall(), ...change })); } catch (e) { /* a private window keeps nothing */ } };
  const taskOf = (s, t) => one(`[data-screen="task"][data-s="${q(s)}"][data-t="${q(t)}"]`);
  const hrefOf = (at) => `./?s=${encodeURIComponent(at.s)}&t=${at.t}&k=${at.k}`;

  // ---- which screen the address asks for ----------------------------------
  function wanted(p) {
    const by = (sel) => one(sel);
    if (p.get('c')) return by(`[data-screen="card"][data-c="${q(p.get('c'))}"]`);
    if (p.get('i')) return by(`[data-screen="card"][data-i="${q(p.get('i'))}"]`);
    if (p.get('x')) return by(`[data-screen="card"][data-x="${q(p.get('x'))}"]`);
    if (p.get('v') === 'search') return by('[data-screen="search"]');
    if (p.get('v') === 'map') return by('[data-screen="map"]');
    const s = p.get('s');
    if (s && p.get('done')) return by(`[data-screen="done"][data-s="${q(s)}"]`);
    if (s && p.get('f')) return by(`[data-screen="fork"][data-s="${q(s)}"][data-t="${q(p.get('t'))}"][data-f="${q(p.get('f'))}"]`);
    if (s && p.get('t') != null) return taskOf(s, p.get('t'));
    if (s) return by(`[data-screen="path"][data-s="${q(s)}"]`);
    return null;
  }

  function show() {
    const p = params();
    const screen = wanted(p) ?? one('[data-screen="home"]');
    for (const s of screens) s.hidden = s !== screen;
    const kind = screen.dataset.screen;
    const tab = kind === 'map' ? 'map' : kind === 'search' || kind === 'card' ? 'search' : 'do';
    for (const a of document.querySelectorAll('[data-tab]')) if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    if (kind === 'home') home(screen);
    if (kind === 'path') path(screen);
    if (kind === 'task') task(screen, p);
    if (kind === 'done') remember({ last: null });
    if (kind === 'map') map(screen, p);
    if (kind === 'search') find(screen, p);
    for (const panel of screen.querySelectorAll('[data-panel]')) panel.hidden = true;
    window.scrollTo(0, 0);
  }
  const go = (href, replace) => { history[replace ? 'replaceState' : 'pushState'](null, '', href); show(); };

  // ---- Home: offer back the place the reader stopped -----------------------
  function home(screen) {
    const at = recall().last, card = screen.querySelector('[data-resume]'), there = at && taskOf(at.s, at.t);
    card.hidden = !there;
    if (!there) return;
    card.href = hrefOf(at);
    card.querySelector('b').textContent = `${one(`[data-screen="path"][data-s="${q(at.s)}"] h1`).textContent} · ${there.dataset.title} · step ${at.k} of ${there.querySelectorAll('.ln-steps li').length}`;
  }

  // ---- The path: what is done, and where to start or carry on --------------
  function path(screen) {
    const s = screen.dataset.s, mem = recall(), done = (mem.done ?? {})[s] ?? [];
    const at = mem.last?.s === s ? mem.last : null;
    const stops = [...screen.querySelectorAll('.ln-path li[data-t]')];
    const now = at ? String(at.t) : stops.find((li) => !done.includes(li.dataset.t))?.dataset.t;
    for (const li of stops) {
      const t = li.dataset.t, dot = li.querySelector('.ln-path__dot');
      const state = done.includes(t) && t !== now ? 'done' : t === now ? 'now' : '';
      if (state) li.dataset.state = state; else delete li.dataset.state;
      dot.innerHTML = state === 'done' ? '<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" role="img" aria-label="Done"><use href="#i-checkmark"/></svg>' : li.dataset.n;
    }
    const start = screen.querySelector('[data-start]');
    start.textContent = at || done.length ? 'Carry on' : 'Start';
    if (at) start.href = hrefOf(at); else if (now != null) start.href = `./?s=${encodeURIComponent(s)}&t=${now}`;
  }

  // ---- A task, one step at a time -------------------------------------------
  function task(screen, p) {
    const s = screen.dataset.s, t = screen.dataset.t;
    const steps = [...screen.querySelectorAll('.ln-steps li')];
    const k = Math.min(Math.max(Number(p.get('k')) || 1, 1), steps.length);
    for (const li of steps) li.hidden = Number(li.dataset.k) !== k;
    screen.querySelector('[data-bar]').style.transform = `scaleX(${k / steps.length})`;
    screen.querySelector('[data-where]').textContent = `${screen.dataset.title} · ${k} of ${steps.length}`;
    const base = `./?s=${encodeURIComponent(s)}&t=${t}`;
    screen.querySelector('[data-prev]').href = k > 1 ? `${base}&k=${k - 1}` : `./?s=${encodeURIComponent(s)}`;
    const next = screen.querySelector('[data-next]');
    next.href = k < steps.length ? `${base}&k=${k + 1}` : screen.dataset.after.replace(/&amp;/g, '&');
    next.textContent = k < steps.length ? 'Next' : 'Done';
    next.toggleAttribute('data-last', k === steps.length);
    remember({ last: { s, t, k } });
  }
  function finish(screen) {
    const s = screen.dataset.s, done = recall().done ?? {};
    done[s] = [...new Set([...(done[s] ?? []), screen.dataset.t])];
    remember({ done, last: null });
  }

  // ---- Map: the chosen route as a path, the whole grid behind its button ----
  const grid = document.getElementById('map');
  const routes = grid ? JSON.parse(document.getElementById('routes').textContent) : {};
  const SVG = 'http://www.w3.org/2000/svg';
  let lines = null;
  // A line leaves a tile's side and enters the next tile's side, turning once
  // in the gap before the tile it reaches. Two tiles in one column are joined
  // top to bottom.
  function draw(route) {
    if (!lines) { lines = document.createElementNS(SVG, 'svg'); lines.setAttribute('class', 'ln-map__lines'); lines.setAttribute('aria-hidden', 'true'); grid.append(lines); }
    lines.replaceChildren();
    if (!route || grid.closest('[hidden]')) return;
    const box = grid.getBoundingClientRect();
    const at = (id) => {
      const r = grid.querySelector(`[data-node="${q(id)}"]`).getBoundingClientRect();
      return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
    };
    lines.innerHTML = '<defs><marker id="ln-map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';
    for (const line of route.lines) {
      const a = at(line.from), b = at(line.to);
      const d = b.l >= a.r ? `M${a.r} ${a.cy}H${b.l - 10}V${b.cy}H${b.l}`
        : b.r <= a.l ? `M${a.l} ${a.cy}H${b.r + 10}V${b.cy}H${b.r}`
        : b.t >= a.b ? `M${a.cx} ${a.b}V${b.t}` : `M${a.cx} ${a.t}V${b.b}`;
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      if (line.jump) path.setAttribute('data-jump', '');
      path.setAttribute('marker-end', 'url(#ln-map-arrow)');
      lines.append(path);
    }
  }
  function map(screen, p) {
    const picker = document.getElementById('scenario');
    const s = routes[p.get('s')] ? p.get('s') : (routes[recall().last?.s] ? recall().last.s : picker.value);
    picker.value = s;
    for (const ol of screen.querySelectorAll('[data-route]')) ol.hidden = ol.dataset.route !== s;
    for (const d of screen.querySelectorAll('.ln-detail')) d.hidden = d.dataset.detail !== p.get('n');
    const route = routes[s];
    grid.dataset.lit = s;
    for (const t of grid.querySelectorAll('.ln-map__tile')) {
      const stop = route.stops.find((x) => x.id === t.dataset.node);
      t.toggleAttribute('data-lit', !!stop);
      t.querySelector('.ln-map__n')?.remove();
      if (stop?.tasks.length) { const n = document.createElement('span'); n.className = 'ln-map__n'; n.textContent = stop.tasks.join(', '); t.prepend(n); }
      t.setAttribute('aria-expanded', String(t.dataset.node === p.get('n')));
    }
    draw(route);
  }

  // ---- Search: every result is on the page, and typing shows the matches ----
  function find(screen, p) {
    const input = screen.querySelector('[data-search]');
    if (input.value !== (p.get('q') ?? '')) input.value = p.get('q') ?? '';
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const li of screen.querySelectorAll('#results > li')) {
      const hit = words.length > 0 && count < 30 && words.every((w) => li.dataset.text.includes(w));
      li.hidden = !hit;
      if (hit) count++;
    }
    screen.querySelector('[data-clear]').classList.toggle('rux--search-close--hidden', !input.value);
  }

  // ---- what the reader does ---------------------------------------------------
  document.addEventListener('click', (event) => {
    const el = event.target.closest('a, button');
    if (!el) return;
    if (el.matches('[data-copy]')) return void navigator.clipboard?.writeText(el.dataset.copy);
    if (el.matches('[data-open]')) {
      event.preventDefault();
      const screen = el.closest('.ln-screen'), panel = screen.querySelector(`[data-panel="${el.dataset.open}"]`), was = panel.hidden;
      for (const other of screen.querySelectorAll('[data-panel]')) other.hidden = true;
      panel.hidden = !was;
      return;
    }
    if (el.matches('[data-listen]')) {
      event.preventDefault();
      if (!('speechSynthesis' in window)) return;
      const step = el.closest('.ln-screen').querySelector('.ln-steps li:not([hidden])');
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(step.innerText.replace(/\s+/g, ' ')));
      return;
    }
    if (el.matches('[data-whole]')) {
      const box = el.closest('.ln-screen').querySelector('[data-grid]');
      box.hidden = !box.hidden;
      el.setAttribute('aria-expanded', String(!box.hidden));
      el.textContent = box.hidden ? 'Show the whole map' : 'Hide the whole map';
      return void draw(routes[grid.dataset.lit]);
    }
    if (el.matches('.ln-map__tile')) {
      const p = params();
      if (p.get('n') === el.dataset.node) p.delete('n'); else p.set('n', el.dataset.node);
      return void go(`./?${p}`, true);
    }
    if (el.matches('[data-clear]')) { const input = el.closest('.rux--search').querySelector('input'); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); return void input.focus(); }
    // A link to another screen of this page changes the screen in place.
    if (el.matches('a[href]') && new URL(el.href).pathname === location.pathname && !el.getAttribute('href').startsWith('#') && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      if (el.matches('[data-next][data-last]')) finish(el.closest('.ln-screen'));
      go(el.getAttribute('href'));
    }
  });
  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-search]')) return;
    const text = event.target.value;
    const onSearch = !one('[data-screen="search"]').hidden;
    go(`./?v=search${text ? `&q=${encodeURIComponent(text)}` : ''}`, onSearch);
    const input = one('[data-screen="search"] [data-search]');
    if (document.activeElement !== input) { input.focus(); input.setSelectionRange(text.length, text.length); }
  });
  document.addEventListener('change', (event) => {
    if (event.target.id === 'scenario') go(`./?v=map&s=${encodeURIComponent(event.target.value)}`, true);
  });
  document.addEventListener('keydown', (event) => {
    const screen = one('[data-screen="task"]:not([hidden])');
    if (!screen || event.target.matches('input, select, textarea') || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'ArrowRight') screen.querySelector('[data-next]').click();
    if (event.key === 'ArrowLeft') screen.querySelector('[data-prev]').click();
  });
  // A swipe across a step moves through the task: left for the next step, right
  // for the one before. A mostly vertical drag is a scroll and is left alone.
  let from = null;
  app.addEventListener('touchstart', (event) => { const t = event.touches[0]; from = event.touches.length === 1 ? [t.clientX, t.clientY] : null; }, { passive: true });
  app.addEventListener('touchend', (event) => {
    const screen = one('[data-screen="task"]:not([hidden])');
    if (!from || !screen) return;
    const t = event.changedTouches[0], dx = t.clientX - from[0], dy = t.clientY - from[1];
    from = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return;
    screen.querySelector(dx < 0 ? '[data-next]' : '[data-prev]').click();
  });
  window.addEventListener('popstate', show);
  if (grid) new ResizeObserver(() => draw(routes[grid.dataset.lit])).observe(grid);
  show();
})();
