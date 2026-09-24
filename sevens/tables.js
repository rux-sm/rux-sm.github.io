/* ==========================================================================
   tables.js — the front page: your games, the open tables, and a new one
   ========================================================================== */
(() => {
  'use strict';

  const { data, notice, reason } = window.Sevens;
  const $ = id => document.getElementById(id);
  const mineList = $('sevens-mine'), openList = $('sevens-open'), start = $('sevens-new');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.port !== '8641';

  if (!data) {
    notice(local ? 'This preview has no log-in. Open http://localhost:8641/sevens/ to play.' : 'Sevens could not connect. Reload the page.');
    start.disabled = true;
    return;
  }

  const row = (title, detail, action) => {
    const el = document.createElement('div');
    el.className = 'sevens-open';
    const text = document.createElement('div');
    text.textContent = title;
    const small = document.createElement('small');
    small.textContent = detail;
    text.appendChild(small);
    el.append(text, action);
    return el;
  };
  const empty = text => {
    const p = document.createElement('p');
    p.className = 'sevens-math';
    p.textContent = text;
    return p;
  };
  const go = id => { location.href = `table.html?id=${encodeURIComponent(id)}`; };

  let me = null;
  const render = async () => {
    let lobby;
    try { lobby = await data.lobby(); } catch (e) { notice(reason(e)); return; }
    notice('');
    const { tables, seats } = lobby;
    const at = t => seats.filter(s => s.table_id === t.id);
    const hostName = t => at(t).find(s => s.user_id === t.host)?.name || 'A';
    const mine = tables.filter(t => t.phase !== 'finished'
      && at(t).some(s => s.user_id === me && s.state !== 'left'));
    const open = tables.filter(t => t.phase === 'waiting' && !at(t).some(s => s.user_id === me));

    mineList.replaceChildren(...(mine.length ? mine.map(t => {
      const a = document.createElement('a');
      a.className = 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm';
      a.href = `table.html?id=${encodeURIComponent(t.id)}`;
      a.textContent = 'Open';
      const players = at(t).filter(s => s.state !== 'left').length;
      return row(`${hostName(t)}'s table`, `${players} seated · ${t.phase === 'waiting' ? 'waiting' : `round ${t.round}`}`, a);
    }) : [empty('None yet.')]));

    openList.replaceChildren(...(open.length ? open.map(t => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm';
      b.textContent = 'Join';
      b.addEventListener('click', async () => {
        b.disabled = true;
        try { await data.move('sevens_join', { t: t.id }); go(t.id); } catch (e) { notice(reason(e)); b.disabled = false; }
      });
      return row(`${hostName(t)}'s table`, `${at(t).length} seated · waiting`, b);
    }) : [empty('No table is waiting for players.')]));
  };

  let timer = 0;
  const soon = () => { clearTimeout(timer); timer = setTimeout(render, 150); };

  start.addEventListener('click', async () => {
    start.disabled = true;
    try { go(await data.move('sevens_open')); } catch (e) { notice(reason(e)); start.disabled = false; }
  });

  (async () => {
    try { me = await data.me(); } catch { /* read below says what went wrong */ }
    await render();
    data.listen(null, soon);
    // A phone that slept missed its updates; read again when it wakes.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  })();
})();
