/* ==========================================================================
   Rux Scheduler — AWAY, a driver's time off and a bus's days out
   --------------------------------------------------------------------------
   One dialog for each, written once. The Drivers and Fleet pages open it from
   a record, where Done puts the range on the page for the page's Save; the
   board opens it from a driver's or a bus's menu, where Done saves the range
   at once through `add`, which writes it as the page's Save does.

   `open(kind, { row, title, trigger, done })` opens the dialog for `kind`,
   'driver' or 'bus': `row` is the range being edited, or none for a new one,
   `title` the heading in place of the kind's own, and `done(row)` takes the
   range as the database stores it, without its owner. While a `done` that
   returns a promise is working the dialog waits; one that throws keeps it
   open and says it did not save.

   `add(client, kind, ownerId, row)` reads the owner's ranges, puts the new
   one among them in date order and writes them with pair.js's `syncRows`,
   their places included, as the record page's Save does.

   `REASONS` and `reasonText` are time off's reasons, which the Drivers page
   lists the ranges by.

   Needs pair.js, and Design's modal.js and date-picker.js, loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const { el, svgUse, textField, selectField, dateRange, dialogError, syncRows } = window.SchedulerPair;

  const REASONS = [['vacation', 'Vacation'], ['sick', 'Sick'], ['personal', 'Personal'], ['suspended', 'Suspended'], ['other', 'Other']];
  const reasonText = r => REASONS.find(([v]) => v === r)?.[1] || (r ? r : 'Time off');

  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  // A date field's day as ISO, or null; the picker shows mm/dd/yyyy.
  const fieldDay = v => window.Rux?.datePicker?.toISO?.(v)
    ?? (ISO.test(String(v ?? '').trim()) ? String(v).trim() : null);
  const day = v => String(v).slice(0, 10);

  /* Each kind: its table and owner column, its headings, its fields and how
     to read them, and a range's content, which `syncRows` matches rows by.
     Time off keeps each range's place as `position`; days out have none. */
  const KINDS = {
    driver: {
      table: 'driver_time_off', owner: 'driver_id', order: 'position',
      columns: 'id,start_date,end_date,reason,notes,position',
      heading: ['Add time off', 'Edit time off'],
      fields: r => [selectField('scheduler-away-reason', 'Reason', r ? r.reason || 'other' : 'vacation', REASONS),
        textField('scheduler-away-notes', 'Notes', r?.notes)],
      read: () => ({ reason: document.getElementById('scheduler-away-reason').value || null,
        notes: document.getElementById('scheduler-away-notes').value.trim() || null }),
      key: r => JSON.stringify([r.start_date, r.end_date, r.reason || null, r.notes || null]),
      rowOf: owner => (r, position) => ({ driver_id: owner, position, start_date: r.start_date, end_date: r.end_date,
        reason: r.reason || null, notes: r.notes || null }),
    },
    bus: {
      table: 'bus_out_of_service', owner: 'bus_id', order: null,
      columns: 'id,start_date,end_date,reason',
      heading: ['Add days out', 'Edit days out'],
      // The reason is stored as free text, so it stays a text field.
      fields: r => [textField('scheduler-away-reason', 'Reason', r?.reason, 'Optional')],
      read: () => ({ reason: document.getElementById('scheduler-away-reason').value.trim() || null }),
      key: r => JSON.stringify([r.start_date, r.end_date, r.reason || null]),
      rowOf: owner => r => ({ bus_id: owner, start_date: r.start_date, end_date: r.end_date, reason: r.reason || null }),
    },
  };

  /* The dialog, made once on the page that first opens it. It does not
     scroll, so the calendar can open past its edge. */
  let modal = null;
  let doneFor = null;
  function dialog() {
    if (modal) return modal;
    modal = el('div', 'rux--layer-one rux--modal scheduler-modal--has-calendar');
    modal.id = 'scheduler-away-modal';
    modal.setAttribute('role', 'presentation');
    const box = el('div', 'rux--modal-container rux--modal-container--sm');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'scheduler-away-h');
    box.tabIndex = -1;
    const head = el('div', 'rux--modal-header');
    const h = el('h2', 'rux--modal-header__heading');
    h.id = 'scheduler-away-h';
    const closeWrap = el('div', 'rux--modal-close-button');
    const close = el('button', 'rux--modal-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.setAttribute('data-rux-close', '');
    close.appendChild(svgUse('#m-close', '20', '0 0 32 32', 'rux--modal-close__icon'));
    closeWrap.appendChild(close);
    head.append(h, closeWrap);
    const content = el('div', 'rux--modal-content');
    content.id = 'scheduler-away-fields';
    const foot = el('div', 'rux--modal-footer');
    const cancel = el('button', 'rux--btn rux--btn--secondary', 'Cancel');
    cancel.type = 'button';
    cancel.setAttribute('data-rux-close', '');
    const done = el('button', 'rux--btn rux--btn--primary', 'Done');
    done.type = 'button';
    done.id = 'scheduler-away-done';
    done.addEventListener('click', () => doneFor?.());
    foot.append(cancel, done);
    box.append(head, content, foot);
    modal.appendChild(box);
    document.body.appendChild(modal);
    return modal;
  }

  function open(kind, { row = null, title = null, trigger = null, done }) {
    const k = KINDS[kind];
    dialog();
    document.getElementById('scheduler-away-h').textContent = title ?? k.heading[row ? 1 : 0];
    const error = dialogError('scheduler-away-error');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-6');
    stack.append(dateRange('scheduler-away-start', 'scheduler-away-end', 'First day', 'Last day', row?.start_date, row?.end_date),
      error, ...k.fields(row));
    const host = document.getElementById('scheduler-away-fields');
    host.replaceChildren(stack);
    window.Rux?.datePicker?.init?.(host);
    const doneBtn = document.getElementById('scheduler-away-done');
    doneBtn.disabled = false;
    const say = words => { error.textContent = words; error.hidden = false; };

    doneFor = async () => {
      const start = fieldDay(document.getElementById('scheduler-away-start').value);
      // A blank last day is the first day: the picker clears it on a first pick.
      const endText = document.getElementById('scheduler-away-end').value.trim();
      const end = endText ? fieldDay(endText) : start;
      if (!start || !end) { say('Pick the first and last day.'); return; }
      const picked = { start_date: start <= end ? start : end, end_date: start <= end ? end : start, ...k.read() };
      doneBtn.disabled = true;
      try {
        await done(picked);
      } catch {
        doneBtn.disabled = false;
        say("It didn't save. Try again.");
        return;
      }
      window.Rux?.modal?.close?.('scheduler-away-modal');
    };
    window.Rux?.modal?.open?.('scheduler-away-modal', trigger);
  }

  async function add(client, kind, owner, row) {
    const k = KINDS[kind];
    const read = await client.from(k.table).select(k.columns).eq(k.owner, owner).order(k.order ?? 'start_date');
    if (read.error) throw read.error;
    const have = (read.data || []).map(r => ({ ...r, start_date: day(r.start_date), end_date: day(r.end_date) }));
    const want = [...have, row].sort((a, b) => a.start_date.localeCompare(b.start_date));
    await syncRows(client, k.table, { have, want, key: k.key, order: k.order, rowOf: k.rowOf(owner), landed: () => {} });
  }

  window.SchedulerAway = { open, add, REASONS, reasonText };
})();
