/* ==========================================================================
   create.js — Create: what a player makes
   --------------------------------------------------------------------------
   MINE is the player's own rifts, a block each, drawn by app.js's
   `riftBlock`: its name, how many puzzles and the sizes, Hidden until it is
   published and New waiting while it holds puzzles saved since, then a menu
   of Rename, Publish or Hide, and Delete; under them its pictures, each
   opening it in the Pixelator, and an add tile that opens the Pixelator for
   that rift. Under a block is everyone who has found a sprite in it.

   NEW PUZZLE opens a blank Pixelator, whose Save asks for the rift. A new
   puzzle costs one mana, taken as it is saved, which the heading says; at
   no mana New puzzle and the add tiles are off, and a line says how mana is
   earned. A new puzzle in a rift already published waits, off, until the
   rift is published again, which switches all its puzzles on.

   THE OWNER has the same, for rifts of their own that cost no mana, drawn
   at make.html?own, and a switch at the top, Mine and Game: Game is the
   base game every player is sent, which game.js draws. The view is
   `?view=game` in the address and is kept in this browser, Mine on a first
   visit.

   A guest with no player yet gets the door first; data.js's `enter` draws
   it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, enter, words, riftBlock, menu, portrait, side, time, switcher } = window.Pixels;
  const $ = id => document.getElementById(id);
  const { modal } = window.Rux;
  const VIEW = 'pixels-create-view';
  const host = $('pixels-mine');

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };
  const fine = () => { $('pixels-error').hidden = true; };
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  // The Pixelator for a rift of one's own: the owner's are `?own`.
  const make = rest => `make.html?${[owner ? 'own' : '', rest].filter(Boolean).join('&')}`;

  /* THE VIEW. The switch shows the one chosen, the address says it, and the
     browser keeps it for next time. */
  const pick = $('pixels-view');
  const remembered = () => { try { return localStorage.getItem(VIEW); } catch { return null; } };
  let view = owner ? (new URLSearchParams(location.search).get('view') === 'game' || (!location.search.includes('view=') && remembered() === 'game') ? 'game' : 'mine') : 'mine';
  const show = to => {
    view = to;
    try { localStorage.setItem(VIEW, to); } catch { /* the switch starts on Mine */ }
    const at = new URL(location.href);
    if (to === 'game') at.searchParams.set('view', 'game'); else { at.searchParams.delete('view'); at.searchParams.delete('rift'); }
    history.replaceState(null, '', at);
    pick.querySelectorAll('[data-view]').forEach(b => {
      const on = b.dataset.view === to;
      b.classList.toggle('rux--content-switcher--selected', on);
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    host.hidden = to !== 'mine';
    $('pixels-desk').hidden = to !== 'game';
    $('pixels-mana').hidden = true;
    $('pixels-new-note').hidden = true;
    const add = $('pixels-new');
    add.hidden = false;
    if (to === 'game') {
      add.href = 'make.html';
      add.removeAttribute('aria-disabled');
      window.Pixels.game?.();
    } else mine();
  };

  /* A RIFT OF ONE'S OWN, by its menu: its name, publishing it, and deleting
     it with its puzzles, which gives their mana back. `asked` is the rift a
     window is open for. */
  let asked = null;
  const rename = (g, from) => {
    asked = g;
    $('pixels-mine-rename-name').value = g.theme || '';
    modal.open('pixels-mine-rename-modal', from);
  };
  $('pixels-mine-rename').addEventListener('submit', async e => {
    e.preventDefault();
    const g = asked, name = $('pixels-mine-rename-name').value.trim();
    modal.close('pixels-mine-rename-modal');
    try { await data.own.setTheme(g.width, g.level, name); fine(); } catch { say('The rift was not renamed', 'Try again.'); }
    mine();
  });
  const publish = async (g, on) => {
    try {
      const now = await data.own.publish(g.width, g.level, on);
      if (now?.error) say('A rift is published with 3 puzzles or more', 'Make another, then publish it.');
      else fine();
    } catch { say('The rift did not change', 'Try again.'); }
    mine();
  };
  const remove = (g, from) => {
    asked = g;
    const n = g.puzzles.length;
    $('pixels-mine-remove-heading').textContent = `Delete ${g.theme || 'this rift'}?`;
    $('pixels-mine-remove-text').textContent = `Its ${n === 1 ? 'puzzle goes' : `${n} puzzles go`} too${owner ? '' : `, and ${n === 1 ? 'its mana comes' : 'their mana comes'} back`}.`;
    modal.open('pixels-mine-remove-modal', from);
  };
  $('pixels-mine-remove-confirm').addEventListener('click', async () => {
    try { await data.own.removeLevel(asked.width, asked.level); fine(); } catch { say('The rift was not deleted', 'Try again.'); }
    mine();
  });

  /* MINE, drawn again after each change. */
  async function mine() {
    let got;
    try { got = await data.own.mine(); } catch { say('Your rifts did not load', 'Reload the page to try again.'); return; }
    if (!got || view !== 'mine') return;
    const broke = !owner && got.mana < 1;
    const add = $('pixels-new');
    add.href = make();
    if (broke) add.setAttribute('aria-disabled', 'true'); else add.removeAttribute('aria-disabled');
    $('pixels-mana').hidden = owner;
    $('pixels-mana').textContent = `${got.mana} mana`;
    $('pixels-new-note').hidden = !broke && !!got.puzzles.length;
    $('pixels-new-note').textContent = broke ? 'You have no mana. Find a sprite in a rift somebody else made to earn one.'
      : owner ? 'Your own rifts go to your friends once they are published.' : 'A new puzzle costs 1 mana. A rift holds fifteen and is published with three.';
    const found = new Map();
    got.puzzles.forEach(p => {
      if (!found.has(p.level)) found.set(p.level, { level: p.level, theme: p.theme, hidden: p.hidden, puzzles: [] });
      found.get(p.level).puzzles.push(p);
    });
    host.replaceChildren(...[...found.values()].sort((a, b) => a.level - b.level).map(g => {
      g.sizes = [...new Set(g.puzzles.map(p => p.width))].sort((a, b) => a - b);
      g.width = g.sizes[0];
      const name = g.theme || 'Unnamed rift', waiting = g.puzzles.filter(p => p.off).length;
      const full = g.puzzles.length >= 15;
      const block = riftBlock({
        name,
        meta: `${g.puzzles.length} of 15 · ${side(g)}`,
        tags: g.hidden ? ['Hidden'] : waiting ? [`${waiting} new waiting`] : [],
        controls: [menu(`More for ${name}`, [
          ['Rename', from => rename(g, from)],
          g.hidden ? ['Publish', () => publish(g, true)] : waiting ? [`Publish ${count(waiting, 'new puzzle', 'new puzzles')}`, () => publish(g, true)] : null,
          g.hidden ? null : ['Hide', () => publish(g, false)],
          ['Delete', from => remove(g, from), true],
        ])],
        puzzles: g.puzzles,
        href: p => make(`id=${encodeURIComponent(p.id)}`),
        add: full || broke ? null : make(`size=${Math.max(...g.sizes)}&gate=${g.level}`),
        addLabel: `Add a puzzle to ${name}`,
      });
      const solvers = got.solvers.filter(s => s.level === g.level);
      if (solvers.length) {
        const ul = document.createElement('ul');
        ul.className = 'pixels-people';
        ul.append(...solvers.map(s => {
          const li = document.createElement('li');
          li.className = 'pixels-person';
          li.append(portrait(s), words('pixels-person-name', s.name), words('pixels-meta', `${s.solved} of ${g.puzzles.length} · ${time(s.seconds)}`));
          return li;
        }));
        block.append(ul);
      }
      return block;
    }));
  }
  // New puzzle is a link, so at no mana it is stopped here.
  $('pixels-new').addEventListener('click', e => { if ($('pixels-new').getAttribute('aria-disabled') === 'true') e.preventDefault(); });

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let me;
    try { me = await enter($('pixels-create')); } catch { say('Create did not load', 'Reload the page to try again.'); return; }
    if (!me) return;
    // The local preview has no players, so the owner has Game alone there.
    if (!data.own && !(owner && data.all)) { say('There is nothing to make here', 'This preview has no players.'); return; }
    if (!data.own) view = 'game';
    else if (owner && data.all) {
      pick.hidden = false;
      switcher(pick, b => show(b.dataset.view));
    }
    show(view);
  })();
})();
