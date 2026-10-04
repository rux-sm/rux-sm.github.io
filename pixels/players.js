/* ==========================================================================
   players.js — the owner's page: who has played, and how far
   --------------------------------------------------------------------------
   A row a player: whether they have done today's puzzle and in what time,
   their days in a row, how many puzzles they have solved, their stars, and
   when they last played. The name is a field, and a new one is the name the
   leaderboard shows. Remove takes a player off the leaderboard with all
   their results; an account that plays again starts a new player.

   The invite word is what a guest's link must carry to join. Saving a new
   one closes the old link to anyone new; those already in keep playing.

   Only the owner's account reads any of this: the database gives nobody else
   a row.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, today, streak, time } = window.Pixels;
  const $ = id => document.getElementById(id);

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  const cell = (text, cls) => {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text;
    return td;
  };
  const when = stamp => (stamp ? new Date(stamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Never');

  const draw = async () => {
    let all;
    try {
      all = await data.players();
    } catch {
      say('The players did not load', 'Reload the page to try again.');
      return;
    }
    const day = today();
    $('pixels-word').value = all.word;
    // The link is the published site's, since a preview's address opens for nobody else.
    const site = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? 'https://rux-sm.github.io' : location.origin;
    $('pixels-link').textContent = `${site}/pixels/?join=${encodeURIComponent(all.word)}`;
    $('pixels-invite').hidden = false;

    const rows = all.players.map(p => {
      const results = all.results.filter(r => r.player_id === p.id);
      const days = all.days.filter(d => d.player_id === p.id);
      const done = days.find(d => d.day === day);
      return {
        ...p,
        today: done ? time(done.seconds) : '',
        days: streak(new Set(days.map(d => d.day))),
        solved: results.length,
        stars: [...results, ...days].reduce((n, r) => n + r.stars, 0),
      };
    }).sort((a, b) => String(b.last_played_at || '').localeCompare(String(a.last_played_at || '')));

    $('pixels-rows').replaceChildren(...rows.map(p => {
      const tr = document.createElement('tr');
      // The name is a field: Enter or leaving it saves a new one.
      const named = document.createElement('td');
      const field = document.createElement('input');
      Object.assign(field, { className: 'rux--text-input rux--layout--size-sm pixels-player-name', type: 'text', maxLength: 20, value: p.name });
      field.setAttribute('aria-label', `Name of ${p.name}`);
      const rename = async () => {
        const to = field.value.trim();
        if (!to || to === p.name) { field.value = p.name; return; }
        try {
          await data.renamePlayer(p.id, to);
          $('pixels-error').hidden = true;
        } catch (error) {
          if (error?.code === '23505') say('That name is taken', 'Another player has it.');
          else say('The name was not saved', 'Try again.');
        }
        draw();
      };
      field.addEventListener('change', rename);
      field.addEventListener('keydown', e => { if (e.key === 'Enter') field.blur(); });
      named.appendChild(field);
      tr.append(named, cell(p.today || 'Not yet'), cell(p.days), cell(p.solved), cell(p.stars), cell(when(p.last_played_at)));
      const last = document.createElement('td');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'rux--btn rux--btn--danger--ghost rux--btn--sm rux--layout--size-sm';
      remove.textContent = 'Remove';
      // A second press within a few seconds does it; the first only asks.
      remove.addEventListener('click', async () => {
        if (remove.dataset.sure == null) {
          remove.dataset.sure = '';
          remove.textContent = `Remove ${p.name}?`;
          setTimeout(() => { delete remove.dataset.sure; remove.textContent = 'Remove'; }, 4000);
          return;
        }
        remove.disabled = true;
        try { await data.removePlayer(p.id); } catch { say('The player was not removed', 'Try again.'); }
        draw();
      });
      last.appendChild(remove);
      tr.appendChild(last);
      return tr;
    }));
    $('pixels-table').hidden = false;
  };

  $('pixels-invite').addEventListener('submit', async e => {
    e.preventDefault();
    const to = $('pixels-word').value.trim();
    if (to.length < 3) { say('The invite word is too short', 'Use three letters or more.'); return; }
    try {
      await data.setWord(to);
      $('pixels-error').hidden = true;
    } catch {
      say('The word was not saved', 'Try again.');
    }
    draw();
  });

  if (!data) say('Pixels could not connect', 'Reload the page to try again.');
  else if (!owner || !data.players) say("Only the owner sees the players", 'This account can play.');
  else draw();
})();
