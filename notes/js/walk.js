/* ==========================================================================
   Notes — THE WALK PAGE
   --------------------------------------------------------------------------
   One run of a walkthrough, one step at a time, from any device signed in as
   the owner. Each answer is saved to platform.notes_walk_steps as it is left
   and each screenshot goes to the private notes-walk-shots bucket, so a walk
   survives a closed tab. atlas's tools/pull.py turns it into a walk file.

   THE STEPS ARE THE PUBLISHED WALKTHROUGH'S. They are read from the same
   data/atlas/<id>.json the walkthrough page is built from, and a walk records
   the commit that build came from, which is the commit its walk file pins.

   A WALK IS WRITTEN ON THE DAY IT IS WALKED (atlas standards/walk-rules.md
   §1), so only today's walks are offered to continue.
   ========================================================================== */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const REMEMBER = 'notes-walk-environment';
  const BUCKET = 'notes-walk-shots';
  const commit = $('main-content')?.dataset.notesCommit ?? '';
  const walkthroughs = JSON.parse($('walk-walkthroughs')?.textContent || '[]');
  const state = { db: null, storage: null, walk: null, flat: [], at: 0, dirty: false };

  const pad = n => String(n).padStart(2, '0');
  // The local time with its offset, as newwalk.py writes `started:`.
  const stamp = d => {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      + `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
  };
  const titleOf = id => walkthroughs.find(w => w.id === id)?.title ?? id;

  const show = message => { $('walk-message-text').textContent = message; $('walk-message').hidden = false; };
  const clear = () => { $('walk-message').hidden = true; };
  const status = text => { $('walk-status').textContent = text; };
  const gate = text => { $('walk-gate').textContent = text; $('walk-gate').hidden = !text; };
  const option = (value, label) => Object.assign(document.createElement('option'),
    { className: 'rux--select-option', value, textContent: label });
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

  // ---- the steps -----------------------------------------------------------
  // The rows a walk file carries: every row of a steps or alternatives table
  // that has a step id, with its second and third cells as Do and See.
  async function phasesOf(walkthrough) {
    const res = await fetch(`../data/atlas/${encodeURIComponent(walkthrough)}.json`);
    if (!res.ok) throw new Error(`${titleOf(walkthrough)} is not in this build of Notes`);
    const doc = await res.json();
    return (doc.phases ?? []).map(p => ({
      n: p.n, title: p.title, route: p.route ?? '',
      steps: (p.blocks ?? []).filter(b => b.kind === 'steps' || b.kind === 'alternatives')
        .flatMap(b => (b.rows ?? []).filter(r => r.id).map(r => ({
          step: r.id, do: r.cells?.[1]?.text ?? '', see: r.cells?.[2]?.text ?? '',
          actual: '', notes: '', shots: [],
        }))),
    })).filter(p => p.steps.length);
  }

  // ---- start and continue --------------------------------------------------
  async function loadStart() {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER) ?? '{}');
      $('walk-company').value = saved.company ?? '';
      $('walk-user').value = saved.user ?? '';
    } catch { /* nothing remembered */ }
    $('walk-walkthrough').replaceChildren(...walkthroughs.map(w => option(w.id, w.title)));
    // A walkthrough page links here as walk.html#<walkthrough id>.
    const wanted = decodeURIComponent(location.hash.slice(1));
    if (walkthroughs.some(w => w.id === wanted)) $('walk-walkthrough').value = wanted;

    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const today = must(await state.db.from('notes_walks')
      .select('id, walkthrough, atlas_commit, started, company, ln_user')
      .gte('created_at', midnight.toISOString()).order('created_at', { ascending: false }));
    $('walk-resume').replaceChildren(...today.map(w =>
      option(w.id, `${titleOf(w.walkthrough)} · started ${w.started.slice(11, 16)}`)));
    $('walk-resume-section').hidden = !today.length;
    state.today = today;
    $('walk-start').hidden = false;
  }

  async function open(walk) {
    const phases = await phasesOf(walk.walkthrough);
    const [steps, shots] = await Promise.all([
      state.db.from('notes_walk_steps').select('step, actual, notes').eq('walk_id', walk.id),
      state.db.from('notes_walk_shots').select('step, what, path, created_at').eq('walk_id', walk.id).order('created_at'),
    ]);
    const byStep = new Map(phases.flatMap(p => p.steps.map(s => [s.step, s])));
    for (const row of must(steps)) {
      const s = byStep.get(row.step);
      if (s) { s.actual = row.actual; s.notes = row.notes; }
    }
    for (const row of must(shots)) byStep.get(row.step)?.shots.push(row);

    state.walk = { ...walk, phases };
    state.flat = phases.flatMap(phase => phase.steps.map(step => ({ phase, step })));
    if (!state.flat.length) throw new Error('this walkthrough has no steps to fill in');
    const first = state.flat.findIndex(x => !x.step.actual);
    state.at = first < 0 ? 0 : first;
    $('walk-title').textContent = `Walk · ${titleOf(walk.walkthrough)}`;
    $('walk-start').hidden = true;
    $('walk-run').hidden = false;
    clear();
    render();
    if (walk.atlas_commit !== commit) {
      status('This walk started on an earlier build of Notes. The steps shown are this build\'s.');
    }
  }

  // ---- one step ------------------------------------------------------------
  function renderProgress() {
    const { phase: current, step: currentStep } = state.flat[state.at];
    const icons = { current: 'i-incomplete', complete: 'i-checkmark--outline', incomplete: 'i-circle-dash' };
    const words = { current: 'Current', complete: 'Complete', incomplete: 'Not started' };
    // Whole class names, so the class check can read every one.
    const classes = { current: 'rux--progress-step rux--progress-step--current',
      complete: 'rux--progress-step rux--progress-step--complete',
      incomplete: 'rux--progress-step rux--progress-step--incomplete' };
    $('walk-progress').replaceChildren(...state.walk.phases.map(phase => {
      const done = phase.steps.every(s => s.actual);
      const kind = phase === current ? 'current' : done ? 'complete' : 'incomplete';
      const li = document.createElement('li');
      li.className = classes[kind];
      li.innerHTML = `<button type="button" class="rux--progress-step-button rux--progress-step-button--unclickable"><svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><use href="#${icons[kind]}"/></svg><div class="rux--progress-text"><span class="rux--progress-label"></span></div><span class="rux--assistive-text"></span><span class="rux--progress-line"></span></button>`;
      li.querySelector('.rux--progress-label').textContent = `Phase ${phase.n}${phase.title ? ` · ${phase.title}` : ''}`;
      li.querySelector('.rux--assistive-text').textContent = words[kind];
      if (kind === 'current') {
        li.querySelector('.rux--progress-text').append(Object.assign(document.createElement('span'), {
          className: 'rux--progress-optional',
          textContent: `Step ${phase.steps.indexOf(currentStep) + 1} of ${phase.steps.length}`,
        }));
      }
      return li;
    }));
  }

  function renderShots(step) {
    $('walk-shots').replaceChildren(...step.shots.map((shot, i) => Object.assign(document.createElement('li'), {
      className: 'rux--list__item',
      textContent: `${shot.what || `Screenshot ${i + 1}`} · ${new Date(shot.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    })));
    $('walk-shots').hidden = !step.shots.length;
  }

  function render() {
    const { phase, step } = state.flat[state.at];
    $('walk-where').textContent = phase.route ? `Phase ${phase.n} · ${phase.route}` : `Phase ${phase.n}`;
    $('walk-step-h').textContent = `Step ${step.step}`;
    $('walk-do').textContent = step.do;
    $('walk-see').textContent = step.see || '—';
    $('walk-actual').value = step.actual;
    $('walk-notes').value = step.notes;
    $('walk-what').value = '';
    renderShots(step);
    $('walk-back').disabled = state.at === 0;
    $('walk-next').textContent = state.at === state.flat.length - 1 ? 'Finish' : 'Next';
    state.dirty = false;
    status('');
    renderProgress();
  }

  async function save() {
    if (!state.dirty) return;
    const { step } = state.flat[state.at];
    step.actual = $('walk-actual').value;
    step.notes = $('walk-notes').value;
    must(await state.db.from('notes_walk_steps').upsert({
      walk_id: state.walk.id, step: step.step, actual: step.actual, notes: step.notes,
    }));
    state.dirty = false;
    status('Saved');
  }

  async function go(delta) {
    try { await save(); clear(); } catch (e) { show(`Not saved: ${e.message}`); return; }
    if (state.at + delta >= state.flat.length) {
      renderProgress();
      status('Every step is filled in. Pull the walk into atlas and bring it to a session today.');
      return;
    }
    state.at = Math.max(0, state.at + delta);
    render();
    $('walk-step-h').focus();
  }

  async function attach(file) {
    if (!state.walk) return;
    if (!file || !/^image\/(png|jpeg)$/.test(file.type)) { show('A screenshot is a PNG or JPEG image.'); return; }
    const { step } = state.flat[state.at];
    const path = `${state.walk.id}/${step.step}_${Date.now()}.${file.type === 'image/png' ? 'png' : 'jpg'}`;
    status('Saving the screenshot');
    try {
      await save();
      must(await state.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }));
      const inserted = await state.db.from('notes_walk_shots')
        .insert({ walk_id: state.walk.id, step: step.step, what: $('walk-what').value.trim(), path })
        .select('step, what, path, created_at').single();
      if (inserted.error) {
        await state.storage.from(BUCKET).remove([path]);
        throw new Error(inserted.error.message);
      }
      step.shots.push(inserted.data);
      renderShots(step);
      $('walk-what').value = '';
      status('Screenshot saved');
      clear();
    } catch (e) {
      show(`Screenshot not saved: ${e.message}`);
      status('');
    }
  }

  // ---- wiring --------------------------------------------------------------
  $('walk-start-form').addEventListener('submit', async event => {
    event.preventDefault();
    const walkthrough = $('walk-walkthrough').value;
    const company = $('walk-company').value.trim();
    const user = $('walk-user').value.trim();
    if (!/^[A-Za-z0-9]{1,10}$/.test(company)) { show('The company is letters and digits, as the LN status bar shows it.'); return; }
    if (!/^[A-Za-z0-9._-]{1,32}$/.test(user)) { show('The user is letters, digits, dots, dashes or underscores, as the LN status bar shows it.'); return; }
    try { localStorage.setItem(REMEMBER, JSON.stringify({ company, user })); } catch { /* not remembered */ }
    const started = stamp(new Date());
    const walk = {
      id: `WK_${walkthrough}_${started.slice(0, 10)}_${started.slice(11, 19).replaceAll(':', '')}`,
      walkthrough, atlas_commit: commit, started, company, ln_user: user,
    };
    try { must(await state.db.from('notes_walks').insert(walk)); await open(walk); }
    catch (e) { show(`The walk did not start: ${e.message}`); }
  });
  $('walk-resume-form').addEventListener('submit', async event => {
    event.preventDefault();
    const walk = state.today.find(w => w.id === $('walk-resume').value);
    try { if (walk) await open(walk); } catch (e) { show(`The walk did not open: ${e.message}`); }
  });
  for (const id of ['walk-actual', 'walk-notes']) {
    $(id).addEventListener('input', () => { state.dirty = true; status(''); });
    $(id).addEventListener('blur', () => save().catch(e => show(`Not saved: ${e.message}`)));
  }
  $('walk-back').addEventListener('click', () => go(-1));
  $('walk-next').addEventListener('click', () => go(1));
  $('walk-exit').addEventListener('click', async () => {
    try { await save(); location.reload(); } catch (e) { show(`Not saved: ${e.message}`); }
  });
  $('walk-drop').addEventListener('click', () => $('walk-file').click());
  $('walk-file').addEventListener('change', () => { attach($('walk-file').files[0]); $('walk-file').value = ''; });
  $('walk-drop').addEventListener('dragover', event => event.preventDefault());
  $('walk-drop').addEventListener('drop', event => { event.preventDefault(); attach(event.dataTransfer.files[0]); });
  document.addEventListener('paste', event => {
    const item = [...(event.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
    if (item && state.walk && !$('walk-run').hidden) { event.preventDefault(); attach(item.getAsFile()); }
  });
  $('walk-message-close').addEventListener('click', clear);

  // After every script on the page has run: this file loads before account.js,
  // which is what defines Rux.account.
  const whenReady = run => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', run, { once: true }) : run());
  whenReady(async () => {
    const account = window.Rux?.account;
    if (!account) { gate('This preview has no log-in. Add ?cloud to the address to walk with your account.'); return; }
    let session = null;
    try { session = await account.getSession(); } catch { /* answered below */ }
    if (!session?.user || session.user.is_anonymous || !window.Rux?.access?.accessOf(session.user).owner) {
      gate('Walking is for the owner account.');
      return;
    }
    if (!commit) { gate('This build of Notes names no atlas commit, so a walk here could not be pinned.'); return; }
    state.db = account.client.schema('platform');
    state.storage = account.client.storage;
    gate('');
    try { await loadStart(); } catch (e) { show(`Your walks could not be read: ${e.message}`); }
  });
})();
