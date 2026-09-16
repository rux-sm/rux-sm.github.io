/* ==========================================================================
   share/document.js — A TRIP DOCUMENT LINK
   --------------------------------------------------------------------------
   document.html?id=<document id> opens one trip document without a log-in.
   get_trip_document() returns the file's path for that id, and the page moves
   on to the file in the public trip-documents bucket, so the id is the link's
   only secret, as on rux-ui's doc.html. A local preview other than the cloud
   preview has no client, and says so.
   ========================================================================== */
(() => {
  'use strict';

  const BUCKET = 'trip-documents';
  const titleEl = document.getElementById('scheduler-share-title');
  const textEl = document.getElementById('scheduler-share-text');
  // What happened, then what to do, as Design's error state words it.
  const say = (title, text) => {
    titleEl.textContent = title;
    textEl.textContent = text;
    textEl.hidden = false;
  };

  const id = (new URLSearchParams(location.search).get('id') ?? '').trim();
  const client = window.Rux?.account?.client;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    say('This link has no document in it', 'Ask dispatch to send the link again.');
    return;
  }
  if (!client) {
    say('This preview has no connection', 'Open http://localhost:8641/, the cloud preview, to open the document.');
    return;
  }

  (async () => {
    let result;
    try { result = await client.rpc('get_trip_document', { p_id: id }); } catch (error) { result = { error }; }
    if (result.error) {
      say("The document can't be opened right now", 'Check your connection, then reload the page.');
      return;
    }
    const path = result.data?.file_path;
    const url = path && client.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
    if (!url) {
      say('This document is no longer available', 'Ask dispatch for a new link.');
      return;
    }
    location.replace(url);
  })();
})();
