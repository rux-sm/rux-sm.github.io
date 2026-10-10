/* ==========================================================================
   players.js — the owner's page: who has played, and how far
   --------------------------------------------------------------------------
   A row a player: whether they have done today's puzzle and in what time,
   their days in a row, how many puzzles they have solved, and
   when they last played. The name is a field, and a new one is the name the
   leaderboard shows. Remove takes a player off the leaderboard with all
   their results; an account that plays again starts a new player.

   Under the table is every gate a player has made, to hide or delete.

   A new player joins by any player's invite link. Close joining shuts every
   link to anyone new; those already in keep playing.

   Only the owner's account reads any of this: the database gives nobody else
   a row.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, DAILY, today, streak, time, portrait } = window.Pixels;
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
    $('pixels-joining-text').textContent = all.joining ? 'New players can join by any player\'s invite link.' : 'Joining is closed. No invite link lets a new player in.';
    $('pixels-joining').textContent = all.joining ? 'Close joining' : 'Open joining';
    $('pixels-joining').onclick = async () => {
      try {
        await data.setJoining(!all.joining);
        $('pixels-error').hidden = true;
      } catch {
        say('Joining did not change', 'Try again.');
      }
      draw();
    };
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
      const who = document.createElement('div');
      who.className = 'pixels-player-who';
      who.append(portrait({ name: p.name, picture: p.picture, colours: p.picture_colours }), field);
      named.appendChild(who);
      // The two columns for the puzzle of the day go when it is off.
      tr.append(named, ...(DAILY ? [cell(p.today || 'Not yet'), cell(p.days)] : []), cell(p.solved), cell(when(p.last_played_at)));
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
      // A picture the player drew can be taken away; the one made from their name shows again.
      if (p.picture) {
        const clear = document.createElement('button');
        clear.type = 'button';
        clear.className = 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm';
        clear.textContent = 'Clear picture';
        clear.addEventListener('click', async () => {
          clear.disabled = true;
          try { await data.clearPicture(p.id); } catch { say('The picture was not cleared', 'Try again.'); }
          draw();
        });
        last.appendChild(clear);
      }
      last.appendChild(remove);
      tr.appendChild(last);
      return tr;
    }));
    document.querySelectorAll('[data-daily]').forEach(th => { th.hidden = !DAILY; });
    $('pixels-table').hidden = false;

    // The gates players have made: who made each, how much it holds, and
    // whether it is published. Hide unpublishes one; Delete, pressed twice,
    // takes it and its puzzles.
    let made = [];
    try { made = await data.playerGates(); } catch { say('The players\' gates did not load', 'Reload the page to try again.'); }
    const list = document.createElement('ul');
    list.className = 'pixels-people';
    list.append(...made.map(g => {
      const who = all.players.find(p => p.id === g.maker) || { name: 'A player' };
      const li = document.createElement('li');
      li.className = 'pixels-person';
      const text = document.createElement('span');
      text.className = 'pixels-person-name';
      text.textContent = `${who.name} · ${g.name || 'More'} · ${g.width}×${g.width} · ${g.puzzles} of 15 · ${g.hidden ? 'hidden' : 'published'}`;
      const keys = document.createElement('span');
      const act = (cls, label, sure, run) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `rux--btn rux--btn--sm rux--layout--size-sm ${cls}`;
        b.textContent = label;
        b.addEventListener('click', async () => {
          if (sure && b.dataset.sure == null) {
            b.dataset.sure = '';
            b.textContent = sure;
            setTimeout(() => { delete b.dataset.sure; b.textContent = label; }, 4000);
            return;
          }
          b.disabled = true;
          try { await run(); } catch { say('The gate did not change', 'Try again.'); }
          draw();
        });
        return b;
      };
      if (!g.hidden) keys.append(act('rux--btn--ghost', 'Hide', null, () => data.hideGate(g.id)));
      keys.append(act('rux--btn--danger--ghost', 'Delete', 'Delete it and its puzzles?', () => data.deleteGate(g)));
      li.append(portrait({ name: who.name, picture: who.picture, colours: who.picture_colours }), text, keys);
      return li;
    }));
    const heading = document.createElement('h2');
    heading.className = 'rux--type-productive-heading-03';
    heading.textContent = 'Gates players made';
    $('pixels-made').replaceChildren(heading, list);
    $('pixels-made').hidden = !made.length;
  };

  if (!data) say('Pixels could not connect', 'Reload the page to try again.');
  else if (!owner || !data.players) say("Only the owner sees the players", 'This account can play.');
  else draw();
})();
