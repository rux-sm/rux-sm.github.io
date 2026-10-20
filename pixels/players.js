/* ==========================================================================
   players.js — the owner's page: who has played, and how far
   --------------------------------------------------------------------------
   A row a player: their picture and name, and under the name how many
   puzzles they have solved and when they last played, after whether they
   have done today's puzzle and their days in a row while it is on. Edit
   opens the row: a field for the name, a new one being the name the
   leaderboard shows; Clear picture, where they drew one; and Remove, which
   takes a player off the leaderboard with all their results; an account
   that plays again starts a new player.

   Under the table is every rift a player has made, to hide or delete.

   Whether new players may join is a switch on Me, under Owner.

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

  const key = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rux--btn rux--btn--sm rux--layout--size-sm ${cls}`;
    b.textContent = text;
    return b;
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
      const li = document.createElement('li');
      li.className = 'pixels-person pixels-player';
      const text = document.createElement('span');
      text.className = 'pixels-player-text';
      const name = document.createElement('span');
      name.className = 'pixels-person-name';
      name.textContent = p.name;
      const stats = document.createElement('span');
      stats.className = 'pixels-meta pixels-person-name';
      // Today's puzzle and the days in a row say nothing while it is off.
      stats.textContent = [...(DAILY ? [p.today ? `today ${p.today}` : 'not today', `${p.days} in a row`] : []), `${p.solved} solved`, when(p.last_played_at)].join(' · ');
      text.append(name, stats);
      const edit = key('rux--btn--ghost', 'Edit');
      edit.setAttribute('aria-expanded', 'false');
      edit.setAttribute('aria-label', `Edit ${p.name}`);
      li.append(portrait({ name: p.name, picture: p.picture, colours: p.picture_colours }), text, edit);

      // EDIT opens the row: the name, a picture to clear, and Remove.
      const open = document.createElement('div');
      open.className = 'pixels-player-edit';
      open.hidden = true;
      const field = document.createElement('input');
      Object.assign(field, { className: 'rux--text-input rux--layout--size-sm pixels-player-name', type: 'text', maxLength: 20, value: p.name });
      field.setAttribute('aria-label', `Name of ${p.name}`);
      const save = key('rux--btn--primary', 'Save');
      const rename = async () => {
        const to = field.value.trim();
        if (!to || to === p.name) { field.value = p.name; return; }
        save.disabled = true;
        try {
          await data.renamePlayer(p.id, to);
          $('pixels-error').hidden = true;
        } catch (error) {
          if (error?.code === '23505') say('That name is taken', 'Another player has it.');
          else say('The name was not saved', 'Try again.');
        }
        draw();
      };
      save.addEventListener('click', rename);
      field.addEventListener('keydown', e => { if (e.key === 'Enter') rename(); });
      const named = document.createElement('div');
      named.className = 'pixels-player-named';
      named.append(field, save);
      open.append(named);
      // A picture the player drew can be taken away; the one made from their name shows again.
      if (p.picture) {
        const clear = key('rux--btn--ghost', 'Clear picture');
        clear.addEventListener('click', async () => {
          clear.disabled = true;
          try { await data.clearPicture(p.id); } catch { say('The picture was not cleared', 'Try again.'); }
          draw();
        });
        open.append(clear);
      }
      const remove = key('rux--btn--danger--ghost', 'Remove');
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
      open.append(remove);
      li.append(open);
      edit.addEventListener('click', () => {
        open.hidden = !open.hidden;
        edit.setAttribute('aria-expanded', String(!open.hidden));
        edit.textContent = open.hidden ? 'Edit' : 'Done';
        if (!open.hidden) field.focus();
      });
      return li;
    }));
    $('pixels-rows').hidden = false;

    // The rifts players have made: who made each, how much it holds, and
    // whether it is published. Hide unpublishes one; Delete, pressed twice,
    // takes it and its puzzles.
    let made = [];
    try { made = await data.playerGates(); } catch { say('The players\' rifts did not load', 'Reload the page to try again.'); }
    const list = document.createElement('ul');
    list.className = 'pixels-people';
    list.append(...made.map(g => {
      const who = all.players.find(p => p.id === g.maker) || { name: 'A player' };
      const li = document.createElement('li');
      li.className = 'pixels-person';
      const text = document.createElement('span');
      text.className = 'pixels-person-name';
      text.textContent = `${who.name} · ${g.name || 'More'} · ${g.sizes.map(n => `${n}×${n}`).join(', ')} · ${g.puzzles} of 15 · ${g.hidden ? 'hidden' : 'published'}`;
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
          try { await run(); } catch { say('The rift did not change', 'Try again.'); }
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
    heading.textContent = 'Rifts players made';
    $('pixels-made').replaceChildren(heading, list);
    $('pixels-made').hidden = !made.length;
  };

  if (!data) say('Pixels could not connect', 'Reload the page to try again.');
  else if (!owner || !data.players) say("Only the owner sees the players", 'This account can play.');
  else draw();
})();
