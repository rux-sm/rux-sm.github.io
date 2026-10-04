/* ==========================================================================
   data.js — LN Guide's reads and writes for the owner
   --------------------------------------------------------------------------
   Two things live in the database and not on the page, and both are the
   owner's alone; row security says so, and this file only asks.

   THE PRIVATE SHELF, platform.ln_private: a screen's or an idea's whole text
   as atlas holds it. It rests on Infor's help, so it is never built into this
   public page. Atlas writes it with its own tool, and a card reads one row
   when the owner opens it.

   WHAT WAS CONFIRMED, platform.ln_confirmations: one row each time the owner
   says a step matched LN or was different, with a line and a screenshot in
   the private bucket ln-confirmations where it differed. Atlas brings the
   rows home as evidence; nothing here changes a step.

   The client is the account's, from /account.js. Without a log-in, as in a
   local preview, there is no client and every page works as it is built.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account ?? null;
  const client = account?.client ?? null;
  const fail = (error) => { if (error) throw error; };
  const db = () => client.schema('platform');

  const data = client && {
    // Whether this account is the owner, which is who the database answers.
    async owner() {
      const session = await account.getSession();
      return Boolean(session?.user && !session.user.is_anonymous
        && window.Rux?.access?.accessOf(session.user).owner);
    },

    // One screen's or idea's whole text, or null where the shelf has none.
    async detail(id) {
      const { data: row, error } = await db().from('ln_private').select('body').eq('id', id).maybeSingle();
      fail(error);
      return row?.body ?? null;
    },

    // Every answer this account gave, oldest first, so the last one wins.
    async said() {
      const { data: rows, error } = await db().from('ln_confirmations')
        .select('scenario, step, outcome').order('created_at');
      fail(error);
      return rows;
    },

    // Save one answer. A screenshot goes up first, so a row never names a
    // file that is not there.
    async say({ scenario, step, outcome, note, file, commit }) {
      let path = null;
      if (file) {
        const session = await account.getSession();
        const ext = /png$/i.test(file.type) ? 'png' : 'jpg';
        path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        fail((await client.storage.from('ln-confirmations').upload(path, file, { contentType: file.type })).error);
      }
      fail((await db().from('ln_confirmations').insert({
        scenario, step, outcome, note: note || null, shot_path: path, atlas_commit: commit,
      })).error);
    },
  };

  window.Rux = Object.assign(window.Rux || {}, { ln: data });
})();
