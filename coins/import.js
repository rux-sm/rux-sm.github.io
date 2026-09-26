/* ==========================================================================
   import.js — the Import page
   --------------------------------------------------------------------------
   Four steps: the account, the bank file, a check of the new lines, and
   done. The file is read here, in the browser, by bank-file.js; only its
   lines are saved. A line the account already holds is counted as already
   saved and left out, so a file that overlaps an earlier one adds only what
   is new. Earlier imports are listed under the first step, each with Undo,
   which deletes it and exactly its lines.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins, B = C.bankFile;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const STEPS = ['Account', 'Bank file', 'Check', 'Done'];
  const PANELS = ['coins-step-account', 'coins-step-file', 'coins-step-check', 'coins-step-done'];
  const ICON = { complete: '#i-checkmark--outline', current: '#i-incomplete', incomplete: '#i-circle-dash' };
  const STATE = { complete: 'rux--progress-step--complete', current: 'rux--progress-step--current', incomplete: 'rux--progress-step--incomplete' };
  const SAID = { complete: 'Complete', current: 'Current', incomplete: 'Not started' };
  const KIND = { trade: '', fee: 'Fee', 'own-transfer': 'Own transfer', 'card-payment': 'Card payment', household: 'Between us' };

  let people = [], accounts = [], rules = [], bills = [];
  let account = null, file = null, fresh = [], step = 0;

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const when = iso => new Date(`${iso}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const whoseName = a => a.person_id ? people.find(p => p.id === a.person_id)?.name ?? '' : 'Both';
  const accountName = a => [a.name, a.last4 ? `··${a.last4}` : ''].filter(Boolean).join(' ');

  // THE STEP LIST, templates/wizard-page.html's vertical progress.
  function show(n) {
    step = n;
    $('coins-steps').innerHTML = STEPS.map((label, i) => {
      const state = i < n ? 'complete' : i === n ? 'current' : 'incomplete';
      return `<li class="rux--progress-step ${STATE[state]}">
        <button type="button" class="rux--progress-step-button rux--progress-step-button--unclickable">
          <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true"><use href="${ICON[state]}"/></svg>
          <div class="rux--progress-text"><span class="rux--progress-label">${label}</span>${i === n ? `<span class="rux--progress-optional">Step ${i + 1} of 4</span>` : ''}</div>
          <span class="rux--assistive-text">${SAID[state]}</span>
          <span class="rux--progress-line"></span>
        </button></li>`;
    }).join('');
    PANELS.forEach((id, i) => { $(id).hidden = i !== n; });
    C.notice();
  }

  // ---------- 1. Account
  const option = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };
  function fillAccounts(selected) {
    const sel = $('coins-account');
    sel.replaceChildren(
      ...accounts.filter(a => !a.closed).map(a => option(a.id, `${accountName(a)} · ${whoseName(a)}`)),
      option('new', 'Add an account'));
    sel.value = selected ?? (accounts.length ? accounts[0].id : 'new');
    $('coins-new-account').hidden = sel.value !== 'new';
    $('coins-new-whose').replaceChildren(option('', 'Both'), ...people.map(p => option(p.id, p.name)));
  }
  $('coins-account').addEventListener('change', e => { $('coins-new-account').hidden = e.target.value !== 'new'; });

  $('coins-account-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      if ($('coins-account').value !== 'new') {
        account = accounts.find(a => a.id === $('coins-account').value);
        return show(1);
      }
      const name = $('coins-new-name').value.trim(), last4 = $('coins-new-last4').value.trim();
      if (!name) return C.notice('Give the account a name.');
      if (last4 && !/^\d{4}$/.test(last4)) return C.notice('The last four digits are four numbers.');
      account = await C.data.addAccount({
        household_id: people[0].household_id,
        name, last4: last4 || null,
        person_id: $('coins-new-whose').value || null,
        kind: $('coins-new-kind').value,
        institution: $('coins-new-bank').value.trim(),
      });
      accounts.push(account);
      accounts.sort((a, b) => a.name.localeCompare(b.name));
      fillAccounts(account.id);
      show(1);
    } catch (error) { fail(error); }
  });

  // Earlier imports, newest first. Undo asks once more before it deletes.
  function drawEarlier(list) {
    $('coins-earlier-wrap').hidden = !list.length;
    $('coins-earlier').replaceChildren(...list.map(imp => {
      const a = accounts.find(x => x.id === imp.account_id);
      const li = document.createElement('li');
      li.className = 'rux--contained-list-item rux--contained-list-item--with-action';
      li.innerHTML = `<div class="rux--contained-list-item__content coins-row">
          <span class="coins-row__main"><span class="coins-row__title"></span><span class="coins-row__sub"></span></span>
        </div>
        <div class="rux--contained-list-item__action">
          <button type="button" class="rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm">Undo</button>
        </div>`;
      li.querySelector('.coins-row__title').textContent = `${a ? accountName(a) : 'An account'} · ${imp.rows_added} lines`;
      li.querySelector('.coins-row__sub').textContent = [imp.file_name,
        imp.first_day ? `${when(imp.first_day)} to ${when(imp.last_day)}` : '', `imported ${when(imp.created_at.slice(0, 10))}`].filter(Boolean).join(' · ');
      const undo = li.querySelector('button');
      undo.addEventListener('click', async () => {
        if (!undo.dataset.sure) {
          undo.dataset.sure = '1';
          undo.textContent = `Remove ${imp.rows_added} lines`;
          undo.classList.replace('rux--btn--ghost', 'rux--btn--danger--ghost');
          return;
        }
        try { undo.disabled = true; await C.data.undoImport(imp.id); drawEarlier(await C.data.imports()); }
        catch (error) { fail(error); undo.disabled = false; }
      });
      return li;
    }));
  }

  // ---------- 2. Bank file
  const drop = $('coins-drop'), input = $('coins-file');
  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('rux--file__drop-container--drag-over'); if (e.dataTransfer.files[0]) read(e.dataTransfer.files[0]); });
  input.addEventListener('change', () => { if (input.files[0]) read(input.files[0]); input.value = ''; });

  async function read(f) {
    try {
      const { layout, lines, balance } = B.parse(await f.text());
      if (!layout) return C.notice('Coins does not know this file\'s columns. Export a .csv of transactions from the bank\'s website.');
      if (!lines.length) return C.notice('The file has no transactions in it.');
      const days = lines.map(l => l.day).sort();
      const held = await C.data.saved(account.id, days[0], days[days.length - 1]);
      const known = new Set(held.map(h => `${B.same(h)}#${h.occurrence}`));
      const ctx = {
        last4: accounts.map(a => a.last4).filter(Boolean),
        members: people.map(p => p.name.split(' ')[0].toUpperCase()),
      };
      // Each new line takes the household's rules, then the first bill it fits.
      fresh = lines.filter(l => !known.has(`${B.same(l)}#${l.occurrence}`)).map(l => B.apply({
        ...l, kind: B.kind(l, ctx), merchant: B.merchant(l.description), category: '',
      }, rules)).map(l => ({ ...l, bill_id: bills.find(b => b.decision !== 'cancelled' && C.matches(b, l))?.id ?? null }));
      // A stated balance is kept only when it is newer than the one the account has.
      const newer = balance && (!account.balance_on || balance.day > account.balance_on) ? balance : null;
      file = { name: f.name, layout, lines, balance: newer, first: days[0], last: days[days.length - 1] };
      drawCheck();
      show(2);
    } catch (error) { fail(error); }
  }

  // ---------- 3. Check
  function drawCheck() {
    $('coins-check-what').textContent = `${file.name} into ${accountName(account)} (${whoseName(account)}).`
      + (file.balance ? ` Its balance on ${when(file.balance.day)} was ${C.money(file.balance.amount)}, and saving keeps it.` : '');
    $('coins-found').textContent = file.lines.length;
    $('coins-range').textContent = `${when(file.first)} to ${when(file.last)}`;
    $('coins-known').textContent = file.lines.length - fresh.length;
    $('coins-new').textContent = fresh.length;
    $('coins-new-note').textContent = fresh.length ? 'Untick any you do not want' : 'Nothing new in this file';
    $('coins-lines-wrap').hidden = !fresh.length;
    $('coins-lines').replaceChildren(...fresh.map((l, i) => {
      const li = document.createElement('li');
      li.className = 'rux--contained-list-item';
      li.innerHTML = `<div class="rux--contained-list-item__content coins-row coins-row--pick">
          <div class="rux--checkbox--inline rux--checkbox-wrapper">
            <input type="checkbox" class="rux--checkbox" id="coins-l${i}" data-i="${i}" checked>
            <label for="coins-l${i}" class="rux--checkbox-label"><span class="rux--visually-hidden">Save this line</span></label>
          </div>
          <span class="coins-row__main"><span class="coins-row__title"></span><span class="coins-row__sub"></span></span>
          <span class="coins-row__side"><span class="coins-amount"></span></span>
        </div>`;
      li.querySelector('.coins-row__title').textContent = l.description;
      li.querySelector('.coins-row__sub').textContent = [when(l.day), KIND[l.kind] || l.category || l.bank_category].filter(Boolean).join(' · ');
      li.querySelector('.coins-amount').textContent = C.money(l.amount);
      return li;
    }));
    count();
  }
  const picked = () => fresh.filter((_, i) => $(`coins-l${i}`)?.checked);
  const count = () => {
    const n = picked().length;
    $('coins-save').textContent = n ? (n === 1 ? 'Save 1 line' : `Save ${n} lines`) : 'Save the balance';
    $('coins-save').disabled = !n && !file?.balance;
  };
  $('coins-lines').addEventListener('change', count);

  $('coins-save').addEventListener('click', async () => {
    const lines = picked();
    const save = $('coins-save');
    save.disabled = true;
    try {
      const said = [];
      if (file.balance) {
        await C.data.updateAccount(account.id, { balance: file.balance.amount, balance_on: file.balance.day });
        Object.assign(account, { balance: file.balance.amount, balance_on: file.balance.day });
        said.push(`The balance is ${C.money(file.balance.amount)} on ${when(file.balance.day)}.`);
      }
      if (!lines.length) {
        $('coins-done-text').textContent = said.join(' ');
        show(3);
        return;
      }
      const { added } = await C.data.saveImport({
        household_id: account.household_id, account_id: account.id,
        file_name: file.name, layout: file.layout,
        first_day: file.first, last_day: file.last, rows_found: file.lines.length,
      }, lines.map(l => ({
        household_id: account.household_id, account_id: account.id,
        day: l.day, description: l.description, amount: l.amount,
        bank_type: l.bank_type, bank_category: l.bank_category, occurrence: l.occurrence,
        merchant: l.merchant, kind: l.kind, category: l.category, bill_id: l.bill_id,
      })));
      $('coins-done-text').textContent = [`${added === 1 ? '1 line' : `${added} lines`} saved into ${accountName(account)}.`, ...said].join(' ');
      show(3);
      drawEarlier(await C.data.imports());
    } catch (error) { fail(error); save.disabled = false; }
  });

  // ---------- Back and again
  for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => show(step - 1));
  $('coins-again').addEventListener('click', () => { file = null; fresh = []; show(0); });

  (async () => {
    [people, accounts, rules, bills] = await Promise.all([C.data.people(), C.data.accounts(), C.data.rules(), C.data.bills()]);
    if (!people.length) return C.notice('This login is not linked to a household yet.');
    fillAccounts();
    show(0);
    drawEarlier(await C.data.imports());
  })().catch(fail);
})();
