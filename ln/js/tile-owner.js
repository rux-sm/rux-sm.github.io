/* ==========================================================================
   Notes — THE OWNER'S PATH
   --------------------------------------------------------------------------
   For the owner, signed in, on the path. Three things the live data cannot
   carry and the account can:

   - QUESTS. The export tier has no gaps, so each tile's quests are read from
     platform.notes_quests, which atlas's tools/pull.py replaces on every run,
     and put in the slots build.mjs left on each tile.
   - THE NOTEPAD, kept per tile in platform.notes_tile_notes, so every device
     sees the same note. js/path.js keeps it in the browser for anyone else.
   - FILES AND SEND FOR REVIEW. A screenshot or document goes to the private
     notes-tile-files bucket with a row in platform.notes_tile_files. Send for
     review marks the tile's note and its unsent files, and the next pull
     brings them into atlas's inbox. Nothing reaches atlas before that.

   A PAGE WITHOUT A LOG-IN IS UNCHANGED, as every data-notes-owner element
   stays hidden until js/online.js finds the owner.
   ========================================================================== */
(() => {
  'use strict';
  if (!document.querySelector('[data-notes-path-tile]')) return;
  const BUCKET = 'notes-tile-files';
  const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf',
    '.txt': 'text/plain', '.md': 'text/markdown',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
  const $ = sel => document.querySelector(sel);
  const note = $('[data-notes-path-note]');
  const help = $('[data-notes-path-note-help]');
  const list = $('[data-notes-path-files]');
  const picker = $('[data-notes-path-file]');
  const send = $('[data-notes-path-send]');
  const adds = [...document.querySelectorAll('[data-notes-path-add]')];
  const say = text => { const s = $('[data-notes-path-tools-status]'); if (s) s.textContent = text; };
  const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
  const when = iso => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  let db = null;
  let storage = null;
  let me = null;
  let tile = null;
  let timer = null;
  const notes = new Map();

  // ---- quests --------------------------------------------------------------
  function showQuests(rows) {
    const by = new Map();
    for (const r of rows) {
      if (!by.has(r.tile)) by.set(r.tile, []);
      by.get(r.tile).push(r);
    }
    for (const t of document.querySelectorAll('[data-notes-path-tile]')) {
      const mine = by.get(t.dataset.notesPathTile) ?? [];
      const box = t.querySelector('[data-notes-path-quests]');
      const badge = t.querySelector('[data-notes-path-questcount]');
      if (!box || !badge) continue;
      box.querySelector('ul').replaceChildren(...mine.map(q => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="rux--tag rux--tag--gray rux--layout--size-sm"><span class="rux--tag__label"></span></span> <span class="rux--type-code-01"></span> <span></span>';
        li.querySelector('.rux--tag__label').textContent = q.kind ? q.kind[0].toUpperCase() + q.kind.slice(1) : 'Untagged';
        li.querySelector('.rux--type-code-01').textContent = q.issue;
        li.lastElementChild.textContent = q.text;
        return li;
      }));
      box.hidden = !mine.length;
      badge.hidden = !mine.length;
      badge.querySelector('.rux--tag__label').textContent = `${mine.length} quest${mine.length === 1 ? '' : 's'}`;
    }
  }

  // ---- the notepad ---------------------------------------------------------
  async function saveNote(id, body) {
    must(await db.from('notes_tile_notes').upsert({ user_id: me, tile: id, body, updated_at: new Date().toISOString() }));
    notes.set(id, { ...(notes.get(id) ?? {}), body });
  }

  function describeNote(id) {
    const n = notes.get(id);
    if (!n?.sent_at) return 'Saved to your account.';
    return `Saved to your account. Sent for review ${when(n.sent_at)}${n.pulled_at && n.pulled_at >= n.sent_at ? ', and atlas has it' : ''}.`;
  }

  // ---- files ---------------------------------------------------------------
  async function showFiles(id) {
    const rows = must(await db.from('notes_tile_files').select('id, kind, name, created_at, sent_at, pulled_at')
      .eq('tile', id).order('created_at'));
    list.replaceChildren(...rows.map(f => {
      const li = document.createElement('li');
      li.textContent = `${f.kind === 'screenshot' ? 'Screenshot' : 'Document'} · ${f.name} · ${
        f.pulled_at ? 'in atlas' : f.sent_at ? 'sent' : 'not sent'}`;
      return li;
    }));
    if (!rows.length) list.replaceChildren(Object.assign(document.createElement('li'), { textContent: 'No files yet.' }));
  }

  async function upload(file, kind) {
    if (!tile || !file) return;
    const ext = (file.name.match(/\.[A-Za-z0-9]{1,5}$/) ?? [''])[0].toLowerCase();
    const path = `${tile}/${Date.now()}${ext}`;
    say(`Saving ${file.name}`);
    try {
      // A browser may not name a Markdown file's type; the bucket accepts only the types it lists.
      const type = file.type || TYPES[ext] || 'application/octet-stream';
      must(await storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false }));
      const inserted = await db.from('notes_tile_files').insert({ tile, kind, name: file.name.slice(0, 200), path });
      if (inserted.error) {
        await storage.from(BUCKET).remove([path]);
        throw new Error(inserted.error.message);
      }
      say(`${file.name} saved. Send for review when it is ready for atlas.`);
      await showFiles(tile);
    } catch (e) { say(`${file.name} not saved: ${e.message}`); }
  }

  let adding = 'screenshot';
  for (const b of adds) {
    b.addEventListener('click', () => {
      adding = b.dataset.notesPathAdd;
      picker.accept = adding === 'screenshot' ? 'image/png,image/jpeg'
        : '.pdf,.txt,.md,.docx,.xlsx,application/pdf,text/plain,text/markdown';
      picker.click();
    });
  }
  picker?.addEventListener('change', () => { upload(picker.files[0], adding); picker.value = ''; });

  // A screenshot pasted into the notepad is added to the open tile.
  note?.addEventListener('paste', event => {
    if (!db) return;
    const item = [...(event.clipboardData?.items ?? [])].find(i => i.type.startsWith('image/'));
    if (item) {
      event.preventDefault();
      const image = item.getAsFile();
      upload(new File([image], `pasted-${Date.now()}.${image.type === 'image/png' ? 'png' : 'jpg'}`, { type: image.type }), 'screenshot');
    }
  });

  send?.addEventListener('click', async () => {
    if (!tile) return;
    clearTimeout(timer);
    const now = new Date().toISOString();
    try {
      await saveNote(tile, note.value);
      must(await db.from('notes_tile_notes').update({ sent_at: now }).eq('tile', tile));
      must(await db.from('notes_tile_files').update({ sent_at: now }).eq('tile', tile).is('sent_at', null));
      notes.set(tile, { ...notes.get(tile), sent_at: now });
      help.textContent = describeNote(tile);
      say('Sent for review. The next pull brings it into atlas.');
      await showFiles(tile);
    } catch (e) { say(`Not sent: ${e.message}`); }
  });

  // ---- following the open tile --------------------------------------------
  async function follow(id) {
    clearTimeout(timer);
    tile = id;
    for (const b of [...adds, send]) if (b) b.disabled = !id;
    say('');
    if (!id) { list.replaceChildren(); help.textContent = 'Saved to your account.'; return; }
    note.value = notes.get(id)?.body ?? '';
    help.textContent = describeNote(id);
    try { await showFiles(id); } catch (e) { say(`Files could not be read: ${e.message}`); }
  }

  const whenReady = run => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', run, { once: true }) : run());
  whenReady(async () => {
    const account = window.Rux?.account;
    if (!account) return;
    let session = null;
    try { session = await account.getSession(); } catch { return; }
    if (!session?.user || session.user.is_anonymous || !window.Rux?.access?.accessOf(session.user).owner) return;
    db = account.client.schema('platform');
    storage = account.client.storage;
    me = session.user.id;

    try { showQuests(must(await db.from('notes_quests').select('tile, issue, text, kind').order('issue'))); }
    catch { /* the path still works without its quests */ }

    try {
      for (const r of must(await db.from('notes_tile_notes').select('tile, body, sent_at, pulled_at'))) notes.set(r.tile, r);
    } catch { return; }

    // From here the notepad is the account's.
    note.dataset.notesAccount = 'true';
    note.addEventListener('input', () => {
      if (!tile) return;
      const id = tile;
      const body = note.value;
      clearTimeout(timer);
      help.textContent = 'Saving…';
      timer = setTimeout(async () => {
        try { await saveNote(id, body); if (tile === id) help.textContent = describeNote(id); }
        catch (e) { if (tile === id) help.textContent = `Not saved: ${e.message}`; }
      }, 800);
    });
    document.addEventListener('notes-path:open', event => follow(event.detail.tile));
    document.dispatchEvent(new Event('notes-path:refresh'));
  });
})();
