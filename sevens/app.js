/* ==========================================================================
   app.js — what both Sevens pages share
   --------------------------------------------------------------------------
   window.Sevens.card draws a card, `score` adds up a hand the way the round
   will, `line` turns a move into a sentence, and `notice` shows an error.
   ========================================================================== */
(() => {
  'use strict';

  const WORDS = { freeze: 'Freeze', three: 'Flip three', second: 'Second chance' };

  // A card row from sevens_cards as a card on the page.
  const card = (c, size = '') => {
    const el = document.createElement('span');
    el.className = 'sevens-card' + (size ? ` sevens-card--${size}` : '');
    if (c.kind === 'number') { el.dataset.card = String(c.value); el.textContent = c.value; }
    else if (c.kind === 'bonus') { el.dataset.card = 'bonus'; el.textContent = `+${c.value}`; }
    else if (c.kind === 'times') { el.dataset.card = 'bonus'; el.textContent = '×2'; }
    else { el.dataset.card = c.kind; el.classList.add('sevens-card--word'); el.textContent = WORDS[c.kind]; }
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', name(c));
    return el;
  };

  const name = c => c.kind === 'number' ? String(c.value)
    : c.kind === 'bonus' ? `+${c.value}` : c.kind === 'times' ? '×2' : WORDS[c.kind];

  // What a hand scores if the round ends now: numbers, doubled by ×2, then
  // the bonus cards, and 15 more for seven different numbers.
  const score = hand => {
    const numbers = hand.filter(c => c.kind === 'number').map(c => c.value);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const doubled = hand.some(c => c.kind === 'times');
    const bonus = hand.filter(c => c.kind === 'bonus').reduce((a, c) => a + c.value, 0);
    const unique = new Set(numbers).size;
    const points = sum * (doubled ? 2 : 1) + bonus + (unique >= 7 ? 15 : 0);
    return { numbers, sum, doubled, bonus, unique, points };
  };

  // A move from sevens_moves as a sentence. `who(seat)` names a seat and
  // `cardOf(id)` finds a card; both come from the page.
  const line = (m, who, cardOf) => {
    const p = who(m.seat), q = who(m.target), c = m.card != null ? cardOf(m.card) : null;
    const it = c ? (c.kind === 'number' ? `a ${c.value}` : name(c)) : 'a card';
    switch (m.kind) {
      case 'join': return `${p} sat down`;
      case 'start': return `${p} started the game`;
      case 'round': return `Round ${m.round}. ${p} deals`;
      case 'flip': return `${p} flipped ${it}`;
      case 'stay': return `${p} stayed`;
      case 'bust': return `${p} busted on ${it}`;
      case 'saved': return `${p}'s Second Chance saved ${it}`;
      case 'freeze': return m.seat === m.target ? `${p} froze themself` : `${p} froze ${q}`;
      case 'three': return m.seat === m.target ? `${p} took Flip Three` : `${p} gave ${q} Flip Three`;
      case 'second': return `${p} gave ${q} a Second Chance`;
      case 'discard': return `${p}'s ${it} had nowhere to go`;
      case 'seven': return `${p} flipped seven!`;
      case 'shuffle': return 'The discards were shuffled back in';
      case 'score': return `Round ${m.round} is over`;
      case 'win': return `${p} wins!`;
      case 'skip': return `${p} was skipped`;
      case 'leave': return `${p} left`;
      default: return '';
    }
  };

  const notice = (text = '') => {
    const box = document.getElementById('sevens-error');
    if (!box) return;
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = !text;
  };

  // A database error as something to tell the player: the rule's own words
  // when it gave some, or a plain retry.
  const reason = error => (error?.code === 'P0001' || error?.code === '42501') && error.message
    ? error.message : 'That did not go through. Try again.';

  window.Sevens = Object.assign(window.Sevens || {}, { card, name, score, line, notice, reason });
})();
