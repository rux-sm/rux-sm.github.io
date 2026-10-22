// app.js -- the behaviour of LN Guide's pages. Each page is complete as
// tools/build-views.mjs wrote it. This picks a task page's view and walks
// Guided one step at a time, keeps where the reader stopped in this browser
// and offers it back on Home, reads search.json for search.html, copies a
// code, and reads a step aloud. For the owner, logged in, data.js adds two
// things from the database: a screen's or an idea's whole text, and the
// answers given where a step is unconfirmed.

(function () {
  const KEY = 'ln-progress';
  const recall = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch (e) { return {}; } };
  const remember = (change) => { try { localStorage.setItem(KEY, JSON.stringify({ ...recall(), ...change })); } catch (e) { /* a private window keeps nothing */ } };
  const params = () => new URLSearchParams(location.search);
  const phone = () => matchMedia('(max-width: 41.98rem)').matches;
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ln = window.Rux?.ln;
  const commit = document.getElementById('main-content')?.dataset.lnCommit;
  let owner = false;
  const said = new Map();   // "scenario step" -> the last outcome the owner gave

  // ---- The owner: what was confirmed ----------------------------------------
  // A task nobody has walked carries a box under the step in view. The owner
  // answers for that step, and the last answer given for it is the one shown.
  const confirm = document.querySelector('[data-confirm]');
  const stepOf = () => document.querySelector('.ln-steps li[data-ref]:not([hidden])')?.dataset.ref;
  let none = null;
  function box() {
    if (!confirm) return;
    const line = confirm.querySelector('[data-said]');
    none ??= line.textContent;
    const answer = said.get(`${confirm.dataset.confirm} ${stepOf()}`);
    line.textContent = answer === 'matched' ? 'You said it matched.' : answer === 'different' ? 'You said it was different.' : none;
    confirm.querySelector('[data-owner]').hidden = !owner;
    confirm.querySelector('[data-different]').hidden = true;
  }
  async function say(outcome, form) {
    const step = stepOf(), line = confirm.querySelector('[data-said]');
    const buttons = [...confirm.querySelectorAll('button')];
    for (const b of buttons) b.disabled = true;
    try {
      await ln.say({ scenario: confirm.dataset.confirm, step, outcome, commit,
        note: form?.elements.note.value.trim(), file: form?.elements.shot.files[0] });
      said.set(`${confirm.dataset.confirm} ${step}`, outcome);
      if (form) { form.reset(); form.querySelector('[data-file-name]').textContent = 'Add a screenshot'; }
      box();
    } catch (e) {
      line.textContent = 'That did not save. Try again.';
    }
    for (const b of buttons) b.disabled = false;
  }
  // How many steps of one waiting task have an answer.
  const answered = (steps, scenario) => steps.filter((id) => said.has(`${scenario} ${id}`)).length;
  function waiting() {
    for (const li of document.querySelectorAll('[data-wait]')) {
      const steps = li.dataset.steps.split(' '), n = owner ? answered(steps, li.dataset.wait) : 0;
      li.querySelector('[data-answered]').textContent = n === 0 ? '' : n === steps.length ? '· you answered it' : `· ${n} of ${steps.length} answered`;
    }
    const count = document.querySelector('[data-waiting]'), list = document.getElementById('waiting');
    if (count && list && owner) {
      const left = JSON.parse(list.textContent).filter((w) => answered(w.steps, w.scenario) < w.steps.length).length;
      count.textContent = `${left === 1 ? '1 task' : `${left} tasks`} nobody has walked in LN yet`;
      count.closest('a').hidden = left === 0;
    }
  }

  // ---- The owner: a screen's or an idea's whole text ---------------------------
  // Atlas sends it as typed blocks. The opening lines show, and each section
  // waits behind its heading. Nothing in it links out: the page above already
  // names the screens, ideas and tasks that belong with it.
  const bare = (v) => esc(v).replace(/(^|[\s(])_([^_]+)_(?=$|[\s).,;:])/g, '$1$2');
  const token = (t) => {
    switch (t.t) {
      case 'text': return esc(t.v);
      case 'strong': case 'field': case 'chip': return `<span class="ln-t-named">${bare(t.v)}</span>`;
      case 'em': case 'quote': return `<span class="ln-t-said">${bare(t.v)}</span>`;
      case 'literal': case 'status': return `<span class="ln-t-exact">${esc(t.v)}</span>`;
      case 'button': return `<span class="ln-t-press">${esc(t.label)}</span>`;
      case 'path': case 'command': return `<span class="ln-t-route">${t.route.split(' \u2794 ').map((x, i, all) => (i ? '<span class="sep">\u2794</span>' : '') + `<span${i === all.length - 1 ? ' class="dest"' : ''}>${esc(x)}</span>`).join('')}</span>`;
      case 'session': return `<span class="ln-t-named">${esc(t.name || t.code)}</span>${t.name ? ` <span class="ln-t-exact">${esc(t.code)}</span>` : ''}`;
      case 'link': return `<span>${esc(t.v)}</span>`;
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
      case 'heading': return `<h4 class="ln-ref__title">${esc(b.title ?? b.text)}</h4>`;
      case 'table': return `<div class="ln-full__rows">${b.rows.map((r) => `<div><b>${tokens(r.cells[0].tokens)}</b>${r.cells.slice(1).map((c, i) =>
        c.text.trim() && c.text.trim() !== '\u2014' ? `<p>${b.columns.length > 2 ? `<span class="ln-quiet">${esc(b.columns[i + 1])}</span> ` : ''}${tokens(c.tokens)}</p>` : '').join('')}</div>`).join('')}</div>`;
      default: return '';
    }
  };
  const ARROW = '<svg class="rux--accordion__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--right"/></svg>';
  async function full() {
    const el = document.querySelector('[data-full]');
    if (!el || !owner || el.dataset.drawn) return;
    el.dataset.drawn = 'yes';
    try {
      const body = await ln.detail(el.dataset.full);
      if (!body) return;
      el.innerHTML = body.intro.map(block).join('') + `<ul class="rux--accordion rux--accordion--end rux--layout--size-md">${body.topics.map((t) => `
        <li class="rux--accordion__item">
          <button type="button" class="rux--accordion__heading" aria-expanded="false">${ARROW}<div class="rux--accordion__title">${esc(t.title)}</div></button>
          <div class="rux--accordion__wrapper"><div class="rux--accordion__content ln-fold">${t.blocks.map(block).join('')}</div></div>
        </li>`).join('')}</ul>`;
      el.hidden = false;
    } catch (e) {
      delete el.dataset.drawn;
    }
  }

  // ---- a task: Full page, or Guided one step at a time -----------------------
  // The screen's shape picks the view: a phone opens Guided, a wide screen the
  // Full page, and ?walk=<step> or ?full in the address asks for one by name.
  const guided = document.querySelector('.ln-guided');
  if (guided) {
    const steps = [...guided.querySelectorAll('.ln-steps li')];
    const views = [...document.querySelectorAll('[data-view]')];
    const nav = document.querySelector('.ln-nav');
    const show = (view) => { for (const el of views) el.hidden = el.dataset.view !== view; nav.hidden = view !== 'guided'; };
    function walk(k) {
      k = Math.min(Math.max(Number(k) || 1, 1), steps.length);
      show('guided');
      for (const li of steps) li.hidden = Number(li.dataset.k) !== k;
      guided.querySelector('[data-bar]').style.transform = `scaleX(${k / steps.length})`;
      guided.querySelector('[data-where]').textContent = `${k} of ${steps.length}`;
      const prev = nav.querySelector('[data-prev]'), next = nav.querySelector('[data-next]');
      prev.href = k > 1 ? `?walk=${k - 1}` : guided.dataset.processHref;
      next.href = k < steps.length ? `?walk=${k + 1}` : (guided.dataset.nextHref ?? guided.dataset.processHref);
      next.textContent = k < steps.length ? 'Next' : (guided.dataset.nextHref ? 'Next task' : 'Done');
      remember({ last: { href: `do/${guided.dataset.task}.html?walk=${k}`, label: `${guided.dataset.process} · ${guided.dataset.title} · step ${k} of ${steps.length}` } });
      box();
      window.scrollTo(0, 0);
    }
    const apply = () => { const p = params(); if (p.has('walk')) walk(p.get('walk')); else if (p.has('full') || !phone()) show('full'); else walk(1); };
    // A link that only changes the query stays on this page.
    document.addEventListener('click', (event) => {
      const a = event.target.closest('a[href^="?"]');
      if (!a || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      history.pushState(null, '', a.getAttribute('href'));
      apply();
    });
    window.addEventListener('popstate', apply);
    document.addEventListener('keydown', (event) => {
      if (nav.hidden || event.target.matches('input, select, textarea') || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'ArrowRight') nav.querySelector('[data-next]').click();
      if (event.key === 'ArrowLeft') nav.querySelector('[data-prev]').click();
    });
    // A swipe across a step moves through the task: left for the next step,
    // right for the one before. A mostly vertical drag is a scroll.
    let from = null;
    guided.addEventListener('touchstart', (event) => { const t = event.touches[0]; from = event.touches.length === 1 ? [t.clientX, t.clientY] : null; }, { passive: true });
    guided.addEventListener('touchend', (event) => {
      if (!from || nav.hidden) return;
      const t = event.changedTouches[0], dx = t.clientX - from[0], dy = t.clientY - from[1];
      from = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy)) return;
      nav.querySelector(dx < 0 ? '[data-next]' : '[data-prev]').click();
    });
    apply();
  }

  // ---- Home: offer back the place the reader stopped --------------------------
  const resume = document.querySelector('[data-resume]');
  if (resume) {
    const at = recall().last;
    if (at?.href && at.label) { resume.href = at.href; resume.querySelector('b').textContent = at.label; resume.hidden = false; }
  }

  // ---- Search: one file, every result, the matches shown as you type -----------
  // A page the query names comes first, on its own; the rest are grouped by
  // kind, each group holding its first ten.
  const results = document.getElementById('results');
  if (results) {
    const input = document.querySelector('[data-search]'), heading = document.querySelector('[data-count]');
    const KINDS = [['Task', 'Tasks'], ['Process', 'Processes'], ['Problem', 'Problems'], ['Screen', 'Screens'], ['Idea', 'Ideas']];
    let index = [];
    const row = (e) => `<li><span class="ln-quiet">${esc(e.k)}</span><b><a class="rux--link" href="${esc(e.h)}"><span>${e.t}</span></a></b>${e.r ? `<p>${e.r}</p>` : ''}</li>`;
    const group = (title, list) => list.length ? `${title ? `<h3 class="ln-ref__title">${title} · ${list.length}</h3>` : ''}<ul class="ln-list">${list.slice(0, 10).map(row).join('')}</ul>` : '';
    const draw = () => {
      const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const hits = words.length ? index.filter((e) => words.every((w) => e.x.includes(w))) : [];
      const named = hits.filter((e) => e.n && words.every((w) => e.n.includes(w)));
      const rest = hits.filter((e) => !named.includes(e));
      results.innerHTML = group('', named) + KINDS.map(([k, title]) => group(title, rest.filter((e) => e.k === k))).join('');
      heading.textContent = words.length ? (hits.length === 1 ? '1 result' : `${hits.length} results`) : '';
      heading.hidden = !words.length;
      document.querySelector('[data-clear]').classList.toggle('rux--search-close--hidden', !input.value);
      const url = input.value ? `?q=${encodeURIComponent(input.value)}` : location.pathname;
      history.replaceState(null, '', url);
    };
    input.value = params().get('q') ?? '';
    fetch('search.json').then((r) => r.json()).then((list) => { index = list; draw(); input.focus(); });
    input.addEventListener('input', draw);
    document.addEventListener('submit', (event) => { if (event.target.matches('.ln-find')) { event.preventDefault(); draw(); } });
  }

  // ---- The grid: the map's lines, drawn between its tiles --------------------------
  // A line leaves a tile's side and enters the next tile's side, turning once
  // in the gap before the tile it reaches. Two tiles in one column are joined
  // top to bottom. A branch is dashed.
  const grid = document.getElementById('map');
  if (grid) {
    const edges = JSON.parse(document.getElementById('edges').textContent);
    const SVG = 'http://www.w3.org/2000/svg';
    const lines = document.createElementNS(SVG, 'svg');
    lines.setAttribute('class', 'ln-map__lines');
    lines.setAttribute('aria-hidden', 'true');
    grid.append(lines);
    const draw = () => {
      const box = grid.getBoundingClientRect();
      const at = (id) => {
        const r = grid.querySelector(`[data-node="${CSS.escape(id)}"]`).getBoundingClientRect();
        return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
      };
      lines.innerHTML = '<defs><marker id="ln-map-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z"/></marker></defs>';
      for (const e of edges) {
        const a = at(e.from), b = at(e.to);
        const d = b.l >= a.r ? `M${a.r} ${a.cy}H${b.l - 10}V${b.cy}H${b.l}`
          : b.r <= a.l ? `M${a.l} ${a.cy}H${b.r + 10}V${b.cy}H${b.r}`
          : b.t >= a.b ? `M${a.cx} ${a.b}V${b.t}` : `M${a.cx} ${a.t}V${b.b}`;
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('d', d);
        if (e.kind === 'branch') path.setAttribute('data-branch', '');
        path.setAttribute('marker-end', 'url(#ln-map-arrow)');
        lines.append(path);
      }
    };
    new ResizeObserver(draw).observe(grid);
    draw();
  }

  // ---- what the reader does anywhere ------------------------------------------------
  document.addEventListener('click', (event) => {
    const el = event.target.closest('a, button');
    if (!el) return;
    if (el.matches('[data-copy]')) return void navigator.clipboard?.writeText(el.dataset.copy);
    if (el.matches('[data-say]')) {
      if (el.dataset.say === 'matched') return void say('matched');
      const form = confirm.querySelector('[data-different]');
      form.hidden = false;
      return void form.elements.note.focus();
    }
    if (el.matches('[data-clear]')) { const input = el.closest('.rux--search').querySelector('input'); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); return void input.focus(); }
    if (el.matches('[data-listen]')) {
      event.preventDefault();
      if (!('speechSynthesis' in window)) return;
      const step = document.querySelector('.ln-steps li:not([hidden])');
      if (!step) return;
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(step.innerText.replace(/\s+/g, ' ')));
    }
  });
  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-different]')) return;
    event.preventDefault();
    say('different', event.target);
  });
  document.addEventListener('change', (event) => {
    if (event.target.name === 'shot') event.target.closest('label').querySelector('[data-file-name]').textContent = event.target.files[0]?.name ?? 'Add a screenshot';
  });
  waiting();
  // The owner's answers and the private shelf arrive after the page shows.
  ln?.owner().then(async (yes) => {
    if (!yes) return;
    for (const row of await ln.said()) said.set(`${row.scenario} ${row.step}`, row.outcome);
    owner = true;
    box();
    waiting();
    full();
  }).catch(() => { /* without the database the page is as it was built */ });
})();
