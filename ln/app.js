// app.js -- the behaviour of LN Guide's pages. Each page is complete as
// tools/build-views.mjs wrote it. This picks a task page's view and walks
// Guided one step at a time, keeps where the reader stopped in this browser
// and offers it back on Home, reads search.json for search.html, copies a
// code, and reads a step aloud. Nothing here talks to the database yet.

(function () {
  const KEY = 'ln-progress';
  const recall = () => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch (e) { return {}; } };
  const remember = (change) => { try { localStorage.setItem(KEY, JSON.stringify({ ...recall(), ...change })); } catch (e) { /* a private window keeps nothing */ } };
  const params = () => new URLSearchParams(location.search);
  const phone = () => matchMedia('(max-width: 41.98rem)').matches;
  const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const results = document.getElementById('results');
  if (results) {
    const input = document.querySelector('[data-search]'), heading = document.querySelector('[data-count]');
    let index = [];
    const draw = () => {
      const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const hits = words.length ? index.filter((e) => words.every((w) => e.x.includes(w))).slice(0, 30) : [];
      results.innerHTML = hits.map((e) => `<li><span class="ln-quiet">${esc(e.k)}</span><b><a class="rux--link" href="${esc(e.h)}"><span>${e.t}</span></a></b>${e.r ? `<p>${e.r}</p>` : ''}</li>`).join('');
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

  // ---- what the reader does anywhere ------------------------------------------------
  document.addEventListener('click', (event) => {
    const el = event.target.closest('a, button');
    if (!el) return;
    if (el.matches('[data-copy]')) return void navigator.clipboard?.writeText(el.dataset.copy);
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
})();
