// app.js -- the behaviour of Notes' three views. Each page carries all its
// content as written by tools/build-views.mjs; this shows the part the address
// asks for and keeps the address in step, so a reload or a shared link returns
// to the same scenario, task, tile or search. Nothing is saved.

(function () {
  const params = () => new URLSearchParams(location.search);
  const go = (changes) => {
    const p = params();
    for (const [k, v] of Object.entries(changes)) if (v == null || v === '') p.delete(k); else p.set(k, v);
    const q = p.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  };
  const picker = document.getElementById('scenario');

  for (const b of document.querySelectorAll('[data-copy]')) b.addEventListener('click', () => navigator.clipboard?.writeText(b.dataset.copy));
  for (const a of document.querySelectorAll('[data-more]')) a.addEventListener('click', (event) => {
    event.preventDefault();
    const rest = a.previousElementSibling;
    rest.hidden = !rest.hidden;
    a.textContent = rest.hidden ? 'Show more' : 'Show less';
  });

  // ---- Do: one scenario, one open task ------------------------------------
  const scenarios = [...document.querySelectorAll('.notes-scenario')];
  if (scenarios.length) {
    const show = () => {
      const p = params();
      const current = scenarios.find((s) => s.dataset.scenario === p.get('s')) ?? scenarios[0];
      const tasks = [...current.querySelectorAll('.notes-task')];
      const open = tasks.find((t) => t.dataset.task === p.get('t')) ?? tasks[0];
      for (const s of scenarios) s.hidden = s !== current;
      for (const t of tasks) t.hidden = t !== open;
      for (const a of current.querySelectorAll('.notes-line__tile')) {
        if (a.dataset.task === open.dataset.task) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
      }
      if (picker) picker.value = current.dataset.scenario;
    };
    // A link to a task of this page changes the address and the open task in
    // place; any other link is left to the browser.
    document.addEventListener('click', (event) => {
      const a = event.target.closest('a[href^="do.html?"]');
      if (!a) return;
      event.preventDefault();
      const to = new URL(a.href).searchParams;
      go({ s: to.get('s'), t: to.get('t') });
      show();
    });
    picker?.addEventListener('change', () => { go({ s: picker.value, t: null }); show(); });
    show();
  }

  // ---- Understand: the lit route, and the tile opened under the map -------
  const map = document.getElementById('map');
  if (map) {
    const routes = JSON.parse(document.getElementById('routes').textContent);
    const tile = (id) => map.querySelector(`[data-node="${CSS.escape(id)}"]`);
    const SVG = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'notes-map__lines');
    svg.setAttribute('aria-hidden', 'true');
    map.append(svg);

    // A line leaves a tile's side and enters the next tile's side, turning once
    // in the gap before the tile it reaches. Two tiles in one column are joined
    // top to bottom.
    const draw = () => {
      const route = routes[params().get('s')];
      svg.replaceChildren();
      if (!route) return;
      const box = map.getBoundingClientRect();
      const at = (id) => {
        const r = tile(id).getBoundingClientRect();
        return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
      };
      svg.innerHTML = '<defs><marker id="notes-map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';
      for (const line of route.lines) {
        const a = at(line.from), b = at(line.to);
        const d = b.l >= a.r ? `M${a.r} ${a.cy}H${b.l - 10}V${b.cy}H${b.l}`
          : b.r <= a.l ? `M${a.l} ${a.cy}H${b.r + 10}V${b.cy}H${b.r}`
          : b.t >= a.b ? `M${a.cx} ${a.b}V${b.t}` : `M${a.cx} ${a.t}V${b.b}`;
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('d', d);
        if (line.jump) path.setAttribute('data-jump', '');
        path.setAttribute('marker-end', 'url(#notes-map-arrow)');
        svg.append(path);
      }
    };
    const show = () => {
      const p = params();
      const route = routes[p.get('s')];
      if (route) map.dataset.lit = p.get('s'); else delete map.dataset.lit;
      for (const t of map.querySelectorAll('.notes-map__tile')) {
        const stop = route?.stops.find((x) => x.id === t.dataset.node);
        t.toggleAttribute('data-lit', !!stop);
        t.querySelector('.notes-map__n')?.remove();
        if (stop?.tasks.length) {
          const n = document.createElement('span');
          n.className = 'notes-map__n';
          n.textContent = stop.tasks.join(', ');
          t.prepend(n);
        }
        t.setAttribute('aria-expanded', String(t.dataset.node === p.get('n')));
      }
      for (const d of document.querySelectorAll('.notes-detail')) d.hidden = d.dataset.detail !== p.get('n');
      if (picker) picker.value = route ? p.get('s') : '';
      draw();
    };
    map.addEventListener('click', (event) => {
      const t = event.target.closest('.notes-map__tile');
      if (!t) return;
      go({ n: params().get('n') === t.dataset.node ? null : t.dataset.node });
      show();
    });
    document.addEventListener('click', (event) => {
      const a = event.target.closest('.notes-detail a[data-node]');
      if (!a) return;
      event.preventDefault();
      go({ n: a.dataset.node });
      show();
    });
    picker?.addEventListener('change', () => { go({ s: picker.value }); show(); });
    new ResizeObserver(draw).observe(map);
    show();
  }

  // ---- Look up: every card is on the page, and the search shows its matches
  const input = document.getElementById('lookup');
  if (input) {
    const cards = [...document.querySelectorAll('#results [data-text]')];
    const clear = document.querySelector('.rux--search-close');
    const LIMIT = 24;
    const find = () => {
      const q = input.value.trim().toLowerCase();
      const words = q.split(/\s+/).filter(Boolean);
      let count = 0;
      for (const c of cards) {
        const hit = words.length > 0 && words.every((w) => c.dataset.text.includes(w)) && count < LIMIT;
        c.hidden = !hit;
        if (hit) count++;
      }
      clear.classList.toggle('rux--search-close--hidden', !q);
      go({ q: input.value.trim() });
    };
    input.value = params().get('q') ?? '';
    input.addEventListener('input', find);
    clear.addEventListener('click', () => { input.value = ''; find(); input.focus(); });
    find();
  }
})();
