/* ==========================================================================
   driver-forms.js — THE DRIVERS PAGE'S FORMS TAB
   --------------------------------------------------------------------------
   Every active driver against every current form a driver signs on their
   link, each cell saying where it stands, by get_driver_forms_overview, the
   rule the link itself keeps:

     Signed        the copy on file, which Open shows
     Ends soon     a yearly copy ending within 30 days
     Waiting       sent and not signed since
     Not sent      never sent, and not signed
     Answered Yes  signed with an answer the form flags, until it is read

   Send on any cell, or Send to everyone waiting, opens one row a driver with
   the text in their language; Copy the text records the send through
   send_driver_forms, which also keeps their link live, and copies the text
   with that link in it, to paste into Messages. A flagged signing heads the
   tab until Mark as read, so the office reads it before a school gets it.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse } = window.SchedulerPair;
  const Text = window.SchedulerDriverText;
  const params = new URLSearchParams(location.search);
  // The list's tab only; a driver's own page has its Documents tab.
  if (params.get('id') || params.has('new')) return;

  let client = null;
  let drivers = [];     // active drivers, by name
  let forms = [];       // current forms
  let cells = new Map(); // `${driver}:${form}` -> the overview row
  let flags = [];       // flagged signings not yet read

  const day = v => new Date(String(v).length === 10 ? `${v}T12:00:00` : v)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const first = d => d.short_name || String(d.name || '').split(' ')[0];
  const TAG = {
    green: 'rux--tag rux--tag--green rux--layout--size-md',
    magenta: 'rux--tag rux--tag--magenta rux--layout--size-md',
    blue: 'rux--tag rux--tag--blue rux--layout--size-md',
    gray: 'rux--tag rux--tag--gray rux--layout--size-md',
    red: 'rux--tag rux--tag--red rux--layout--size-md',
  };
  const tag = (colour, iconId, text) => {
    const t = el('span', TAG[colour]);
    if (iconId) t.appendChild(svgUse(iconId, '16', '0 0 32 32', 'rux--tag__custom-icon'));
    t.appendChild(el('span', 'rux--tag__label', text));
    return t;
  };
  const ghost = (text, onClick) => {
    const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };
  const openLink = id => {
    const a = el('a', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Open');
    a.href = `documents.html?open=${encodeURIComponent(id)}`;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  };
  const waitingFor = d => forms.filter(f => cells.get(`${d.id}:${f.id}`)?.waiting);

  // -- one cell -----------------------------------------------------------------
  function cell(d, f) {
    const c = cells.get(`${d.id}:${f.id}`) ?? {};
    const box = el('div', 'scheduler-form-cell');
    const when = text => el('span', 'scheduler-form-cell__when rux--type-body-compact-01', text);
    const send = text => {
      const b = ghost(text, () => openSend([d], [f]));
      b.setAttribute('data-rux-open', 'scheduler-forms-send');
      return b;
    };
    const unread = flags.find(s => s.driver_id === d.id && s.form_id === f.id);
    if (unread) box.append(tag('red', '#m-warning-fill', 'Answered Yes'), when(`Signed ${day(unread.signed_at)}`), openLink(unread.document_id));
    else if (!c.waiting) box.append(tag('green', '#m-check_circle-fill', `Signed ${day(c.signedAt)}`), openLink(c.documentId), send('Send again'));
    else if (c.signedAt && c.endsOn && !(c.sentAt > c.signedAt)) box.append(tag('magenta', '#m-schedule', `Ends ${day(c.endsOn)}`), send('Send'));
    else if (c.sentAt) box.append(tag('blue', '#m-pending-fill', 'Waiting'), when(`Sent ${day(c.sentAt)}`), send('Send again'));
    else box.append(tag('gray', null, 'Not sent'), send('Send'));
    const td = el('td');
    td.appendChild(box);
    return td;
  }

  function draw() {
    const head = $('scheduler-forms-head');
    head.replaceChildren(...['Driver', ...forms.map(f => f.title)].map(t => {
      const th = el('th');
      th.scope = 'col';
      th.appendChild(el('div', 'rux--table-header-label', t));
      return th;
    }));
    $('scheduler-forms-rows').replaceChildren(...drivers.map(d => {
      const tr = el('tr');
      const who = el('td');
      who.append(el('div', 'rux--type-heading-compact-01', d.name), el('div', 'rux--type-body-compact-01 scheduler-form-cell__when', d.language === 'es' ? 'Spanish' : 'English'));
      tr.appendChild(who);
      for (const f of forms) tr.appendChild(cell(d, f));
      return tr;
    }));
    const waiting = drivers.filter(d => waitingFor(d).length).length;
    $('scheduler-forms-count').textContent = waiting ? `${waiting} waiting` : 'Everyone has signed';
    $('scheduler-forms-send-all').disabled = !waiting;
    $('scheduler-forms-empty').hidden = forms.length > 0;
    $('scheduler-forms-table').hidden = !forms.length;
    drawFlags();
  }

  // -- a Yes to read --------------------------------------------------------------
  function drawFlags() {
    $('scheduler-forms-flags').replaceChildren(...flags.map(s => {
      const d = drivers.find(x => x.id === s.driver_id);
      const f = forms.find(x => x.id === s.form_id);
      const box = el('div', 'rux--inline-notification rux--inline-notification--warning');
      box.setAttribute('role', 'status');
      const details = el('div', 'rux--inline-notification__details');
      const text = el('div', 'rux--inline-notification__text-wrapper');
      text.append(el('div', 'rux--inline-notification__title', `${d?.name ?? 'A driver'} answered Yes on the ${f?.title ?? 'form'}`),
        el('div', 'rux--inline-notification__subtitle', `Signed ${day(s.signed_at)}. Read it before it goes to a school.`));
      details.append(svgUse('#m-warning-fill', '20', '0 0 32 32', 'rux--inline-notification__icon'), text);
      const open = el('a', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm rux--inline-notification__action-button', 'Open the PDF');
      open.href = `documents.html?open=${encodeURIComponent(s.document_id)}`;
      open.target = '_blank';
      open.rel = 'noopener';
      const read = el('button', 'rux--inline-notification__close-button');
      read.type = 'button';
      read.setAttribute('aria-label', 'Mark as read');
      read.title = 'Mark as read';
      read.appendChild(svgUse('#m-close', '16', '0 0 32 32', 'rux--inline-notification__close-icon'));
      read.addEventListener('click', async () => {
        const { error } = await client.rpc('read_driver_form_flag', { p_signing_id: s.id });
        if (error) { window.SchedulerToast?.report('error', "It wasn't marked as read. Try again."); return; }
        flags = flags.filter(x => x.id !== s.id);
        draw();
      });
      box.append(details, open, read);
      return box;
    }));
  }

  // -- sending --------------------------------------------------------------------
  /* One row a driver: who, the forms, and Copy the text, which records the
     send, keeps their link live and copies the text with it. */
  function openSend(list, only) {
    const body = $('scheduler-forms-send-body');
    $('scheduler-forms-send-h').textContent = list.length === 1 ? `Send forms to ${list[0].name}` : 'Send to everyone waiting';
    body.replaceChildren(...list.map(d => {
      const these = only ?? waitingFor(d);
      const row = el('div', 'scheduler-forms-send-row');
      const words = el('div');
      words.append(el('p', 'rux--type-heading-compact-02', d.name),
        el('p', 'rux--type-body-compact-01 scheduler-form-cell__when', `${these.map(f => f.title).join(', ')} · in ${d.language === 'es' ? 'Spanish' : 'English'}`));
      const message = el('p', 'scheduler-forms-message rux--type-body-compact-01');
      message.hidden = true;
      const copy = el('button', 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm', 'Copy the text');
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        copy.disabled = true;
        const { data, error } = await client.rpc('send_driver_forms', { p_driver_id: d.id, p_form_ids: these.map(f => f.id) });
        if (error || !data?.token) {
          copy.disabled = false;
          window.SchedulerToast?.report('error', "The forms weren't sent. Try again.");
          return;
        }
        const titles = these.map(f => (data.language === 'es' ? f.title_es : f.title));
        message.textContent = Text.forms(first(d), titles, data.token, data.language);
        message.hidden = false;
        try { await navigator.clipboard.writeText(message.textContent); copy.textContent = 'Copied'; } catch { copy.textContent = 'Copy it from here'; }
        load().catch(() => {});
      });
      row.append(words, copy, message);
      return row;
    }));
  }
  $('scheduler-forms-send-all').setAttribute('data-rux-open', 'scheduler-forms-send');
  $('scheduler-forms-send-all').addEventListener('click', () => openSend(drivers.filter(d => waitingFor(d).length)));

  // -- loading ------------------------------------------------------------------------
  async function load() {
    const [overview, people, current, flagged] = await Promise.all([
      client.rpc('get_driver_forms_overview'),
      client.from('drivers').select('id,name,short_name,language').eq('status', 'active').order('name'),
      client.from('driver_forms').select('id,title,title_es').is('retired_at', null).order('title'),
      client.from('driver_form_signings').select('id,driver_id,form_id,document_id,signed_at')
        .eq('flagged', true).is('flag_read_at', null).order('signed_at', { ascending: false }),
    ]);
    const error = overview.error || people.error || current.error || flagged.error;
    if (error) throw error;
    drivers = people.data || [];
    forms = current.data || [];
    cells = new Map((overview.data || []).map(r => [`${r.driverId}:${r.formId}`, r]));
    flags = flagged.data || [];
    draw();
    $('scheduler-drivers-tabs').hidden = false;
  }

  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) return;
    try { if (!(await account.staffProfile())) return; } catch { return; }
    client = account.client;
    try { await load(); } catch { /* the tab stays hidden; the list says what failed */ }
  })();
})();
