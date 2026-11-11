/* ==========================================================================
   game-panel.js — one game in the side panel
   --------------------------------------------------------------------------
   The game opened from the Library or the Collection, in Carbon's side panel
   that each page carries as #emu-panel: everything the scan read about it,
   its saves, and rux's marks and note, which are saved from here.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag } = R;

  // What the game is, its problems, its saves, rux's notes, then each file.
  // `top` is put first, as the Library puts the game's art and Play there.
  function open(g, { saves = [], onSaved = () => {}, top = [] } = {}) {
    $('emu-panel-label').textContent = R.systemName(g.system);
    $('emu-panel-title').textContent = g.title;
    const body = $('emu-panel-body');
    body.replaceChildren(...top);
    const facts = (pairs) => {
      const dl = el('dl', 'emu-facts');
      for (const [k, v, cls] of pairs) {
        if (v == null || v === '') continue;
        const wrap = el('div');
        wrap.append(el('dt', '', k), el('dd', cls ?? '', String(v)));
        dl.append(wrap);
      }
      return dl;
    };
    const problems = R.problemsOf(g);
    const status = el('div');
    status.append(tag(R.STATUS[g.status]));
    body.append(status);
    if (problems.length) {
      const ul = el('ul', 'rux--list--unordered');
      for (const [, words] of problems) ul.append(el('li', 'rux--list__item', words));
      body.append(ul);
    }
    body.append(facts([
      ['Region', g.region], ['Languages', g.languages], ['Revision', g.revision],
      ['Format', g.formats.join(' + ').toUpperCase()], ['Size', R.size(g.size)],
      ['Title ID', g.title_id], ['Version', g.title_id ? g.version : null],
      ['On the list as', g.match?.names?.join(', ')], ['Found by', g.match?.by?.join(', ')],
    ]));
    const own = saves.filter(s => s.system === g.system && s.game === g.title);
    if (own.length) {
      body.append(el('h3', 'rux--type-heading-02', 'Saves'), facts(own.map(s =>
        [s.kind === 'state' ? 'Save state' : s.kind === 'card' ? 'Memory card' : 'Save', `Last saved ${R.date(s.saved_at)}${s.note ? ` · ${s.note}` : ''}`])));
      const a = el('a', 'rux--link', 'Open in Saves');
      a.href = `saves.html?q=${encodeURIComponent(g.title)}`;
      body.append(a);
    }
    body.append(notesForm(g, onSaved));
    for (const x of g.extras ?? []) {
      body.append(el('h3', 'rux--type-heading-02', x.kind === 'update' ? 'Update' : 'Add-on'),
        facts([['File', x.file?.name], ['Version', x.version], ['Size', x.file ? R.size(x.file.size) : null]]));
    }
    const files = g.files ?? [];
    if (g.folder) {
      body.append(el('h3', 'rux--type-heading-02', 'Folder'), facts([['Files', files.length]]));
    } else {
      for (const f of files) {
        const h = f.header ?? {};
        body.append(el('h3', 'rux--type-heading-02', f.name.split('/').pop()), facts([
          ['Size', R.size(f.size)],
          ['Internal title', h.internalTitle], ['Game code', h.gameCode], ['Product code', h.productCode],
          ['Disc ID', h.discId], ['Disc', h.discNumber], ['Serial', h.serial],
          ['Version byte', h.version ?? h.revision], ['Header', h.header], ['Layout', h.layout],
          ['Boot chip', h.cic && `CIC-${h.cic}`], ['Header checksum', h.headerChecksum],
          ['Tracks', h.tracks], ['CHD', h.chdVersion && `v${h.chdVersion}`],
          ['Encrypted', h.encrypted == null ? null : h.encrypted ? 'Yes' : 'No'],
          ['CRC32', f.crc32, 'emu-hash'], ['MD5', f.md5, 'emu-hash'], ['SHA-1', f.sha1, 'emu-hash'],
        ]));
      }
    }
    $('emu-panel').hidden = false;
    $('emu-panel').classList.add('rux--side-panel--open');
    $('emu-panel-close').focus();
  }
  // rux's marks and note on the game, saved on Save. `plays` is asked only of
  // a converted game whose originals wait in to-delete.
  function notesForm(g, onSaved) {
    const n = g.notes ?? {};
    const form = el('form', 'rux--stack-vertical rux--stack-scale-5');
    form.append(el('h3', 'rux--type-heading-02', 'Your notes'));
    const fieldset = el('fieldset', 'rux--fieldset');
    const legend = el('legend', 'rux--label', 'Marks');
    fieldset.append(legend);
    const marks = [['played', 'Played'], ['finished', 'Finished'], ['favourite', 'Favourite']];
    if (g.originals?.length) marks.push(['plays', 'The new file plays, so its originals can go']);
    for (const [k, label] of marks) {
      const wrap = el('div', 'rux--form-item rux--checkbox-wrapper');
      const box = el('input', 'rux--checkbox');
      box.type = 'checkbox';
      box.id = `emu-note-${k}`;
      box.name = k;
      box.checked = Boolean(n[k]);
      const lab = el('label', 'rux--checkbox-label');
      lab.htmlFor = box.id;
      lab.append(el('div', 'rux--checkbox-label-text', label));
      wrap.append(box, lab);
      fieldset.append(wrap);
    }
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', 'Note');
    lab.htmlFor = 'emu-note-text';
    lw.append(lab);
    const tw = el('div', 'rux--text-area__wrapper');
    const area = el('textarea', 'rux--text-area');
    area.id = 'emu-note-text';
    area.rows = 3;
    area.value = n.note ?? '';
    tw.append(area);
    item.append(lw, tw);
    const actions = el('div', 'emu-actions');
    const button = el('button', 'rux--btn rux--btn--primary', 'Save notes');
    button.type = 'submit';
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    actions.append(button);
    form.append(fieldset, item, actions, said);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      button.disabled = true;
      const row = { system: g.system, title: g.title, note: area.value.trim() || null };
      for (const [k] of [['played'], ['finished'], ['favourite'], ['plays']]) row[k] = Boolean(form.elements[k]?.checked ?? n[k]);
      try {
        await R.data.saveNotes(row);
        g.notes = row;
        g.status = R.statusOf(g);
        said.textContent = 'Saved.';
        onSaved(g);
      } catch (error) {
        console.error(error);
        said.textContent = 'That did not save. Try again.';
      }
      button.disabled = false;
    });
    return form;
  }

  const close = () => {
    $('emu-panel').classList.remove('rux--side-panel--open');
    $('emu-panel').hidden = true;
  };
  $('emu-panel-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('emu-panel').hidden) close(); });

  R.gamePanel = { open, close };
})();
