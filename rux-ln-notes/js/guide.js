/* ==========================================================================
   rux-ln-notes — THE GUIDE NOTEPAD
   --------------------------------------------------------------------------
   Behaviour for a guide page: a place to write down the value a step yields,
   beside that step, plus a notepad for what belongs to no single step, and an
   export. Everything lives in this browser's localStorage under one key per
   guide; nothing is sent anywhere, and the page says so beside the box.

   IT READS WHAT build.mjs WROTE AND NOTHING ELSE. Three data attributes --
   data-ln-doc, data-ln-note, data-ln-notes -- so this file never looks at
   guide text, never decides for itself which step yields a value, and never
   re-reads the marker contract. Which steps produce something is authored in
   atlas and arrives as `produces`; the generator turns that into a field and
   this only fills it in.

   THE PAGE WITHOUT THIS SCRIPT IS STILL THE WHOLE GUIDE. Every phase, table
   and step reads as it does now; the fields are simply inert. That is the
   same contract js/exercise.js holds, and the reason a guide is generated as
   a complete document rather than assembled here.

   IT IS DELIBERATELY NOT THE WORKSHEET. A guide is read while doing the
   thing, so there is no progress count, no pass condition and nothing to
   reveal -- those belong to an exercise, where predict-then-observe is the
   point. Here a reader is recording what they saw.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.querySelector('[data-ln-doc]');
  if (!root) return;
  const docId = root.dataset.lnDoc;
  const KEY = `ln-guide:${docId}`;
  const $ = (sel) => Array.from(root.querySelectorAll(sel));

  // ---- storage ------------------------------------------------------------
  // Every read and write is guarded. Storage can be absent or throw -- a
  // private window, a browser set to block site data -- and the page must
  // still work as a page when it does.
  const empty = () => ({ v: 1, n: {}, notes: '' });
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
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* read-only */ }
    }, 200);
  };

  // ---- controls -----------------------------------------------------------
  const fields = $('textarea[data-ln-note]');
  const notes = root.querySelector('textarea[data-ln-notes]');

  // A ONE-ROW BOX THAT GROWS. A noted value is usually short and occasionally
  // a sentence; a fixed box is either too big for every row on the page or
  // too small for the one that matters.
  const autosize = (ta) => {
    ta.style.blockSize = 'auto';
    ta.style.blockSize = `${ta.scrollHeight}px`;
  };

  for (const ta of fields) {
    const id = ta.dataset.lnNote;
    if (state.n[id]) ta.value = state.n[id];
    autosize(ta);
    ta.addEventListener('input', () => {
      const v = ta.value;
      if (v.trim()) state.n[id] = v; else delete state.n[id];
      autosize(ta);
      save();
    });
  }

  if (notes) {
    notes.value = state.notes ?? '';
    autosize(notes);
    notes.addEventListener('input', () => { state.notes = notes.value; autosize(notes); save(); });
  }

  window.addEventListener('resize', () => {
    for (const ta of [...fields, notes].filter(Boolean)) autosize(ta);
  });

  // ---- export -------------------------------------------------------------
  // Markdown, built from the page's own text, so the file says what the page
  // said. A value with no step around it is not worth keeping, so each noted
  // value carries the step id and the step's own instruction.
  const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const today = () => new Date().toISOString().slice(0, 10);

  const markdown = () => {
    const out = [];
    out.push(`# ${text(root.querySelector('h1'))}`);
    const rev = text(document.querySelector('.ln-revision'));
    out.push(`${rev ? rev + ' · ' : ''}exported ${today()}`, '');

    let phase = null;
    let wrote = false;
    for (const ta of fields) {
      if (!ta.value.trim()) continue;
      const row = ta.closest('tr');
      const section = ta.closest('section');
      const heading = text(section?.querySelector('h3, h2'));
      // A BLANK LINE BEFORE THE HEADING, NOT ONLY AFTER IT. Without it the
      // second phase heading follows a list item directly and a strict
      // Markdown parser reads it as more list text, not a heading.
      if (heading && heading !== phase) {
        phase = heading;
        if (out[out.length - 1] !== '') out.push('');
        out.push(`## ${phase}`, '');
      }
      const step = text(row?.querySelector('.ln-step-id'));
      // The instruction, not the whole answer cell: the reader wants to know
      // which step this value came from, and the answer cell now contains
      // this very field's label.
      const did = text(row?.children[1]);
      out.push(`- **${step}** ${did}`);
      out.push(`  - ${ta.value.trim()}`);
      wrote = true;
    }
    if (!wrote) out.push('_No values noted._', '');
    if (notes && notes.value.trim()) out.push('', '## Notes', '', notes.value.trim(), '');
    return out.join('\n');
  };

  root.querySelector('[data-ln-export]')?.addEventListener('click', () => {
    const blob = new Blob([markdown()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${docId}_notes_${today()}.md`;
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
    if (!window.confirm('Clear every value and note on this page? Export first if you want to keep them.')) return;
    state = empty();
    try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
    for (const ta of fields) { ta.value = ''; autosize(ta); }
    if (notes) { notes.value = ''; autosize(notes); }
  });
})();
