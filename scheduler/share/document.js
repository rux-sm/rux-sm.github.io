/* ==========================================================================
   share/document.js — A TRIP DOCUMENT LINK
   --------------------------------------------------------------------------
   document.html?id=<document id> opens one trip document without a log-in.
   The trip-document-link Edge Function returns a link to the file signed for
   ten minutes, since the bucket is closed, and the page moves on to it; the id
   is the link's only secret, as on rux-ui's doc.html. A local preview other
   than the cloud preview has no client, and says so.
   ========================================================================== */
(() => {
  'use strict';

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
    try { result = await client.functions.invoke('trip-document-link', { body: { id } }); } catch (error) { result = { error }; }
    // 404 is an id with no file; anything else is the connection or the service.
    const missing = result.error?.context?.status === 404;
    if (result.error && !missing) {
      say("The document can't be opened right now", 'Check your connection, then reload the page.');
      return;
    }
    const url = result.data?.url;
    if (!url) {
      say('This document is no longer available', 'Ask dispatch for a new link.');
      return;
    }
    location.replace(url);
  })();
})();
