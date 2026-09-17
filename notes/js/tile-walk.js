/* ==========================================================================
   Notes — WALK THIS, inside a tile on the path
   --------------------------------------------------------------------------
   For the owner, signed in. An open tile's procedure gets a Walk this button;
   starting or continuing turns each step row of that tile into a place to
   write what happened and attach screenshots. Everything is saved as it goes
   to the same tables and bucket the walk page uses, so atlas's
   tools/pull.py brings it home unchanged: a walk from a tile is a walk of
   that walkthrough with only this tile's steps filled in.

   THE RULES ARE THE WALK PAGE'S. A walk pins the commit this build came from,
   is written on the day it is walked, and continues only on the build it
   started on (notes/docs/owner-tools.md).

   A PAGE WITHOUT A LOG-IN IS UNCHANGED. The button stays hidden, as every
   data-notes-owner element does until js/online.js finds the owner.
   ========================================================================== */
(() => {
  'use strict';
  const blocks = [...document.querySelectorAll('[data-notes-tile-walk]')];
  if (!blocks.length) return;
  const REMEMBER = 'notes-walk-environment';
  const BUCKET = 'notes-walk-shots';
  const commit = document.getElementById('main-content')?.dataset.notesCommit ?? '';
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  const pad = n => String(n).padStart(2, '0');
  // The local time with its offset, as atlas's newwalk.py writes `started:`.
  const stamp = d => {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      + `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  };
  const remembered = () => {
    try { return JSON.parse(localStorage.getItem(REMEMBER) ?? '{}') ?? {}; } catch { return {}; }
  };

  let db = null;
  let storage = null;

  // One walk per walkthrough, shared by every tile that opens it.
  const walks = new Map();

  async function todaysWalk(walkthrough) {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const rows = must(await db.from('notes_walks')
      .select('id, walkthrough, atlas_commit, started, company, ln_user')
      .eq('walkthrough', walkthrough).eq('atlas_commit', commit)
      .gte('created_at', midnight.toISOString())
      .order('created_at', { ascending: false }).limit(1));
    return rows[0] ?? null;
  }

  async function loadWalk(walk) {
    const [steps, shots] = await Promise.all([
      db.from('notes_walk_steps').select('step, actual, notes').eq('walk_id', walk.id),
      db.from('notes_walk_shots').select('step').eq('walk_id', walk.id),
    ]);
    const state = { walk, steps: new Map(), shots: new Map() };
    for (const r of must(steps)) state.steps.set(r.step, r);
    for (const r of must(shots)) state.shots.set(r.step, (state.shots.get(r.step) ?? 0) + 1);
    walks.set(walk.walkthrough, state);
    return state;
  }

  function shotsText(n) { return n ? `${n} screenshot${n > 1 ? 's' : ''}` : ''; }

  // Each step row of this tile's procedure gets what-happened and a screenshot.
  function arm(block, state) {
    const procedure = block.closest('[data-notes-tile-procedure]');
    const say = block.querySelector('[data-notes-tile-walk-status]');
    for (const row of procedure.querySelectorAll('tr[data-notes-step]')) {
      if (row.querySelector('.notes-path-walk-step')) continue;
      const step = row.dataset.notesStep;
      const cell = row.lastElementChild;
      const id = `tw-${block.dataset.notesTileWalkId}-${step}`.replace(/[^\w-]/g, '-');
      const box = document.createElement('div');
      box.className = 'notes-path-walk-step';
      box.innerHTML = `<div class="rux--form-item"><label class="rux--label"></label><div class="rux--text-area__wrapper"><textarea class="rux--text-area" rows="1"></textarea></div></div><div class="notes-path-row"><button type="button" class="rux--btn rux--btn--ghost rux--btn--sm">Add screenshot</button><span class="rux--type-body-01"></span></div><input type="file" accept="image/png,image/jpeg" hidden>`;
      const label = box.querySelector('label');
      const area = box.querySelector('textarea');
      const count = box.querySelector('span');
      const file = box.querySelector('input');
      label.textContent = 'What happened';
      label.htmlFor = id;
      area.id = id;
      area.value = state.steps.get(step)?.actual ?? '';
      count.textContent = shotsText(state.shots.get(step) ?? 0);
      cell.append(box);

      let dirty = false;
      area.addEventListener('input', () => { dirty = true; });
      area.addEventListener('blur', async () => {
        if (!dirty) return;
        const before = state.steps.get(step);
        const saved = { walk_id: state.walk.id, step, actual: area.value, notes: before?.notes ?? '' };
        try {
          must(await db.from('notes_walk_steps').upsert(saved));
          state.steps.set(step, saved);
          dirty = false;
          say.textContent = `Step ${step} saved.`;
        } catch (e) { say.textContent = `Step ${step} not saved: ${e.message}`; }
      });

      const attach = async image => {
        if (!image || !/^image\/(png|jpeg)$/.test(image.type)) { say.textContent = 'A screenshot is a PNG or JPEG image.'; return; }
        const path = `${state.walk.id}/${step}_${Date.now()}.${image.type === 'image/png' ? 'png' : 'jpg'}`;
        say.textContent = `Saving the screenshot for step ${step}`;
        try {
          must(await storage.from(BUCKET).upload(path, image, { contentType: image.type, upsert: false }));
          const inserted = await db.from('notes_walk_shots').insert({ walk_id: state.walk.id, step, what: '', path });
          if (inserted.error) {
            await storage.from(BUCKET).remove([path]);
            throw new Error(inserted.error.message);
          }
          state.shots.set(step, (state.shots.get(step) ?? 0) + 1);
          count.textContent = shotsText(state.shots.get(step));
          say.textContent = `Screenshot saved for step ${step}.`;
        } catch (e) { say.textContent = `Screenshot not saved: ${e.message}`; }
      };
      box.querySelector('button').addEventListener('click', () => file.click());
      file.addEventListener('change', () => { attach(file.files[0]); file.value = ''; });
      // A screenshot pasted while writing what happened belongs to that step.
      area.addEventListener('paste', event => {
        const item = [...(event.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
        if (item) { event.preventDefault(); attach(item.getAsFile()); }
      });
    }
    say.textContent = `Walking since ${state.walk.started.slice(11, 16)}. Each step saves as you leave it; atlas's pull brings the walk home.`;
    block.querySelector('[data-notes-tile-walk-start]').hidden = true;
    block.querySelector('[data-notes-tile-walk-form]').hidden = true;
  }

  function wire(block, index) {
    block.dataset.notesTileWalkId = String(index);
    const walkthrough = block.dataset.notesTileWalk;
    const start = block.querySelector('[data-notes-tile-walk-start]');
    const form = block.querySelector('[data-notes-tile-walk-form]');
    const company = form.querySelector('[data-notes-tile-walk-company]');
    const user = form.querySelector('[data-notes-tile-walk-user]');
    const say = block.querySelector('[data-notes-tile-walk-status]');

    start.addEventListener('click', async () => {
      try {
        const known = walks.get(walkthrough);
        if (known) { arm(block, known); return; }
        const today = await todaysWalk(walkthrough);
        if (today) { arm(block, await loadWalk(today)); return; }
        const saved = remembered();
        company.value = saved.company ?? '';
        user.value = saved.user ?? '';
        form.hidden = false;
        company.focus();
      } catch (e) { say.textContent = `Your walks could not be read: ${e.message}`; }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const c = company.value.trim();
      const u = user.value.trim();
      if (!/^[A-Za-z0-9]{1,10}$/.test(c)) { say.textContent = 'The company is letters and digits, as the LN status bar shows it.'; return; }
      if (!/^[A-Za-z0-9._-]{1,32}$/.test(u)) { say.textContent = 'The user is letters, digits, dots, dashes or underscores, as the LN status bar shows it.'; return; }
      try { localStorage.setItem(REMEMBER, JSON.stringify({ company: c, user: u })); } catch { /* not remembered */ }
      const started = stamp(new Date());
      const walk = {
        id: `WK_${walkthrough}_${started.slice(0, 10)}_${started.slice(11, 19).replaceAll(':', '')}`,
        walkthrough, atlas_commit: commit, started, company: c, ln_user: u,
      };
      try {
        must(await db.from('notes_walks').insert(walk));
        const state = { walk, steps: new Map(), shots: new Map() };
        walks.set(walkthrough, state);
        arm(block, state);
      } catch (e) { say.textContent = `The walk did not start: ${e.message}`; }
    });
  }

  // After every script on the page has run: this file loads before account.js.
  const whenReady = run => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', run, { once: true }) : run());
  whenReady(async () => {
    const account = window.Rux?.account;
    if (!account || !commit) return;
    let session = null;
    try { session = await account.getSession(); } catch { return; }
    if (!session?.user || session.user.is_anonymous || !window.Rux?.access?.accessOf(session.user).owner) return;
    db = account.client.schema('platform');
    storage = account.client.storage;
    blocks.forEach(wire);
  });
})();
