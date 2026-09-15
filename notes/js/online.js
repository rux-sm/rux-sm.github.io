/* ==========================================================================
   Notes — THE OWNER'S TOOLS
   --------------------------------------------------------------------------
   Loaded on every Notes page after the site's account.js. For the account
   with the owner switch it shows what build.mjs wrote hidden: the review box
   at the foot of a page, the walk links, and on an experiment it keeps the
   worksheet in the owner's account as well as in this browser.

   EVERYTHING GOES THROUGH THE SITE'S OWN LOG-IN. The client is the one
   account.js made, the tables are platform.notes_* and their rules admit the
   owner alone, so this file decides only what to show; the database decides
   what anyone can read or write.

   A PAGE WITHOUT A LOG-IN IS UNCHANGED. On a local preview account.js stops
   before it defines Rux.account, and for any account that is not the owner
   nothing here runs past the check.
   ========================================================================== */
(() => {
  'use strict';
  const main = document.getElementById('main-content');
  const account = window.Rux?.account;
  if (!main || !account) return;
  const pageId = main.dataset.notesPage;
  const commit = main.dataset.notesCommit;

  const isOwner = session => Boolean(session?.user && !session.user.is_anonymous
    && window.Rux?.access?.accessOf(session.user).owner);
  const localDate = iso => new Date(iso).toLocaleDateString('en-CA');

  // ---- the review box ----------------------------------------------------
  // A review never edits the page: it is recorded, pulled into atlas, and a
  // session applies it. So the box says what was last sent and whether atlas
  // has it yet, and nothing about the page's own status changes here.
  function review(db) {
    const form = document.getElementById('notes-review-form');
    const last = document.querySelector('[data-notes-review-last]');
    const feedback = document.getElementById('notes-review-feedback');
    const send = document.getElementById('notes-review-send');
    const status = document.getElementById('notes-review-status');
    if (!form || !feedback || !send) return;

    const decision = () => form.querySelector('input[name="notes-review-decision"]:checked')?.value ?? '';
    const describe = r => [
      r.decision === 'approve' ? 'Approved' : 'Changes requested',
      `on ${localDate(r.created_at)}`,
      commit && !commit.startsWith(r.atlas_commit) ? '· an earlier build of this page' : '',
      r.pulled_at ? '· in atlas' : '· not yet pulled into atlas',
    ].filter(Boolean).join(' ');

    const loadLast = async () => {
      const { data, error } = await db.from('notes_reviews')
        .select('decision, created_at, atlas_commit, pulled_at')
        .eq('document', pageId).order('created_at', { ascending: false }).limit(1);
      if (last) last.textContent = error ? `The last review could not be read: ${error.message}`
        : data.length ? `Last review: ${describe(data[0])}` : 'Not reviewed yet.';
    };

    const sync = () => {
      const changes = decision() === 'changes';
      feedback.required = changes;
      send.disabled = !decision() || (changes && !feedback.value.trim());
    };
    form.addEventListener('change', sync);
    feedback.addEventListener('input', sync);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (send.disabled) return;
      send.disabled = true;
      status.textContent = 'Sending';
      const { error } = await db.from('notes_reviews').insert({
        document: pageId, atlas_commit: commit, decision: decision(), feedback: feedback.value.trim(),
      });
      if (error) {
        status.textContent = `Not sent: ${error.message}`;
        sync();
        return;
      }
      form.reset();
      sync();
      status.textContent = 'Sent. A session applies it after the next pull.';
      loadLast();
    });
    sync();
    loadLast();
  }

  // ---- the worksheet in the account ----------------------------------------
  // experiment.js keeps the answers in this browser and stamps each save with
  // its time. The newer of the two copies wins when the page opens, and every
  // later save is sent on, so a phone and a Mac show the same worksheet.
  function answers(db, session) {
    const sheet = window.Notes?.worksheet;
    if (!sheet) return;
    const note = document.querySelector('[data-notes-sync]');
    const say = text => { if (note) note.textContent = text; };
    let timer = null;

    const push = async () => {
      const { error } = await db.from('notes_answers').upsert({
        user_id: session.user.id, experiment: pageId, answers: sheet.state(), markdown: sheet.markdown(),
      });
      say(error ? `Not saved to your account: ${error.message}. Still saved in this browser.`
        : 'Saved to your account and in this browser.');
    };

    (async () => {
      const { data, error } = await db.from('notes_answers').select('answers')
        .eq('experiment', pageId).maybeSingle();
      if (error) {
        say(`Your account could not be read, so answers stay in this browser: ${error.message}`);
        return;
      }
      const local = sheet.state();
      const remote = data?.answers;
      if (remote?.v === 1 && (remote.t ?? 0) > (local.t ?? 0)) {
        sheet.replace(remote);
        say('Saved to your account and in this browser.');
      } else if ((local.t ?? 0) > (remote?.t ?? 0)) {
        await push();
      } else {
        say('Saved to your account and in this browser.');
      }
      sheet.onSave(() => { clearTimeout(timer); timer = setTimeout(push, 1500); });
    })();
  }

  (async () => {
    let session = null;
    try { session = await account.getSession(); } catch { return; }
    if (!isOwner(session)) return;
    for (const el of document.querySelectorAll('[data-notes-owner]')) el.hidden = false;
    const db = account.client.schema('platform');
    if (pageId && commit) review(db);
    if (pageId) answers(db, session);
  })();
})();
