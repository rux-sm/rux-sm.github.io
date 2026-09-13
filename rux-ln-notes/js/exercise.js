/* ==========================================================================
   rux-ln-notes — THE WORKSHEET
   --------------------------------------------------------------------------
   Behaviour for an exercise page: answers typed into the spaces the data
   marked, boxes ticked, a notepad, a revealable answer key, and an export.
   Everything lives in this browser's localStorage under one key per page;
   nothing is sent anywhere, and the page says so beside the notepad.

   IT READS WHAT build.mjs WROTE AND NOTHING ELSE. Every hook is a data
   attribute the generator put on an element -- data-ln-answer, data-ln-check,
   data-ln-pass, data-ln-reveal, data-ln-notes -- so this file never looks at
   guide text, never guesses that an empty cell is a question, and never
   re-reads the marker contract. The page without this script is still the
   whole worksheet, read-only.

   A KEY IS REVEALED ONLY AFTER SOMETHING IS WRITTEN. The exercises are built
   on predict-then-observe; a key that opens on a blank space removes the
   prediction. The button stays disabled until the space holds text.

   NO DEPENDENCY ON rux-ds's js/. Text areas, checkboxes and buttons are
   native controls that Carbon styles; nothing here needs the kernel.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.querySelector('[data-ln-doc]');
  if (!root) return;
  const docId = root.dataset.lnDoc;
  const KEY = `ln-ex:${docId}`;
  const $ = (sel, el = root) => Array.from(el.querySelectorAll(sel));

  // ---- storage ------------------------------------------------------------
  // Every read and write is guarded: storage can be absent (a private
  // window, a locked-down browser) and the page must still work as a page.
  const empty = () => ({ v: 1, a: {}, c: {}, p: {}, r: {}, notes: '' });
  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : null;
      return s && s.v === 1 ? { ...empty(), ...s } : empty();
    } catch { return empty(); }
  };
  let state = load();
  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* read-only page */ }
    }, 200);
  };

  // ---- controls -----------------------------------------------------------
  const answers = $('textarea[data-ln-answer]');
  const checks = $('input[data-ln-check]');
  const passes = $('input[data-ln-pass]');
  const reveals = $('button[data-ln-reveal]');
  const notes = root.querySelector('textarea[data-ln-notes]');
  const progress = root.querySelector('[data-ln-progress]');

  const autosize = (ta) => {
    ta.style.blockSize = 'auto';
    ta.style.blockSize = `${ta.scrollHeight}px`;
  };
  const hasText = (ta) => ta.value.trim().length > 0;

  // The reveal beside a text area is the next sibling button of its
  // form item; found by structure the generator fixed, not by search.
  const revealFor = (ta) => ta.closest('.ln-q-field')?.querySelector('button[data-ln-reveal]') ?? null;

  const setRevealed = (btn, open) => {
    const panel = document.getElementById(btn.dataset.lnReveal);
    if (!panel) return;
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Hide answer' : 'Reveal answer';
  };

  // ---- status per section, progress overall ------------------------------
  const TAG = { none: 'rux--tag--gray', some: 'rux--tag--blue', done: 'rux--tag--green' };
  const LABEL = { none: 'Not started', some: 'In progress', done: 'Done' };

  const sectionStatus = (section) => {
    const tas = $('textarea[data-ln-answer]', section);
    const boxes = [...$('input[data-ln-check]', section), ...$('input[data-ln-pass]', section)];
    const filled = tas.filter(hasText).length;
    const ticked = boxes.filter(b => b.checked).length;
    const total = tas.length + boxes.length;
    if (total === 0) return 'none';
    if (filled + ticked === 0) return 'none';
    return filled === tas.length && ticked === boxes.length ? 'done' : 'some';
  };

  const refresh = () => {
    const sections = $('[data-ln-section]');
    let done = 0;
    for (const section of sections) {
      const st = sectionStatus(section);
      if (st === 'done') done++;
      const tag = section.querySelector('[data-ln-status]');
      if (tag) {
        tag.classList.remove(TAG.none, TAG.some, TAG.done);
        tag.classList.add(TAG[st]);
        tag.textContent = LABEL[st];
      }
    }
    const filled = answers.filter(hasText).length;
    if (progress) {
      progress.textContent = answers.length
        ? `${filled} of ${answers.length} answered · ${done} of ${sections.length} sections done`
        : `${done} of ${sections.length} sections done`;
    }
    for (const ta of answers) {
      const btn = revealFor(ta);
      if (!btn) continue;
      btn.disabled = !hasText(ta);
      if (btn.disabled) setRevealed(btn, false);
    }
  };

  // ---- hydrate ------------------------------------------------------------
  for (const ta of answers) {
    const saved = state.a[ta.dataset.lnAnswer];
    if (typeof saved === 'string') ta.value = saved;
    autosize(ta);
    ta.addEventListener('input', () => {
      state.a[ta.dataset.lnAnswer] = ta.value;
      autosize(ta); save(); refresh();
    });
  }
  for (const box of checks) {
    box.checked = Boolean(state.c[box.dataset.lnCheck]);
    box.addEventListener('change', () => { state.c[box.dataset.lnCheck] = box.checked; save(); refresh(); });
  }
  for (const box of passes) {
    box.checked = Boolean(state.p[box.dataset.lnPass]);
    box.addEventListener('change', () => { state.p[box.dataset.lnPass] = box.checked; save(); refresh(); });
  }
  for (const btn of reveals) {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      setRevealed(btn, open);
      state.r[btn.dataset.lnReveal] = open; save();
    });
  }
  if (notes) {
    notes.value = state.notes || '';
    autosize(notes);
    notes.addEventListener('input', () => { state.notes = notes.value; autosize(notes); save(); });
  }
  refresh();
  // Re-open what was open, only where the space still holds text.
  for (const btn of reveals) {
    if (state.r[btn.dataset.lnReveal] && !btn.disabled) setRevealed(btn, true);
  }
  window.addEventListener('resize', () => { for (const ta of [...answers, notes].filter(Boolean)) autosize(ta); });

  // ---- export -------------------------------------------------------------
  // Markdown, because it is what the learner sends back and what the
  // consultant reads. Built from the page's own text so the file says what
  // the page said, revision line included.
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const today = () => new Date().toISOString().slice(0, 10);

  const markdown = () => {
    const out = [];
    out.push(`# ${text(root.querySelector('h1'))}`);
    const rev = text(document.querySelector('.ln-revision'));
    out.push(`${rev ? rev + ' · ' : ''}exported ${today()}`, '');
    // THE CHECKLIST FIRST. Every ticked row on the page -- the captures each
    // sitting asks to be handed in, and any other box -- so the report-back
    // opens with what is attached and what is still owed, before the answers.
    const boxes = $('input[data-ln-check]');
    if (boxes.length) {
      const done = boxes.filter(b => b.checked).length;
      out.push(`## Checklist — ${done} of ${boxes.length} done`, '');
      for (const section of $('[data-ln-section]')) {
        const rows = $('.ln-q:has(input[data-ln-check])', section);
        if (!rows.length) continue;
        out.push(`**${text(section.querySelector('h2')).replace(/\s*(Not started|In progress|Done)$/, '')}**`);
        for (const item of rows) {
          const box = item.querySelector('input[data-ln-check]');
          out.push(`${box.checked ? '- [x] ' : '- [ ] '}${text(item.querySelector('.ln-q-label'))}`);
        }
        out.push('');
      }
    }
    for (const section of $('[data-ln-section]')) {
      const h = section.querySelector('h2');
      const title = text(h).replace(/\s*(Not started|In progress|Done)$/, '');
      out.push(`## ${title} — ${LABEL[sectionStatus(section)]}`, '');
      for (const item of $('.ln-q', section)) {
        const label = text(item.querySelector('.ln-q-label'));
        const box = item.querySelector('input[data-ln-check]');
        out.push(`${box ? (box.checked ? '- [x] ' : '- [ ] ') : '- '}**${label}**`);
        for (const dt of $('.ln-meta-row', item)) {
          out.push(`  - ${text(dt.querySelector('dt'))}: ${text(dt.querySelector('dd'))}`);
        }
        const fields = $('textarea[data-ln-answer]', item);
        for (const ta of fields) {
          const name = text(item.querySelector(`label[for="${ta.id}"]`));
          const value = ta.value.trim() || '—';
          out.push(fields.length > 1 ? `  - ${name}: ${value}` : `  ${value}`);
        }
      }
      for (const pass of $('input[data-ln-pass]', section)) {
        const label = text(pass.parentElement.querySelector('.rux--checkbox-label-text')).replace(/^Pass condition:\s*/, '');
        out.push('', `${pass.checked ? '- [x]' : '- [ ]'} Pass condition: ${label}`);
      }
      out.push('');
    }
    if (notes && notes.value.trim()) out.push('## Notes', '', notes.value.trim(), '');
    return out.join('\n');
  };

  root.querySelector('[data-ln-export]')?.addEventListener('click', () => {
    const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${docId}_answers_${today()}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  root.querySelector('[data-ln-copy]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    try {
      await navigator.clipboard.writeText(markdown());
      const was = btn.textContent; btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = was; }, 1500);
    } catch { btn.textContent = 'Copy failed'; }
  });

  root.querySelector('[data-ln-clear]')?.addEventListener('click', () => {
    if (!window.confirm('Clear every answer, tick and note on this page? Export first if you want to keep them.')) return;
    state = empty();
    try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
    for (const ta of answers) { ta.value = ta.dataset.lnGiven ?? ''; autosize(ta); }
    for (const box of [...checks, ...passes]) box.checked = false;
    if (notes) { notes.value = ''; autosize(notes); }
    for (const btn of reveals) setRevealed(btn, false);
    refresh();
  });
})();
