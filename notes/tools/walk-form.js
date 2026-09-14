// The walk form: one run of a walkthrough, step by step. Every answer and
// screenshot is saved into atlas on this Mac through notes/tools/serve-walk.mjs,
// so the page works only on the private preview and holds no data of its own.
(() => {
  const API = `${location.protocol}//${location.hostname}:8645/api`;
  const $ = id => document.getElementById(id);
  const state = { walk: null, flat: [], at: 0, dirty: false };
  const REMEMBER = 'notes-walk-environment';

  // A step cell is atlas Markdown; the form shows its words.
  const plain = text => (text ?? '').replace(/\\\|/g, '|')
    .replace(/\*\*\[([^\]|]+)(?:\|[^\]]*)?\]\*\*/g, '[$1]')
    .replace(/\*\*\{([^}]+)\}\*\*/g, '{$1}')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(^|[\s(·])_([^_]+)_(?=[\s.,;:)·]|$)/g, '$1$2');

  async function api(path, options = {}) {
    const res = await fetch(`${API}${path}`, { ...options, headers: options.body ? { 'Content-Type': 'application/json' } : {} });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `status ${res.status}`);
    return data;
  }

  const show = message => { $('walk-message-text').textContent = message; $('walk-message').hidden = false; };
  const clear = () => { $('walk-message').hidden = true; };
  const status = text => { $('walk-status').textContent = text; };
  const option = (value, label) => Object.assign(document.createElement('option'), { className: 'rux--select-option', value, textContent: label });

  async function loadStart() {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER) ?? '{}');
      $('walk-company').value = saved.company ?? '';
      $('walk-user').value = saved.user ?? '';
    } catch { /* nothing remembered */ }
    try {
      const [list, walks] = await Promise.all([api('/walkthroughs'), api('/walks')]);
      $('walk-guide').replaceChildren(...list.map(w => option(w.id, w.title)));
      const open = walks.filter(w => !w.committed);
      $('walk-resume').replaceChildren(...open.map(w => option(w.id, `${w.guide} · ${w.date} · ${w.id.slice(-6, -4)}:${w.id.slice(-4, -2)}`)));
      $('walk-resume-section').hidden = !open.length;
    } catch (e) {
      show(`The save service is not answering. Start the private preview with npm run serve -- --private. (${e.message})`);
    }
  }

  async function open(id) {
    const walk = await api(`/walks/${id}`);
    if (walk.committed) throw new Error('this walk is committed, and a committed walk is never edited');
    state.walk = walk;
    state.flat = walk.phases.flatMap(phase => phase.steps.map(step => ({ phase, step })));
    if (!state.flat.length) throw new Error('this walk has no steps to fill in');
    const first = state.flat.findIndex(x => !x.step.actual);
    state.at = first < 0 ? 0 : first;
    $('walk-title').textContent = `Walk · ${walk.guide} · ${walk.date}`;
    $('walk-start').hidden = true;
    $('walk-run').hidden = false;
    clear();
    render();
  }

  function renderProgress() {
    const { phase: current, step: currentStep } = state.flat[state.at];
    const icons = { current: 'i-incomplete', complete: 'i-checkmark--outline', incomplete: 'i-circle-dash' };
    const words = { current: 'Current', complete: 'Complete', incomplete: 'Not started' };
    const classes = { current: 'rux--progress-step rux--progress-step--current',
      complete: 'rux--progress-step rux--progress-step--complete', incomplete: 'rux--progress-step rux--progress-step--incomplete' };
    $('walk-progress').replaceChildren(...state.walk.phases.map(phase => {
      const done = phase.steps.length && phase.steps.every(s => s.actual);
      const kind = phase === current ? 'current' : done ? 'complete' : 'incomplete';
      const li = document.createElement('li');
      li.className = classes[kind];
      li.innerHTML = `<button type="button" class="rux--progress-step-button rux--progress-step-button--unclickable"><svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><use href="#${icons[kind]}"/></svg><div class="rux--progress-text"><span class="rux--progress-label"></span></div><span class="rux--assistive-text"></span><span class="rux--progress-line"></span></button>`;
      li.querySelector('.rux--progress-label').textContent = `Phase ${phase.n}${phase.title ? ` · ${phase.title}` : ''}`;
      li.querySelector('.rux--assistive-text').textContent = words[kind];
      if (kind === 'current') {
        const of = Object.assign(document.createElement('span'), { className: 'rux--progress-optional',
          textContent: `Step ${phase.steps.indexOf(currentStep) + 1} of ${phase.steps.length}` });
        li.querySelector('.rux--progress-text').append(of);
      }
      return li;
    }));
  }

  function renderShots(step) {
    const names = [...(step.evidence ?? '').matchAll(/`([^`]+)`/g)].map(m => m[1]);
    $('walk-shots').replaceChildren(...names.map(name => Object.assign(document.createElement('li'), { className: 'rux--list__item', textContent: name })));
    $('walk-shots').hidden = !names.length;
  }

  function render() {
    const { phase, step } = state.flat[state.at];
    $('walk-where').textContent = phase.route ? `Phase ${phase.n} · ${plain(phase.route)}` : `Phase ${phase.n}`;
    $('walk-step-h').textContent = `Step ${step.step}`;
    $('walk-do').textContent = plain(step.do);
    $('walk-see').textContent = plain(step.see) || '—';
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
    await api(`/walks/${state.walk.id}/steps/${step.step}`, { method: 'PUT', body: JSON.stringify({ actual: step.actual, notes: step.notes }) });
    state.dirty = false;
    status('Saved');
  }

  async function go(delta) {
    try { await save(); clear(); } catch (e) { show(`Not saved: ${e.message}`); return; }
    if (state.at + delta >= state.flat.length) {
      renderProgress();
      status('Every step is filled in. Bring the walk and its screenshots to a session today.');
      return;
    }
    state.at = Math.max(0, state.at + delta);
    render();
    $('walk-step-h').focus();
  }

  async function attach(file) {
    if (!state.walk) return;
    if (!file || !/^image\/(png|jpeg)$/.test(file.type)) { show('A screenshot is a PNG or JPEG image.'); return; }
    const dataUrl = await new Promise((ok, fail) => {
      const reader = new FileReader();
      reader.onload = () => ok(reader.result);
      reader.onerror = fail;
      reader.readAsDataURL(file);
    });
    const { step } = state.flat[state.at];
    status('Saving the screenshot');
    try {
      await save();
      const out = await api(`/walks/${state.walk.id}/steps/${step.step}/screenshots`, { method: 'POST', body: JSON.stringify({ what: $('walk-what').value, dataUrl }) });
      step.evidence = out.evidence;
      renderShots(step);
      $('walk-what').value = '';
      status(`Saved ${out.name}`);
      clear();
    } catch (e) {
      show(`Screenshot not saved: ${e.message}`);
      status('');
    }
  }

  $('walk-start-form').addEventListener('submit', async event => {
    event.preventDefault();
    const body = { guide: $('walk-guide').value, company: $('walk-company').value.trim(), user: $('walk-user').value.trim() };
    try { localStorage.setItem(REMEMBER, JSON.stringify({ company: body.company, user: body.user })); } catch { /* not remembered */ }
    try { const { id } = await api('/walks', { method: 'POST', body: JSON.stringify(body) }); await open(id); }
    catch (e) { show(`The walk did not start: ${e.message}`); }
  });
  $('walk-resume-form').addEventListener('submit', async event => {
    event.preventDefault();
    try { await open($('walk-resume').value); } catch (e) { show(`The walk did not open: ${e.message}`); }
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

  loadStart();
})();
