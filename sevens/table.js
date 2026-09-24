/* ==========================================================================
   table.js — one game, table.html?id=
   --------------------------------------------------------------------------
   The page draws what the database says and sends moves; it decides no rule
   itself. After a move, and on any change another phone makes, it reads the
   whole table again and redraws.

   What a player sees, by the table's phase: waiting, the seats and Deal for
   whoever started it; dealing and turns, every hand, the deck and the last
   move, with Flip and Stay on your turn and a list to choose from when you
   drew an action card; scored, the round's points and Deal for the next;
   finished, the winner. The chat is under all of them.
   ========================================================================== */
(() => {
  'use strict';

  const { data, card, score, line, notice, reason } = window.Sevens;
  const $ = id => document.getElementById(id);
  const id = new URLSearchParams(location.search).get('id');
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.port !== '8641';
  const views = ['sevens-waiting', 'sevens-play', 'sevens-scored', 'sevens-finished', 'sevens-outside'];
  const show = (...ids) => views.forEach(v => { $(v).hidden = !ids.includes(v); });

  if (!data || !id) {
    notice(!data && local ? 'This preview has no log-in. Open http://localhost:8641/sevens/ to play.'
      : !data ? 'Sevens could not connect. Reload the page.' : 'No table was named. Pick one from Tables.');
    show();
    return;
  }

  let me = null, busy = false, st = null, lastMessage = 0;

  const run = async (name, args = {}) => {
    if (busy) return;
    busy = true;
    draw();
    try { await data.move(name, { t: id, ...args }); notice(''); } catch (e) { notice(reason(e)); }
    busy = false;
    await read();
  };

  const read = async () => {
    try { st = await data.game(id); } catch (e) { notice(reason(e)); return; }
    draw();
  };

  /* -- drawing -------------------------------------------------------------- */
  const text = (el, value) => { el.textContent = value; return el; };
  const make = (tag, cls, value) => { const el = document.createElement(tag); if (cls) el.className = cls; if (value != null) el.textContent = value; return el; };
  const TAGS = { in: ['In', 'rux--tag--green'], stayed: ['Stayed', 'rux--tag--gray'], frozen: ['Frozen', 'rux--tag--blue'], busted: ['Busted', 'rux--tag--red'], left: ['Left', 'rux--tag--gray'] };

  function draw() {
    if (!st) return;
    const { table: x, seats, cards, moves, messages } = st;
    if (!x) { notice('This table is gone. Pick another from Tables.'); show(); return; }
    const mine = seats.find(s => s.user_id === me);
    const seatOf = s => seats.find(p => p.seat === s);
    const who = s => (s == null ? '' : s === mine?.seat ? 'You' : seatOf(s)?.name || 'Someone');
    const cardOf = n => cards.find(c => c.id === n);
    const handOf = s => cards.filter(c => c.place === 'hand' && c.seat === s);
    const host = x.host === me;
    const waitingOn = x.queue.length ? x.queue[0].seat : x.phase === 'turns' && !x.three ? x.turn : null;
    const lastDrawn = cards.reduce((m, c) => (c.drawn != null && c.place !== 'discard' && (!m || c.drawn > m.drawn) ? c : m), null);

    // The status line.
    $('sevens-round').textContent = x.phase === 'waiting' ? 'Waiting for players' : `Round ${x.round} · to 200`;
    $('sevens-whose').textContent = x.phase === 'waiting' ? `${seats.length} seated`
      : x.phase === 'finished' ? 'Game over'
      : x.phase === 'scored' ? 'Round over'
      : x.queue.length ? (x.queue[0].seat === mine?.seat ? 'Your choice' : `${who(x.queue[0].seat)} is choosing`)
      : x.phase === 'dealing' || x.three ? 'Dealing'
      : x.turn === mine?.seat ? 'Your turn' : `${who(x.turn)}'s turn`;

    // Not at this table: join it while it waits, or read that it is not yours.
    if (!mine) {
      show('sevens-outside');
      $('sevens-join').hidden = x.phase !== 'waiting';
      $('sevens-outside-text').textContent = x.phase === 'waiting' ? `${seats.find(s => s.user_id === x.host)?.name || 'Someone'}'s table is waiting for players.` : 'This game is under way without you.';
      drawChat(seats, messages, false);
      return;
    }

    if (x.phase === 'waiting') {
      show('sevens-waiting');
      $('sevens-seated').replaceChildren(...seats.map(s => {
        const el = make('div', 'sevens-open');
        const n = make('div', null, s.user_id === me ? `${s.name} (you)` : s.name);
        if (s.user_id === x.host) n.appendChild(make('small', null, 'Started the table'));
        el.append(n, make('span'));
        return el;
      }));
      $('sevens-start').hidden = !host;
      $('sevens-start').disabled = busy || seats.length < 2;
      $('sevens-start-note').textContent = host
        ? (seats.length < 2 ? 'Deal once someone joins from their Tables page.' : 'Deal when everyone is in.')
        : `${seats.find(s => s.user_id === x.host)?.name || 'Whoever started the table'} deals when everyone is in.`;
      drawChat(seats, messages, true);
      return;
    }

    show('sevens-play', ...(x.phase === 'scored' ? ['sevens-scored'] : x.phase === 'finished' ? ['sevens-finished'] : []));

    // Everyone else, a row each.
    $('sevens-others').replaceChildren(...seats.filter(s => s.seat !== mine.seat).map(s => {
      const row = make('div', 'sevens-player');
      if (s.seat === waitingOn && ['dealing', 'turns'].includes(x.phase)) row.dataset.turn = '';
      if (s.state !== 'in') row.dataset.out = '';
      const whoEl = make('div', 'sevens-who');
      whoEl.appendChild(make('strong', null, s.name));
      const [label, colour] = TAGS[s.state];
      whoEl.appendChild(make('span', `rux--tag rux--layout--size-sm rux--tag--sm ${colour}`, label));
      const total = make('span', 'sevens-total', String(s.total));
      const hand = make('div', 'sevens-hand');
      drawHand(hand, handOf(s.seat), s.state === 'busted', lastDrawn, 'sm');
      row.append(whoEl, total, hand);
      return row;
    }));

    // The deck and the last thing that happened.
    text($('sevens-deck'), String(x.deck_left)).setAttribute('aria-label', `${x.deck_left} cards in the deck`);
    const last = [...moves].reverse().find(m => m.kind !== 'join');
    $('sevens-feed').textContent = last ? line(last, who, cardOf) : '';

    // You.
    const hand = handOf(mine.seat);
    const sum = score(hand);
    const you = $('sevens-you');
    if (mine.seat === waitingOn && ['dealing', 'turns'].includes(x.phase)) you.dataset.turn = ''; else delete you.dataset.turn;
    drawHand($('sevens-hand'), hand, mine.state === 'busted', lastDrawn);
    const busted = mine.state === 'busted';
    $('sevens-points').textContent = mine.state === 'left' ? '—' : busted ? '0' : String(x.phase === 'scored' || x.phase === 'finished' ? mine.round_score : sum.points);
    const parts = [];
    if (busted) parts.push('Busted');
    else if (sum.numbers.length) {
      let m = sum.numbers.length > 1 ? `(${sum.numbers.join(' + ')})` : String(sum.numbers[0]);
      if (sum.doubled) m += ' × 2';
      if (sum.bonus) m += ` + ${sum.bonus}`;
      if (sum.unique >= 7) m += ' + 15';
      parts.push(m, `${sum.unique} of 7 numbers`);
    }
    if (mine.state === 'stayed') parts.push('Stayed');
    if (mine.state === 'frozen') parts.push('Frozen');
    if (mine.state === 'left') parts.push('You left this game');
    parts.push(`${mine.total} total`);
    $('sevens-math').textContent = parts.join(' · ');

    // A card for you to play.
    const choosing = x.queue.length && x.queue[0].seat === mine.seat && ['dealing', 'turns'].includes(x.phase);
    $('sevens-choice').hidden = !choosing;
    if (choosing) drawChoice(x.queue[0], seats, cards, mine, cardOf);

    // Flip and Stay.
    const myTurn = x.phase === 'turns' && x.turn === mine.seat && !x.queue.length && !x.three && mine.state === 'in';
    $('sevens-go').hidden = !['dealing', 'turns'].includes(x.phase) || mine.state === 'left';
    $('sevens-flip').disabled = busy || !myTurn;
    $('sevens-stay').disabled = busy || !myTurn;

    // Moving past someone who has gone quiet.
    const skip = $('sevens-skip');
    skip.hidden = !(host && waitingOn != null && waitingOn !== mine.seat && ['dealing', 'turns'].includes(x.phase));
    skip.textContent = `Skip ${who(waitingOn)}`;
    skip.disabled = busy;

    if (x.phase === 'scored' || x.phase === 'finished') drawScores(x, seats, mine);
    $('sevens-leave').hidden = x.phase === 'finished' || mine.state === 'left';
    drawChat(seats, messages, mine.state !== 'left');
  }

  // A hand in the order it was dealt; a bust rings its repeated number.
  function drawHand(el, hand, busted, lastDrawn, size) {
    const seen = new Set();
    el.replaceChildren(...hand.map(c => {
      const face = card(c, size);
      if (c.kind === 'number') {
        if (busted && seen.has(c.value)) face.classList.add('sevens-card--dup');
        seen.add(c.value);
      }
      if (lastDrawn && c.id === lastDrawn.id) face.classList.add('sevens-card--new');
      return face;
    }));
  }

  const CHOICE = {
    freeze: ['You drew Freeze', 'Pick who is frozen. They bank their points and are out this round.'],
    three: ['You drew Flip Three', 'Pick who flips the next three cards. It can be you.'],
    second: ['You drew a second Second Chance', 'You can hold only one. Pick who gets this one.'],
  };
  function drawChoice(item, seats, cards, mine, cardOf) {
    const c = cardOf(item.card);
    const [title, help] = CHOICE[c.kind] || ['You drew a card', ''];
    $('sevens-choice-title').textContent = title;
    $('sevens-choice-help').textContent = help;
    $('sevens-choice-card').replaceChildren(card(c));
    // The same players the database allows: anyone in, and for a Second
    // Chance anyone else in without one.
    const hasSecond = s => cards.some(k => k.place === 'hand' && k.seat === s && k.kind === 'second');
    const options = seats.filter(s => s.state === 'in' && (c.kind !== 'second' || (s.seat !== mine.seat && !hasSecond(s.seat))));
    $('sevens-choice-list').replaceChildren(...options.map(s => {
      const b = make('button', 'rux--btn rux--btn--tertiary');
      b.type = 'button';
      const n = cards.filter(k => k.place === 'hand' && k.seat === s.seat).length;
      b.textContent = `${s.seat === mine.seat ? 'You' : s.name} · ${n} in hand`;
      b.disabled = busy;
      b.addEventListener('click', () => run('sevens_choose', { target: s.seat }));
      return b;
    }));
  }

  function drawScores(x, seats, mine) {
    const list = x.phase === 'finished' ? $('sevens-final') : $('sevens-scores');
    const order = [...seats].sort((a, b) => b.total - a.total);
    list.replaceChildren(...order.map(s => {
      const row = make('div', 'sevens-score');
      row.append(make('strong', null, s.seat === mine.seat ? 'You' : s.name),
        make('span', null, s.state === 'busted' ? 'busted' : s.state === 'left' ? 'left' : `+${s.round_score}`),
        make('span', null, String(s.total)));
      return row;
    }));
    if (x.phase === 'scored') {
      $('sevens-scored-title').textContent = `Round ${x.round}`;
      $('sevens-scored-note').textContent = x.flip7 != null ? `${x.flip7 === mine.seat ? 'You' : seats.find(s => s.seat === x.flip7)?.name} flipped seven` : '';
      $('sevens-deal').textContent = `Deal round ${x.round + 1}`;
      $('sevens-deal').disabled = busy;
      $('sevens-deal').hidden = mine.state === 'left';
    } else {
      const w = seats.find(s => s.seat === x.winner);
      $('sevens-winner').textContent = !w ? 'Game over' : w.seat === mine.seat ? 'You win!' : `${w.name} wins`;
    }
  }

  function drawChat(seats, messages, canSay) {
    const byUser = u => seats.find(s => s.user_id === u);
    const list = $('sevens-messages');
    const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.replaceChildren(...messages.map(m => {
      const el = make('div', 'sevens-msg');
      if (m.user_id === me) el.dataset.mine = '';
      el.append(make('small', null, m.user_id === me ? 'You' : byUser(m.user_id)?.name || 'Someone'), document.createTextNode(m.body));
      return el;
    }));
    $('sevens-chat-empty').hidden = messages.length > 0;
    const newest = messages.length ? messages[messages.length - 1].id : 0;
    if (newest !== lastMessage && (atBottom || messages[messages.length - 1]?.user_id === me)) list.scrollTop = list.scrollHeight;
    lastMessage = newest;
    $('sevens-say').hidden = !canSay;
  }

  /* -- what the player does ------------------------------------------------- */
  $('sevens-flip').addEventListener('click', () => run('sevens_flip'));
  $('sevens-stay').addEventListener('click', () => run('sevens_stay'));
  $('sevens-start').addEventListener('click', () => run('sevens_start'));
  $('sevens-deal').addEventListener('click', () => run('sevens_deal'));
  $('sevens-skip').addEventListener('click', () => run('sevens_skip'));
  $('sevens-join').addEventListener('click', async () => {
    try { await data.move('sevens_join', { t: id }); } catch (e) { notice(reason(e)); }
    await read();
  });
  $('sevens-leave-waiting').addEventListener('click', async () => {
    try { await data.move('sevens_leave', { t: id }); location.href = './'; } catch (e) { notice(reason(e)); }
  });
  $('sevens-leave-confirm').addEventListener('click', async () => {
    try { await data.move('sevens_leave', { t: id }); location.href = './'; } catch (e) { notice(reason(e)); }
  });
  $('sevens-say').addEventListener('submit', async e => {
    e.preventDefault();
    const input = $('sevens-say-input');
    const body = input.value.trim();
    if (!body) return;
    input.value = '';
    try { await data.say(id, body); } catch (err) { notice(reason(err)); input.value = body; }
    await read();
  });

  let timer = 0;
  const soon = () => { clearTimeout(timer); timer = setTimeout(read, 120); };

  (async () => {
    try { me = await data.me(); } catch { /* the read says what went wrong */ }
    await read();
    data.listen(id, soon);
    // A phone that slept missed its updates, and a dropped connection sends
    // none; read again on waking, and every 15 seconds while nothing arrives.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) read(); });
    setInterval(() => { if (!document.hidden) read(); }, 15000);
  })();
})();
