/* ==========================================================================
   room.js — the Library as a room, on room.html
   --------------------------------------------------------------------------
   Rux's Collection is a row of consoles, one for each system with games,
   each its drawing from brand/consoles.svg over its name and count. Pressing
   a console picks it, and its name and count show beneath the row.
   docs/plans/emu-room.md is what the room is still to hold.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  // The console whose games show.
  let pick = null;

  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  const gamesOf = system => games.filter(g => g.system === system);

  // A console's drawing: its symbol in the sprite, which app.css colours.
  const SVG = 'http://www.w3.org/2000/svg';
  function consoleOf(system) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'emu-console');
    svg.setAttribute('viewBox', '0 0 96 64');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG, 'use');
    use.setAttribute('href', `brand/consoles.svg#${system}`);
    svg.append(use);
    return svg;
  }

  // The picked console is pressed, and named beneath the row with its count.
  function showPick() {
    for (const b of $('emu-cabinet').children) b.setAttribute('aria-pressed', String(b.dataset.system === pick));
    $('emu-picked').textContent = pick ? R.systemName(pick) : '';
    $('emu-picked-sub').textContent = pick ? countOf(gamesOf(pick).length) : '';
  }

  function render() {
    const systems = Object.keys(R.SYSTEMS).filter(s => gamesOf(s).length);
    if (!systems.includes(pick)) pick = systems[0] ?? null;
    $('emu-cabinet').replaceChildren(...systems.map(system => {
      const b = el('button', 'emu-cabinet__console');
      b.type = 'button';
      b.dataset.system = system;
      b.append(consoleOf(system), el('span', 'emu-cabinet__name', R.systemName(system)),
        el('span', 'emu-cabinet__count', countOf(gamesOf(system).length)));
      b.addEventListener('click', () => { pick = system; showPick(); });
      return b;
    }));
    showPick();
  }

  async function load() {
    try {
      games = await R.data.games();
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    $('emu-empty').hidden = games.length > 0;
    $('emu-collection').hidden = games.length === 0;
    render();
  }
  load();
})();
