/* ==========================================================================
   Notes — THE QUESTS PAGE
   --------------------------------------------------------------------------
   For the owner, signed in: every row of platform.notes_quests, which atlas's
   tools/pull.py replaces on every run, listed in the order the path shows its
   tiles, each linking to its tile. The order and the tile names are the data
   build.mjs wrote into the page.

   The private preview's page is already filled from atlas's data, and has no
   log-in, so nothing here runs there.
   ========================================================================== */
(() => {
  'use strict';
  const body = document.querySelector('[data-notes-quests-rows]');
  const summary = document.querySelector('[data-notes-quests-summary]');
  const source = document.getElementById('notes-quest-tiles');
  if (!body || !source) return;
  const tiles = JSON.parse(source.textContent || '[]');
  const place = new Map(tiles.map((t, i) => [t.id, i]));
  const label = new Map(tiles.map(t => [t.id, t.label]));
  const kind = k => (k ? k[0].toUpperCase() + k.slice(1) : 'Untagged');

  function show(rows) {
    const known = rows.filter(r => place.has(r.tile))
      .sort((a, b) => place.get(a.tile) - place.get(b.tile) || a.issue.localeCompare(b.issue));
    body.replaceChildren(...known.map(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><a class="rux--link"></a></td><td><span class="rux--type-code-01"></span></td><td></td><td></td>';
      const link = tr.querySelector('a');
      link.href = `../#tile-${encodeURIComponent(r.tile)}`;
      link.textContent = label.get(r.tile);
      tr.querySelector('.rux--type-code-01').textContent = r.issue;
      tr.children[2].textContent = r.text;
      tr.children[3].textContent = kind(r.kind);
      return tr;
    }));
    const count = new Set(known.map(r => r.tile)).size;
    summary.textContent = known.length
      ? `${known.length} quests on ${count} tiles, in the order the path shows them.`
      : 'No open quests.';
  }

  // After every script on the page has run: this file loads before account.js.
  const whenReady = run => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', run, { once: true }) : run());
  whenReady(async () => {
    const account = window.Rux?.account;
    if (!account) return;
    let session = null;
    try { session = await account.getSession(); } catch { return; }
    if (!session?.user || session.user.is_anonymous || !window.Rux?.access?.accessOf(session.user).owner) {
      summary.textContent = 'Quests are for the owner account.';
      return;
    }
    const { data, error } = await account.client.schema('platform').from('notes_quests')
      .select('tile, issue, text, kind');
    if (error) { summary.textContent = `The quests could not be read: ${error.message}`; return; }
    show(data);
  });
})();
