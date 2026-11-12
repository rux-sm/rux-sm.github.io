/* ==========================================================================
   driver-forms.js — THE FORMS DRIVERS SIGN, THE OFFICE'S SIDE
   --------------------------------------------------------------------------
   A form is on a driver's link only while that driver is asked for it: a
   row of `driver_form_asks`, or the form's `ask_everyone`. This draws the
   three places the office sets that and reads where each form stands, all
   from get_driver_forms_overview, the rule the link itself keeps:

     drivers.html, the Forms tab   one row a form: how many drivers are
                                   asked, how many of those signed, and how
                                   many still have it to sign
     drivers.html?form=<id>        one form: Ask every driver, and its
                                   drivers under To sign, Ends soon, Signed
                                   and Not asked, each with their switch
     drivers.html?id=<id>          a driver's Documents tab: every form with
                                   its switch, for an active driver

   A form stands one of four ways for a driver:

     To sign    asked and not signed, sent or not, or sent again since
     Ends soon  a yearly copy ending within 30 days
     Signed     the copy on file, which Open shows
     Not asked  not on their link, whatever was signed before

   A switch saves as it is flipped and the view is read again, so it shows
   what the link holds. Send opens one row a driver with the text in their
   language; Copy the text records the send through send_driver_forms, which
   asks for the form, keeps their link live and copies the text with that
   link in it, to paste into Messages. A flagged signing heads the Forms tab
   until Mark as read, so the office reads it before a school gets it.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse, toggle } = window.SchedulerPair;
  const Text = window.SchedulerDriverText;
  const params = new URLSearchParams(location.search);
  const formId = params.get('form');
  // A driver's own page, or one being made, which draws once it is saved.
  const onProfile = params.has('id') || params.has('new');

  let client = null;
  let drivers = [];      // active drivers, by name
  let forms = [];        // current forms, by title
  let cells = new Map(); // `${driver}:${form}` -> the overview row
  let flags = [];        // flagged signings not yet read
  let profile = null;    // the driver whose page this is, once it is read

  const day = v => new Date(String(v).length === 10 ? `${v}T12:00:00` : v)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const first = d => d.short_name || String(d.name || '').split(' ')[0];
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const TAG = {
    blue: 'rux--tag rux--tag--blue rux--layout--size-md',
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
  const report = text => window.SchedulerToast?.report('error', text);

  /* WHERE A FORM STANDS FOR A DRIVER: its group, `sign`, `ends`, `signed` or
     `off`, the words under its row, the overview's row and a flagged signing
     not yet read. */
  function standing(d, f) {
    const c = cells.get(`${d.id}:${f.id}`) ?? {};
    const flag = flags.find(s => s.driver_id === d.id && s.form_id === f.id) ?? null;
    const signed = !!c.signedAt && !!c.documentId;
    const ends = c.endsOn ? ` · ends ${day(c.endsOn)}` : '';
    if (!c.asked) return { group: 'off', c, flag, words: signed ? `Signed ${day(c.signedAt)} · not on their link` : 'Not on their link' };
    if (!c.waiting) return { group: 'signed', c, flag, words: `Signed ${day(c.signedAt)}${ends}` };
    if (signed && c.endsOn && !(c.sentAt > c.signedAt)) return { group: 'ends', c, flag, words: `Signed ${day(c.signedAt)}${ends}` };
    return { group: 'sign', c, flag, words: c.sentAt ? `Sent ${day(c.sentAt)}` : 'Not sent yet' };
  }
  // A form still owed: to sign, or ending soon.
  const owed = (d, f) => ['sign', 'ends'].includes(standing(d, f).group);
  const owedBy = d => forms.filter(f => owed(d, f));

  // -- the switches ---------------------------------------------------------------
  const askId = (d, f) => `scheduler-ask-${f.id}-${d.id}`;
  /* Reads everything again and draws, then puts focus back on the switch
     that was flipped, which the new drawing made again. */
  async function again(focusId) {
    try { await load(); } catch { report("The forms didn't read back. Reload the page to see them."); }
    if (focusId) document.getElementById(focusId)?.focus();
  }
  async function ask(d, f, on) {
    const r = on
      ? await client.from('driver_form_asks').upsert({ form_id: f.id, driver_id: d.id }, { onConflict: 'form_id,driver_id', ignoreDuplicates: true })
      : await client.from('driver_form_asks').delete().eq('form_id', f.id).eq('driver_id', d.id);
    if (r.error) report("The switch didn't save. It shows the driver's link as it is.");
    await again(askId(d, f));
  }
  async function askEveryone(f, on) {
    const { error } = await client.rpc('ask_every_driver', { p_form_id: f.id, p_on: on });
    if (error) report("The switch didn't save. It shows the form as it is.");
    await again('scheduler-ask-everyone');
  }

  /* ONE DRIVER AND ONE FORM, a row: its name, the driver's on a form's view
     and the form's on a driver's, where it stands, Open for a copy on file,
     Send while it can be asked for, and the switch that puts it on the
     driver's link, which a form asking everyone holds on. */
  function pairRow(d, f, name, href) {
    const s = standing(d, f);
    const li = el('li', 'rux--contained-list-item');
    const row = el('div', 'rux--contained-list-item__content scheduler-forms-pair');
    const words = el('div', 'scheduler-pair-item');
    const title = el(href ? 'a' : 'span', href ? 'rux--link scheduler-pair-item__main' : 'scheduler-pair-item__main', name);
    if (href) title.href = href;
    words.append(title, el('span', 'scheduler-pair-item__detail', s.words));
    const actions = el('div', 'scheduler-forms-pair__actions');
    if (s.flag) actions.appendChild(tag('red', '#m-warning-fill', 'Answered Yes'));
    const copy = s.flag?.document_id ?? (s.c.signedAt ? s.c.documentId : null);
    if (copy) actions.appendChild(openLink(copy));
    if (s.group !== 'off') {
      const send = ghost(s.group === 'sign' && !s.c.sentAt || s.group === 'ends' ? 'Send' : 'Send again', () => openSend([d], [f]));
      send.setAttribute('data-rux-open', 'scheduler-forms-send');
      actions.appendChild(send);
    }
    const sw = toggle(askId(d, f), `${f.title} on ${d.name}'s link`, !!s.c.asked, { disabled: !!f.ask_everyone });
    sw.addEventListener('rux:toggle', e => ask(d, f, e.detail.on));
    actions.appendChild(sw);
    row.append(words, actions);
    li.appendChild(row);
    return li;
  }
  const listOf = (size, rows) => {
    const box = el('div', size === 'lg' ? 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page'
      : 'rux--contained-list rux--layout--size-md rux--contained-list--on-page');
    const ul = el('ul');
    ul.setAttribute('role', 'list');
    ul.append(...rows);
    box.appendChild(ul);
    return box;
  };

  // -- the Forms tab: one row a form --------------------------------------------------
  /* How many drivers a form asks, how many of those signed, and how many
     still owe it. */
  function tally(f) {
    const each = drivers.map(d => standing(d, f).group);
    const asked = each.filter(g => g !== 'off').length;
    return { asked, signed: each.filter(g => g === 'signed').length, owed: each.filter(g => g === 'sign' || g === 'ends').length };
  }
  const askedWords = (f, t) => (f.ask_everyone ? 'Every driver asked' : t.asked ? `${t.asked} of ${plural(drivers.length, 'driver')} asked` : 'Nobody asked');
  function formRow(f) {
    const t = tally(f);
    const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
    const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
    a.href = `drivers.html?form=${encodeURIComponent(f.id)}`;
    // Carbon lays a clickable item's content out itself, so the row's parts
    // stand in a box of their own.
    const row = el('div', 'scheduler-forms-row');
    const words = el('div', 'scheduler-pair-item scheduler-forms-row__words');
    words.append(el('span', 'scheduler-pair-item__main', f.title),
      el('span', 'scheduler-pair-item__detail', `${f.yearly ? 'Yearly' : 'Once'} · ${askedWords(f, t)}`));
    row.appendChild(words);
    if (t.owed) { const owes = tag('blue', '#m-pending-fill', `${t.owed} to sign`); owes.classList.add('scheduler-forms-row__owed'); row.appendChild(owes); }
    if (t.asked) {
      // Carbon's small progress bar: its label, then how far along.
      const bar = el('div', 'rux--progress-bar rux--progress-bar--small scheduler-forms-row__count');
      const label = el('div', 'rux--progress-bar__label');
      label.appendChild(el('span', 'rux--progress-bar__label-text', `${t.signed} of ${t.asked} signed`));
      const track = el('div', 'rux--progress-bar__track');
      const fill = el('div', 'rux--progress-bar__bar');
      fill.style.transform = `scaleX(${t.signed / t.asked})`;
      track.appendChild(fill);
      bar.append(label, track);
      row.appendChild(bar);
    }
    const go = svgUse('#m-keyboard_arrow_right', '20', '0 0 32 32', 'scheduler-forms-row__go');
    row.appendChild(go);
    a.appendChild(row);
    li.appendChild(a);
    return li;
  }
  function drawTab() {
    $('scheduler-forms-list').replaceChildren(...forms.map(formRow));
    const owing = drivers.filter(d => owedBy(d).length);
    $('scheduler-forms-count').textContent = owing.length
      ? `${plural(owing.length, 'driver')} ${owing.length === 1 ? 'has' : 'have'} a form to sign` : 'Every form asked for is signed';
    const send = $('scheduler-forms-send-all');
    send.hidden = !owing.length;
    send.firstChild.textContent = `Send to all ${owing.length}`;
    $('scheduler-forms-empty').hidden = forms.length > 0;
    $('scheduler-forms-box').hidden = !forms.length;
    $('scheduler-forms-bar').hidden = !forms.length;
    drawFlags();
    $('scheduler-drivers-tabs').hidden = false;
  }

  // -- one form ------------------------------------------------------------------------
  const GROUPS = [['sign', 'To sign'], ['ends', 'Ends soon'], ['signed', 'Signed'], ['off', 'Not asked']];
  function drawForm() {
    const f = forms.find(x => x.id === formId);
    // A form retired or mistyped has no view; the tab lists the current ones.
    if (!f) { location.replace('drivers.html#forms'); return; }
    const t = tally(f);
    $('scheduler-form-h').textContent = f.title;
    document.title = `${f.title} — Scheduler`;
    $('scheduler-form-line').textContent = [f.yearly ? 'Yearly' : 'Once', askedWords(f, t), t.asked ? `${t.signed} signed` : null].filter(Boolean).join(' · ');
    const everyone = toggle('scheduler-ask-everyone', 'Ask every driver', !!f.ask_everyone, { shown: true });
    everyone.addEventListener('rux:toggle', e => askEveryone(f, e.detail.on));
    $('scheduler-form-everyone').replaceChildren(everyone);
    $('scheduler-form-everyone-help').hidden = !f.ask_everyone;
    const owing = drivers.filter(d => owed(d, f));
    const send = $('scheduler-form-send');
    send.hidden = !owing.length;
    send.firstChild.textContent = `Send to all ${owing.length}`;
    send.onclick = () => openSend(owing, [f]);
    $('scheduler-form-groups').replaceChildren(...GROUPS.map(([group, title]) => {
      const mine = drivers.filter(d => standing(d, f).group === group);
      if (!mine.length) return null;
      const section = el('section', 'rux--stack-vertical rux--stack-scale-4 scheduler-pair-group');
      section.append(el('h2', 'rux--type-heading-compact-02', `${title} (${mine.length})`),
        listOf('md', mine.map(d => pairRow(d, f, d.name, `drivers.html?id=${encodeURIComponent(d.id)}#documents`))));
      return section;
    }).filter(Boolean));
    $('scheduler-form').hidden = false;
  }

  // -- a driver's Documents tab ----------------------------------------------------------
  function drawProfile() {
    const section = $('scheduler-driver-forms-section');
    const d = profile && drivers.find(x => x.id === profile.id);
    // Forms go to active drivers only, and an inactive one has no link.
    section.hidden = !d || !forms.length;
    if (section.hidden) return;
    $('scheduler-driver-forms').replaceChildren(...forms.map(f => pairRow(d, f, f.title)));
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
        if (error) { report("It wasn't marked as read. Try again."); return; }
        flags = flags.filter(x => x.id !== s.id);
        draw();
      });
      box.append(details, open, read);
      return box;
    }));
  }

  // -- sending --------------------------------------------------------------------
  /* One row a driver: who, the forms, and Copy the text, which records the
     send, asks for the forms, keeps their link live and copies the text
     with it. `only` names the forms; without it each driver gets every form
     they owe. */
  function openSend(list, only) {
    const body = $('scheduler-forms-send-body');
    $('scheduler-forms-send-h').textContent = list.length === 1 ? `Send forms to ${list[0].name}` : `Send to ${plural(list.length, 'driver')}`;
    body.replaceChildren(...list.map(d => {
      const these = only ?? owedBy(d);
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
          report("The forms weren't sent. Try again.");
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
  $('scheduler-forms-send-all').addEventListener('click', () => openSend(drivers.filter(d => owedBy(d).length)));
  $('scheduler-form-send').setAttribute('data-rux-open', 'scheduler-forms-send');

  // -- loading ------------------------------------------------------------------------
  const draw = () => (formId ? drawForm() : onProfile ? drawProfile() : drawTab());
  async function load() {
    const [overview, people, current, flagged] = await Promise.all([
      client.rpc('get_driver_forms_overview'),
      client.from('drivers').select('id,name,short_name,language').eq('status', 'active').order('name'),
      client.from('driver_forms').select('id,title,title_es,yearly,ask_everyone').is('retired_at', null).order('title'),
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
  }

  /* A driver's page says which driver it has read, when it loads and after
     each save, since a save can make a driver or set one Inactive. */
  document.addEventListener('scheduler:driver-loaded', e => {
    profile = e.detail;
    if (client) load().catch(() => {});
  });

  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) return;
    try { if (!(await account.staffProfile())) return; } catch { return; }
    client = account.client;
    // A driver's page waits for its driver; the list and a form read now.
    if (onProfile && !profile) return;
    try {
      await load();
      // The breadcrumb of a form's view comes back to the tab it was opened from.
      if (!formId && !onProfile && location.hash === '#forms') {
        const tab = $('scheduler-drivers-tab-forms');
        window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
      }
    } catch {
      // The Forms tab stays hidden, and the list says what failed; a form's own view says so itself.
      if (formId) report("The form didn't load. Reload the page to try again.");
    }
  })();
})();
