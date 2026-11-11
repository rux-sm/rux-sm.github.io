/* ==========================================================================
   pair.js — WHAT EVERY PAGE PAIR DOES THE SAME WAY
   --------------------------------------------------------------------------
   Buses, Drivers, Contacts, Customers, Partners, Locations and Documents are each a
   list and one record in one file, and Trips and History are each a list
   alone. What they
   do alike lives here, so a fix reaches them all; each page's own script
   keeps only what its record has.

   SAVING. A page pair writes a record and the rows that hang off it, such as
   a bus's days out or a driver's time off. Each write here hands back what
   the database now holds, so the page's idea of the saved record is never
   behind it: a Save that stops partway is finished by the next Save, which
   sends only what has not landed, and never takes the page's own write for
   someone else's.

   `saveRecord(client, table, { id, creating, row, columns })` inserts or
   updates one record and returns it as saved. `syncRows(client, table,
   { have, want, key, rowOf, order, landed })` makes the child rows match
   `want`, calling `landed` with the rows as they stand after each write.

   THE PAGE. `page({ list, one })` takes the page's two words, as in
   `customers` and `customer`, which name its element ids and its messages,
   and returns the notices, the list's search, sort and row click, the
   fields' error states, the unsaved-changes and conflict modals, the record's
   History link, and the staff gate at start-up. `$`, `el` and `svgUse` build the rest,
   and `textField`, `selectField`, `dateRange` and `dialogError` a dialog's fields.
   ========================================================================== */
(() => {
  'use strict';

  const pkeyTaken = error => error?.code === '23505' && /_pkey/.test(error.message || '');
  const fail = error => Object.assign(new Error(error.message || 'The write failed.'), { code: error.code });

  /* A new record carries an id made before its insert, the caller's `id`, so
     a Save pressed again after an insert whose answer was lost sends the
     same id: the database refuses the second row, which says the first
     landed, and the record is updated instead. */
  async function saveRecord(client, table, { id, creating, row, columns }) {
    const update = () => client.from(table).update(row).eq('id', id).select(columns).single();
    let written = creating
      ? await client.from(table).insert({ id, ...row }).select(columns).single()
      : await update();
    if (creating && pkeyTaken(written.error)) written = await update();
    if (written.error) throw fail(written.error);
    return written.data;
  }

  /* The id a new child row is inserted under, kept per page row and per
     content, so an insert sent again after a lost answer is the same insert,
     and a row edited in between is a new one. */
  const pending = new WeakMap();
  function pendingId(row, k) {
    let ids = pending.get(row);
    if (!ids) pending.set(row, ids = new Map());
    if (!ids.has(k)) ids.set(k, crypto.randomUUID());
    return ids.get(k);
  }

  /* Child rows are matched by `key`, their content, so a row that did not
     change is neither written nor moved. New rows go in before the old ones
     come out, so a failure partway never loses a range; the insert skips an
     id already there, so sending it again never makes a second copy. With
     `order`, each row kept is then given its place on the page. */
  async function syncRows(client, table, { have, want, key, rowOf, order, landed }) {
    const now = have.map(r => ({ ...r }));
    const free = [...now];
    const kept = [];
    const fresh = [];
    want.forEach((w, index) => {
      const k = key(w);
      const at = free.findIndex(r => key(r) === k);
      if (at >= 0) kept.push({ row: free.splice(at, 1)[0], index });
      else fresh.push({ row: { ...rowOf(w, index), id: pendingId(w, k) }, index });
    });

    if (fresh.length) {
      const { error } = await client.from(table)
        .upsert(fresh.map(f => f.row), { onConflict: 'id', ignoreDuplicates: true });
      if (error) throw fail(error);
      now.push(...fresh.map(f => ({ ...f.row })));
      landed(now.map(r => ({ ...r })));
    }
    if (free.length) {
      const gone = free.map(r => r.id);
      const { error } = await client.from(table).delete().in('id', gone);
      if (error) throw fail(error);
      for (const id of gone) now.splice(now.findIndex(r => r.id === id), 1);
      landed(now.map(r => ({ ...r })));
    }
    if (order) {
      for (const { row, index } of kept) {
        if (row[order] === index) continue;
        const { error } = await client.from(table).update({ [order]: index }).eq('id', row.id);
        if (error) throw fail(error);
        now.find(r => r.id === row.id)[order] = index;
        landed(now.map(r => ({ ...r })));
      }
    }
    return now;
  }

  /* ══ The page ══════════════════════════════════════════════════════════ */
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  /* A status in a table's row, on every list page: Carbon's small tag, the
     size it gives a dense row. `colour` is the tag's colour class, written
     whole, such as `rux--tag--green`, so the class check can read it. */
  const statusTag = (label, colour) => {
    const tag = el('span', `rux--tag rux--layout--size-sm ${colour}`);
    tag.appendChild(el('span', 'rux--tag__label', label));
    return tag;
  };
  const svgUse = (href, size, viewBox, cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  /* ══ A dialog's fields ═════════════════════════════════════════════════
     Carbon's markup, built on each open, because a claimed date picker
     cannot be claimed again: a text field, a select of `[value, text]`
     pairs, and a range picker of a first and last day, which takes and shows
     ISO days as mm/dd/yyyy. A dialog's error line is `dialogError`. */
  function textField(id, label, value, placeholder) {
    const item = el('div', 'rux--form-item rux--text-input-wrapper');
    const lw = el('div', 'rux--text-input__label-wrapper');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    lw.appendChild(lab);
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = id;
    input.autocomplete = 'off';
    if (placeholder) input.placeholder = placeholder;
    input.value = value || '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    item.append(lw, outer);
    return item;
  }
  function selectField(id, label, value, options) {
    const item = el('div', 'rux--form-item');
    const box = el('div', 'rux--select');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--select-input__wrapper');
    const sel = el('select', 'rux--select-input');
    sel.id = id;
    for (const [v, t] of options) {
      const o = el('option', 'rux--select-option', t);
      o.value = v;
      o.selected = v === value;
      sel.appendChild(o);
    }
    wrap.append(sel, svgUse('#m-keyboard_arrow_down', '16', '0 0 16 16', 'rux--select__arrow'));
    box.append(lab, wrap);
    item.appendChild(box);
    return item;
  }
  // Each container class is written out in full for the class sweep.
  const DP_CONTAINER = {
    from: 'rux--date-picker-container rux--date-picker-container--from',
    to: 'rux--date-picker-container rux--date-picker-container--to',
  };
  function dpContainer(which, id, label, value) {
    const c = el('div', DP_CONTAINER[which]);
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    const input = el('input', 'rux--date-picker__input');
    input.type = 'text';
    input.id = id;
    input.autocomplete = 'off';
    input.placeholder = 'mm/dd/yyyy';
    input.value = window.Rux?.datePicker?.format?.(value ?? '') ?? (value || '');
    const icon = el('button', 'rux--date-picker__icon');
    icon.type = 'button';
    icon.setAttribute('aria-label', 'Open calendar');
    icon.tabIndex = -1;
    icon.appendChild(svgUse('#m-calendar_month', '16', '0 0 32 32'));
    span.append(input, icon);
    wrap.appendChild(span);
    c.append(lab, wrap);
    return c;
  }
  function calendarBody() {
    const cc = el('div', 'rux--date-picker__calendar-container rux--layer-two');
    cc.hidden = true;
    const cal = el('div', 'rux--date-picker__calendar');
    cal.setAttribute('role', 'grid');
    cal.setAttribute('aria-label', 'Calendar');
    cal.tabIndex = 0;
    const month = el('div', 'rux--date-picker__month');
    const prev = el('button', 'rux--date-picker__month-nav');
    prev.type = 'button'; prev.setAttribute('aria-label', 'Previous month');
    prev.appendChild(svgUse('#m-keyboard_arrow_left', '16', '0 0 16 16'));
    const next = el('button', 'rux--date-picker__month-nav');
    next.type = 'button'; next.setAttribute('aria-label', 'Next month');
    next.appendChild(svgUse('#m-keyboard_arrow_right', '16', '0 0 16 16'));
    month.append(prev, el('div', 'rux--date-picker__current-month'), next);
    const weekdays = el('div', 'rux--date-picker__weekdays');
    for (let i = 0; i < 7; i++) weekdays.appendChild(el('div', 'rux--date-picker__weekday'));
    cal.append(month, weekdays, el('div', 'rux--date-picker__days'));
    cc.appendChild(cal);
    return cc;
  }
  function dateRange(fromId, toId, fromLabel, toLabel, fromVal, toVal) {
    const range = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--range');
    range.append(dpContainer('from', fromId, fromLabel, fromVal), dpContainer('to', toId, toLabel, toVal), calendarBody());
    const item = el('div', 'rux--form-item');
    item.appendChild(range);
    return item;
  }
  function dialogError(id) {
    const error = el('div', 'rux--form__helper-text scheduler-dialog-error');
    error.id = id;
    error.hidden = true;
    error.setAttribute('role', 'alert');
    return error;
  }

  // Every class is written out in full: the class sweep reads the source.
  const NOTE = {
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#m-info-fill' },
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#m-error-fill' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#m-check_circle-fill' },
  };

  // Carbon's three-step sort: ascending, descending, then back to the page's own order.
  const NEXT = { none: 'ascending', ascending: 'descending', descending: 'none' };

  function page({ list, one }) {
    const id = part => `scheduler-${part}`;

    /* The notice over the list, Carbon's inline notification shown with a
       kind and hidden with none, says what the list is; the result of
       something just done, a save, a photo or a copy, is a toast. */
    const say = (kind, title, text) => {
      $(id(`${list}-notice`)).hidden = !kind;
      if (!kind) return;
      $(id(`${list}-notice-box`)).className = NOTE[kind].cls;
      $(id(`${list}-notice-icon`)).setAttribute('href', NOTE[kind].icon);
      $(id(`${list}-notice-title`)).textContent = title;
      $(id(`${list}-notice-text`)).textContent = text || '';
    };
    const result = (kind, text) => window.SchedulerToast.report(kind, text);

    /* The record's History link, in its title row: the History page narrowed
       to this record. A record not saved yet has no history, so no link. */
    const historyLink = recordId => {
      const link = $(id(`${one}-history`));
      if (!link) return;
      link.hidden = !recordId;
      link.href = recordId ? `history.html?record=${encodeURIComponent(recordId)}` : 'history.html';
      chatButton(link, recordId);
    };

    /* Send to chat, beside History: the team chat opens with this record as a
       link above its box. Shown for a saved record once the chat is on the
       page, which team-chat.js says when its person is read. */
    const CHAT_KINDS = ['customer', 'contact', 'driver', 'bus', 'location'];
    let chatFor = null;
    const chatButton = (history, recordId) => {
      if (!CHAT_KINDS.includes(one)) return;
      let btn = $(id(`${one}-chat`));
      if (!btn) {
        btn = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-pair-history', 'Send to chat');
        btn.type = 'button';
        btn.id = id(`${one}-chat`);
        btn.appendChild(svgUse('#m-chat', '16', '0 0 32 32', 'rux--btn__icon'));
        btn.addEventListener('click', () => window.SchedulerTeamChat?.share({ kind: one, id: chatFor }));
        history.after(btn);
        document.addEventListener('scheduler:team-chat-ready', () => { btn.hidden = !chatFor; });
      }
      chatFor = recordId ?? null;
      btn.hidden = !recordId || !window.SchedulerTeamChat;
    };

    // Cancel and Save stack on a phone, as Carbon's stacked button set does.
    const narrow = matchMedia('(max-width: 41.98rem)');
    const stackButtons = () => document.querySelector('.scheduler-pair-buttons')
      ?.classList.toggle('rux--btn-set--stacked', narrow.matches);
    stackButtons();
    narrow.addEventListener('change', stackButtons);

    /* The list's search, sort and rows. `state` holds the search and the
       sort, which `draw` reads; every change draws the list again. `open`
       names where a row goes, its own record unless the page says else. */
    function table({ sortKey, sortDir = 'ascending', draw,
      open = tr => `${list}.html?id=${encodeURIComponent(tr.dataset.id)}` }) {
      const state = { query: '', sortKey, sortDir };

      // A click anywhere on a row opens its record; the name is the link a
      // keyboard reaches.
      $(id(`${list}-rows`))?.addEventListener('click', e => {
        const tr = e.target.closest('tr[data-id]');
        if (!tr || e.target.closest('a')) return;
        location.href = open(tr);
      });

      document.querySelector(`#${id(`${list}-list`)} thead`)?.addEventListener('click', e => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        const dir = state.sortKey === th.dataset.sort ? NEXT[state.sortDir] : 'ascending';
        state.sortKey = th.dataset.sort;
        state.sortDir = dir;
        for (const other of document.querySelectorAll(`#${id(`${list}-list`)} th[data-sort]`)) {
          const on = other === th && dir !== 'none';
          other.setAttribute('aria-sort', on ? dir : 'none');
          const button = other.querySelector('.rux--table-sort');
          button.classList.toggle('rux--table-sort--active', on);
          button.classList.toggle('rux--table-sort--descending', on && dir === 'descending');
        }
        draw();
      });

      // Design's form controls keep the clear button: it shows while the field
      // holds text, and it and Escape empty the field and send this `input`.
      const searchInput = $(id(`${list}-search`));
      searchInput?.addEventListener('input', () => {
        state.query = searchInput.value.trim();
        draw();
      });

      // What the search came to, in the band beside it.
      state.count = (shown, all) => {
        const note = $(id(`${list}-count`));
        if (note) note.textContent = state.query ? `${shown} of ${all} match` : '';
      };
      return state;
    }

    /* A text field's error, as Carbon's invalid state draws it: the red
       outline, the icon and the message under the field. An empty message
       clears it. */
    function textError(input, errorId, message) {
      const wrap = input.closest('.rux--text-input__field-wrapper');
      const on = !!message;
      input.classList.toggle('rux--text-input--invalid', on);
      input.toggleAttribute('data-invalid', on);
      wrap.toggleAttribute('data-invalid', on);
      if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', errorId);
      let icon = wrap.querySelector('.rux--text-input__invalid-icon');
      if (on && !icon) {
        icon = svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--text-input__invalid-icon');
        wrap.prepend(icon);
      }
      if (!on) icon?.remove();
      $(errorId).textContent = message;
    }
    // The same for a combo box, whose icon sits in its field.
    function comboError(input, errorId, message) {
      const root = input?.closest('.rux--list-box');
      const req = $(errorId);
      if (!root || !req) return;
      const on = !!message;
      root.toggleAttribute('data-invalid', on);
      if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', req.id);
      let icon = root.querySelector('.rux--list-box__invalid-icon');
      if (on && !icon) {
        icon = svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--list-box__invalid-icon');
        root.querySelector('.rux--list-box__field').appendChild(icon);
      }
      if (!on) icon?.remove();
      req.textContent = message;
    }

    /* Leaving with unsaved changes, and a conflict found by Save. A link
       away asks first; its Save keeps the leaving action through the close,
       so a conflict found by that save can still finish it, and any other
       close drops it. `others` are the page's other modals with links in
       them, closed before a link in one asks, so their closing does not drop
       the action just asked for. `hold()` gives another modal's Save the same
       carry as the conflict modal's; `leave()` is a departure nothing should
       stop, such as after a delete. */
    function guard({ editing, dirty, save, reload, others = [] }) {
      let afterSave = null;
      let keepAfter = false;
      let leaving = false;
      const conflictModal = $(id(`${one}-conflict-modal`));
      const unsavedModal = $(id(`${one}-unsaved-modal`));

      function hold(modal, button, run) {
        $(button)?.addEventListener('click', async () => {
          const next = afterSave;
          keepAfter = true;
          window.Rux?.modal?.close?.(modal);
          keepAfter = false;
          afterSave = null;
          if (await run()) next?.();
        });
        $(modal)?.addEventListener('rux:modal-closed', () => {
          if (!keepAfter) afterSave = null;
        });
      }
      hold(id(`${one}-conflict-modal`), id(`${one}-conflict-save`), () => save(true));
      $(id(`${one}-conflict-reload`))?.addEventListener('click', async () => {
        window.Rux?.modal?.close?.(conflictModal);
        afterSave = null;
        try { await reload(); result('info', `Showing the ${one} as it is now.`); } catch { result('error', `The ${one} didn't reload. Reload the page.`); }
      });

      document.addEventListener('click', e => {
        const a = e.target.closest('a[href]');
        if (!a || !editing || leaving || !dirty()) return;
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
        e.preventDefault();
        for (const other of others) window.Rux?.modal?.close?.(other);
        afterSave = () => { leaving = true; location.href = a.href; };
        window.Rux?.modal?.open?.(unsavedModal);
      });
      $(id(`${one}-unsaved-discard`))?.addEventListener('click', () => {
        const next = afterSave;
        afterSave = null;
        window.Rux?.modal?.close?.(unsavedModal);
        next?.();
      });
      $(id(`${one}-unsaved-save`))?.addEventListener('click', async () => {
        const next = afterSave;
        keepAfter = true;
        window.Rux?.modal?.close?.(unsavedModal);
        keepAfter = false;
        afterSave = next;
        if (await save()) { afterSave = null; next?.(); }
      });
      unsavedModal?.addEventListener('rux:modal-closed', () => { if (!keepAfter) afterSave = null; });
      window.addEventListener('beforeunload', e => {
        if (editing && !leaving && dirty()) { e.preventDefault(); e.returnValue = ''; }
      });

      return {
        conflict: () => window.Rux?.modal?.open?.(conflictModal),
        hold,
        leave: href => { leaving = true; location.href = href; },
      };
    }

    /* The same staff gate as the schedule: the page waits for the staff
       profile, and an account without one, a profile that would not load, or
       a local preview other than the cloud preview gets a notice instead.
       `run` gets the signed-in client; a read it throws is said as one. */
    async function start(run) {
      const account = window.Rux?.account;
      if (!account?.staffProfile) {
        say('info', 'This preview has no log-in', `Open http://localhost:8641/, the cloud preview, to load the ${list}.`);
        return;
      }
      let staff;
      try { staff = await account.staffProfile(); } catch {
        say('error', `The ${list} didn't load`, 'Reload the page to try again.');
        return;
      }
      if (!staff) {
        say('info', "This account isn't set up as staff yet", 'Ask the owner to set it up.');
        return;
      }
      try {
        await run(account.client);
      } catch {
        say('error', `The ${list} didn't load`, 'Reload the page to try again.');
      }
    }

    return { say, result, table, textError, comboError, guard, start, historyLink };
  }

  window.SchedulerPair = { saveRecord, syncRows, page, $, el, svgUse, statusTag, textField, selectField, dateRange, dialogError };
})();
