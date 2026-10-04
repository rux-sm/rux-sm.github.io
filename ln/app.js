// app.js -- the behaviour of LN Guide. index.html carries every screen as
// tools/build-views.mjs wrote it; this shows the one the address asks for and
// keeps the address in step, so Back, a reload and a shared link all work.
// Where the reader stopped, and which tasks they finished, is kept in this
// browser only. For the owner, logged in, data.js adds two things from the
// database: a card's whole text, and the answers given where a step is
// unconfirmed.

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
    if (p.get('v') === 'confirm') return by('[data-screen="confirm"]');
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
    if (kind === 'card') full(screen);
    if (kind === 'confirm') waiting(screen);
    box(screen);
    for (const panel of screen.querySelectorAll('[data-panel]')) panel.hidden = true;
    window.scrollTo(0, 0);
  }
  const go = (href, replace) => { history[replace ? 'replaceState' : 'pushState'](null, '', href); show(); };

  // ---- Home: offer back the place the reader stopped -----------------------
  function home(screen) {
    const at = recall().last, card = screen.querySelector('[data-resume]'), there = at && taskOf(at.s, at.t);
    card.hidden = !there;
    const count = screen.querySelector('[data-waiting]');
    if (count) { const n = owner ? left() : Number(count.dataset.waiting); count.textContent = n === 1 ? '1 task' : `${n} tasks`; count.closest('a').hidden = n === 0; }
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

  // ---- The owner: what was confirmed ----------------------------------------
  // A task nobody has walked carries a box. The owner answers for the step in
  // view, and the last answer given for a step is the one shown.
  const ln = window.Rux?.ln;
  const commit = document.getElementById('main-content').dataset.lnCommit;
  let owner = false;
  const said = new Map();
  const NONE = new WeakMap();
  const stepOf = (el) => el.dataset.step ?? el.closest('.ln-screen').querySelector('.ln-steps li:not([hidden])')?.dataset.ref;
  function box(screen) {
    const el = screen.querySelector('[data-confirm]');
    if (!el) return;
    const line = el.querySelector('[data-said]');
    if (!NONE.has(el)) NONE.set(el, line.textContent);
    const answer = said.get(`${el.dataset.confirm} ${stepOf(el)}`);
    line.textContent = answer === 'matched' ? 'You said it matched.' : answer === 'different' ? 'You said it was different.' : NONE.get(el);
    el.querySelector('[data-owner]').hidden = !owner;
    el.querySelector('[data-different]').hidden = true;
  }
  async function say(el, outcome, form) {
    const step = stepOf(el), line = el.querySelector('[data-said]');
    const buttons = [...el.querySelectorAll('button')];
    for (const b of buttons) b.disabled = true;
    try {
      await ln.say({ scenario: el.dataset.confirm, step, outcome, commit,
        note: form?.elements.note.value.trim(), file: form?.elements.shot.files[0] });
      said.set(`${el.dataset.confirm} ${step}`, outcome);
      if (form) { form.reset(); form.querySelector('[data-file-name]').textContent = 'Add a screenshot'; }
      box(el.closest('.ln-screen'));
    } catch (e) {
      line.textContent = 'That did not save. Try again.';
    }
    for (const b of buttons) b.disabled = false;
  }
  // How many steps of one waiting task have an answer, and how many tasks wait.
  const answered = (li) => li.dataset.steps.split(' ').filter((id) => said.has(`${li.dataset.wait} ${id}`)).length;
  const left = () => [...app.querySelectorAll('[data-wait]')].filter((li) => answered(li) < li.dataset.steps.split(' ').length).length;
  function waiting(screen) {
    for (const li of screen.querySelectorAll('[data-wait]')) {
      const all = li.dataset.steps.split(' ').length, n = owner ? answered(li) : 0;
      li.querySelector('[data-answered]').textContent = n === 0 ? '' : n === all ? 'You answered it' : `${n} of ${all} steps answered`;
    }
  }

  // ---- The owner: a card's whole text ----------------------------------------
  // Atlas sends a screen's or an idea's text as typed blocks. The opening lines
  // show, and each section waits behind its heading.
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cardHref = (id) => one(`[data-screen="card"][data-c="${q(id)}"]`) ? `./?c=${encodeURIComponent(id)}`
    : one(`[data-screen="card"][data-i="${q(id)}"]`) ? `./?i=${encodeURIComponent(id)}`
    : one(`[data-screen="path"][data-s="${q(id)}"]`) ? `./?s=${encodeURIComponent(id)}` : null;
  const linked = (id, html) => cardHref(id) ? `<a class="rux--link" href="${cardHref(id)}">${html}</a>` : html;
  // Atlas marks a field's name with underscores, and leaves them in where the
  // name sits inside bold or quoted words.
  const bare = (v) => esc(v).replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,;:])/g, '$1$2');
  const token = (t) => {
    switch (t.t) {
      case 'text': return esc(t.v);
      case 'strong': case 'field': case 'chip': return `<span class="ln-t-named">${bare(t.v)}</span>`;
      case 'em': case 'quote': return `<span class="ln-t-said">${bare(t.v)}</span>`;
      case 'literal': case 'status': return `<span class="ln-t-exact">${esc(t.v)}</span>`;
      case 'button': return `<span class="ln-t-press">${esc(t.label)}</span>`;
      case 'path': return `<span class="ln-t-route">${t.route.split(' \u2794 ').map((x, i, all) => (i ? '<span class="sep">\u2794</span>' : '') + `<span${i === all.length - 1 ? ' class="dest"' : ''}>${esc(x)}</span>`).join('')}</span>`;
      case 'session': return `${linked(t.code, `<span class="ln-t-named">${esc(t.name || t.code)}</span>`)}${t.name ? ` <span class="ln-t-exact">${esc(t.code)}</span>` : ''}`;
      case 'link': return linked(t.href.split('/').pop().replace(/\.md$/, ''), `<span>${esc(t.v)}</span>`);
      case 'gap': return '<span class="ln-t-gap">Not known yet:</span> ';
      default: return esc(t.v ?? '');
    }
  };
  const tokens = (list) => (list ?? []).map(token).join('');
  const LABEL = { note: 'Note', warning: 'Watch out', prerequisite: 'First' };
  const block = (b) => {
    switch (b.kind) {
      case 'prose': case 'source': return `<p${b.kind === 'source' ? ' class="ln-quiet"' : ''}>${tokens(b.tokens)}</p>`;
      case 'list': return `<${b.ordered ? 'ol' : 'ul'} class="ln-full__list">${b.items.map((i) => `<li>${tokens(i.tokens)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`;
      case 'callout': return `<div class="ln-full__note"><span class="ln-quiet">${LABEL[b.variant] ?? 'Note'}</span>${b.blocks.map(block).join('')}</div>`;
      case 'code': return `<pre class="ln-full__code">${esc(b.text)}</pre>`;
      // A table is read down a phone: each row leads with its first cell, and
      // every other cell sits under its column's name.
      case 'table': return `<div class="ln-full__rows">${b.rows.map((r) => `<div><b>${tokens(r.cells[0].tokens)}</b>${r.cells.slice(1).map((c, i) =>
        c.text.trim() && c.text.trim() !== '\u2014' ? `<p>${b.columns.length > 2 ? `<span class="ln-quiet">${esc(b.columns[i + 1])}</span> ` : ''}${tokens(c.tokens)}</p>` : '').join('')}</div>`).join('')}</div>`;
      default: return '';
    }
  };
  const ARROW = '<svg class="rux--accordion__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--right"/></svg>';
  async function full(screen) {
    const el = screen.querySelector('[data-full]');
    if (!el || !owner || el.dataset.drawn) return;
    el.dataset.drawn = 'yes';
    try {
      const body = await ln.detail(screen.dataset.c ?? screen.dataset.i);
      if (!body) return;
      el.innerHTML = body.intro.map(block).join('') + `<ul class="rux--accordion rux--accordion--end rux--layout--size-md">${body.topics.map((t) => `
        <li class="rux--accordion__item">
          <button type="button" class="rux--accordion__heading" aria-expanded="false">${ARROW}<div class="rux--accordion__title">${esc(t.title)}</div></button>
          <div class="rux--accordion__wrapper"><div class="rux--accordion__content">${t.blocks.map(block).join('')}</div></div>
        </li>`).join('')}</ul>`;
      el.hidden = false;
    } catch (e) {
      delete el.dataset.drawn;
    }
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
    if (el.matches('[data-say]')) {
      const confirm = el.closest('[data-confirm]');
      if (el.dataset.say === 'matched') return void say(confirm, 'matched');
      const form = confirm.querySelector('[data-different]');
      form.hidden = false;
      return void form.elements.note.focus();
    }
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
  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-different]')) return;
    event.preventDefault();
    say(event.target.closest('[data-confirm]'), 'different', event.target);
  });
  document.addEventListener('change', (event) => {
    if (event.target.name === 'shot') event.target.closest('label').querySelector('[data-file-name]').textContent = event.target.files[0]?.name ?? 'Add a screenshot';
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
  // The owner's answers and the private shelf arrive after the page shows, and
  // the screen in view is drawn again once they are here.
  ln?.owner().then(async (yes) => {
    if (!yes) return;
    for (const row of await ln.said()) said.set(`${row.scenario} ${row.step}`, row.outcome);
    owner = true;
    const screen = one('.ln-screen:not([hidden])');
    box(screen);
    if (screen.dataset.screen === 'home') home(screen);
    if (screen.dataset.screen === 'card') full(screen);
    if (screen.dataset.screen === 'confirm') waiting(screen);
  }).catch(() => { /* without the database the page is as it was built */ });
})();
