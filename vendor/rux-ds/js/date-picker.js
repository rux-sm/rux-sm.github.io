/* ==========================================================================
   rux-ds — DATE PICKER (the --next variant: single, range, simple)
                                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js. Load after js/popover.js.

   THIS MODULE EXISTS BECAUSE CARBON SHIPS TWO DATE PICKERS AND ONLY ONE OF
   THEM CAN BE REBUILT HERE. Measured 2026-08-31 on
   react.carbondesignsystem.com:

     CLASSIC   components-datepicker--*. The calendar is rendered by
               FLATPICKR, a third-party library. Every calendar element
               carries BOTH `flatpickr-*` and `cds--date-picker__*`, and the
               open calendar matches 4 rules via flatpickr selectors and ZERO
               via the cds ones — `cds--date-picker__calendar` is a marker
               that styles nothing there. Rebuilding it would mean shipping
               flatpickr, which §1 declines.

     --next    preview-preview-datepicker--*. ZERO flatpickr elements on the
               page. Days are real <button type=button>, the calendar is
               `role=grid`, and all 64 calendar rules key on
               `.rux--date-picker--next` plus Carbon's own classes. THIS is
               what the module drives.

   THE CAPTURES COULD NOT TELL YOU THAT, and it is the reason the reference
   was widened before this was written. `tools/extract/react-dom.js` filters
   classes to the `cds--`/`c4p--` prefix, so the committed classic capture
   shows clean Carbon markup with its flatpickr dependency invisible. The two
   `preview-preview-datepicker--*@open` entries in
   `docs/carbon-react-states.json` are the reference this file was built
   against; the recipes that produce them are in the RECIPES table.

   THE SAME FILTER HIDES THE DAY STATE CLASSES. `selected`, `today`,
   `inRange`, `prevMonthDay`, `nextMonthDay`, `disabled` and `focused` are
   UNPREFIXED, so no capture records them and the CSS is the only reference
   for their names. They were read off `css/rux.css` — all seven appear as
   `.rux--date-picker--next .rux--date-picker__day.<state>` — and confirmed
   live, where a day reads `cds--date-picker__day prevMonthDay`.

   THE MARKUP IS THE API. A `.rux--date-picker--next` containing a
   `.rux--date-picker__calendar-container` is claimed on load; the module
   fills the calendar and owns it from there. No attribute to write — the
   trigger is `.rux--date-picker__icon` inside the same root, so the markup
   already relates them, which is the rule menu.js settled.

   THE CALENDAR IS NOT PORTALED, matching the reference: it sits inside the
   root as a sibling of the containers, and `__calendar-container` is what
   positions it — `position: absolute; inset-block-start: 100%` against the
   root, which Carbon sets `position: relative`. Carbon portals only the
   classic (flatpickr) calendar.

   NOTHING IN CARBON'S CSS HIDES A CLOSED CALENDAR, and the first two attempts
   at a closed state both failed. `.rux--date-picker__calendar` is
   `display: block` unconditionally and `.open` sets only
   `margin-block-start: 0`. React needs no hiding rule because it MOUNTS the
   container only while open.

   THE `hidden` ATTRIBUTE DOES NOT WORK HERE, and that is worth stating
   because it works everywhere else in this repository.
   `sink/dropdown.html` hides its menu with `<ul ... hidden>` and that is
   correct — the UA rule `[hidden] { display: none }` is unopposed there. It
   is OPPOSED here: `.rux--date-picker--next .rux--date-picker__calendar-container`
   sets `display: block` at specificity (0,2,0), which beats a UA rule, so the
   attribute is inert and the calendar shows regardless. Measured on the
   built page — `hidden` true, computed display `block`, box 288x348.

   SO THE MODULE DETACHES IT, which is what React does rather than a
   workaround for it. On claim the container is removed from the DOM and held
   on the closure; opening re-inserts it, closing removes it again. That also
   gets the AT behaviour right for free: a closed calendar is absent from the
   accessibility tree rather than merely invisible.

   THE CONSEQUENCE IS WORTH KNOWING: this component REQUIRES its module in a
   way most of the layer does not. Without `js/date-picker.js` the markup
   renders a permanently open calendar, because Carbon ships no closed state
   for a page to copy. The fragment and the templates carry the container so
   there is something to diff and something to attach; the module owns whether
   it is in the document.

   NOT DONE, and deliberately: no locale, no date parsing beyond ISO
   yyyy-mm-dd, no min/max, no disabled-date predicate. Carbon takes those as
   props on a React component; this layer makes the markup work, and a
   consumer that needs them owns the input's value. See the header note in
   js/form-controls.js for the same boundary.
   ========================================================================== */

/* BEHAVIOUR: verified-live · read 2026-08-31 on
   https://react.carbondesignsystem.com/iframe.html?id=preview-preview-datepicker--single-with-calendar
   and --range-with-calendar, calendar OPENED in both.
   Confirmed there, not inferred here: the calendar is role=grid with
   aria-label=Calendar and tabindex=0; days are <button type=button> with
   tabindex=-1 and an aria-label of the form "August 31, 2026"; today carries
   aria-current=date; the month nav are two <button aria-label="Previous
   month"/"Next month">; the grid is always 42 cells (6 weeks); range renders
   TWO containers, --from and --to, sharing ONE calendar.
   NOT VERIFIED LIVE: the keyboard model. No key was pressed on the running
   Carbon picker, so arrow/Home/End/PageUp behaviour here follows the ARIA
   grid pattern rather than a reading of Carbon's. */

(function () {
  'use strict';

  var ROOT = '.rux--date-picker--next';
  // THE OPEN STATE IS `open` ON THE CALENDAR, NOT `--open` ON THE ROOT.
  // The reference renders `cds--date-picker--open` on the root, but
  // @carbon/styles defines NO rule for it -- the only open-state rule is
  // `.rux--date-picker--next .rux--date-picker__calendar.open`. So the root
  // class is dropped on the §4.1.12 precedent (`cds--form`,
  // `data-table-header__content`, `dropdown__wrapper`): attested in markup,
  // styles nothing, and check-classes rejects it. Writing it cost this file
  // one UNDEFINED on its first run, which is the gate doing its job.
  // `open` is unprefixed, like every other day-state class here.
  var OPEN = 'open';
  var DAY = 'rux--date-picker__day';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
  // Sunday first, matching the reference's seven weekday cells.
  var WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  var iso = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
      + '-' + String(d.getDate()).padStart(2, '0');
  };
  var parse = function (s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || '').trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  };
  var same = function (a, b) { return a && b && iso(a) === iso(b); };
  var label = function (d) { return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };

  function claim(root) {
    var container = root.querySelector('.rux--date-picker__calendar-container');
    var calendar = root.querySelector('.rux--date-picker__calendar');
    if (!container || !calendar) return;

    var isRange = root.classList.contains('rux--date-picker--range');
    var inputs = [].slice.call(root.querySelectorAll('.rux--date-picker__input'));
    var icons = [].slice.call(root.querySelectorAll('.rux--date-picker__icon'));
    if (!inputs.length) return;

    var monthEl = calendar.querySelector('.rux--date-picker__current-month');
    var daysEl = calendar.querySelector('.rux--date-picker__days');
    var weekdaysEl = calendar.querySelector('.rux--date-picker__weekdays');
    var navs = [].slice.call(calendar.querySelectorAll('.rux--date-picker__month-nav'));
    if (!daysEl || !monthEl) return;

    // The weekday row is static; the reference renders seven divs and the
    // module fills them rather than creating them, so a page that wants other
    // labels can write them and keep them.
    if (weekdaysEl && !weekdaysEl.textContent.trim()) {
      [].slice.call(weekdaysEl.children).forEach(function (cell, i) {
        cell.textContent = WEEKDAYS[i] || '';
      });
    }

    // Where the container lives while closed. Carbon's CSS has no closed
    // state (see the header), so absence from the DOM IS the closed state.
    var slot = container.parentNode;
    var next = container.nextSibling;
    var attached = true;
    function attach() { if (!attached) { slot.insertBefore(container, next); attached = true; } }
    function detach() { if (attached) { container.remove(); attached = false; } }

    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = parse(inputs[0].value) || today;
    view = new Date(view.getFullYear(), view.getMonth(), 1);
    var cursor = parse(inputs[0].value) || today;
    var open = false, release = null, active = 0;

    function selection() {
      return inputs.map(function (i) { return parse(i.value); });
    }

    function render() {
      var sel = selection();
      var from = sel[0], to = isRange ? sel[1] : null;
      monthEl.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();

      // 42 cells, always — six weeks, which is what the reference renders and
      // what stops the calendar changing height as months change.
      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var start = new Date(first); start.setDate(1 - first.getDay());
      daysEl.textContent = '';
      for (var n = 0; n < 42; n++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + n);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = DAY;
        b.textContent = String(d.getDate());
        b.setAttribute('aria-label', label(d));
        b.setAttribute('tabindex', '-1');
        b.dataset.ruxDate = iso(d);
        if (d.getMonth() !== view.getMonth())
          b.classList.add(d < first ? 'prevMonthDay' : 'nextMonthDay');
        if (same(d, today)) { b.classList.add('today'); b.setAttribute('aria-current', 'date'); }
        if (same(d, from) || same(d, to)) b.classList.add('selected');
        else if (isRange && from && to && d > from && d < to) b.classList.add('inRange');
        if (same(d, cursor)) b.classList.add('focused');
        daysEl.appendChild(b);
      }
    }

    // `adopting` is true only for a calendar the MARKUP declared open, which
    // this module renders at load. See the register() call for why it matters.
    function show(which, adopting) {
      active = which || 0;
      if (open) { render(); return; }
      open = true;
      attach();
      container.hidden = false;
      calendar.classList.add(OPEN);
      var sel = selection();
      cursor = sel[active] || sel[0] || today;
      view = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      render();
      release = window.Rux.overlay.register({
        element: container,
        anchor: icons[active] || inputs[active],
        close: hide,
        dismissOn: { outside: true, escape: true },
        // `dismissOthers: false` WHEN ADOPTING, AND ITS ABSENCE COST EXACTLY
        // WHAT js/list-box.js SAYS IT COSTS. register() calls dismissAbove() by
        // default, so a calendar the markup declares open tore down every
        // surface already adopted at load: check-runtime-classes reported
        // `dropdown--open`, `list-box__menu-item--highlighted` and
        // `side-nav--expanded` STRIPPED, with their classes still in the file
        // and check-coverage still counting them. That is the 2026-08-28 defect
        // list-box.js documents, reintroduced by a module written after it.
        //
        // The kernel's own reasoning is the test: a surface that was DECLARED
        // open did not open because anyone chose it, so it belongs on the stack
        // -- Escape and an outside press must still reach it -- but it must not
        // dismiss what is already there. A calendar the USER opens is a choice,
        // and keeps the default.
        dismissOthers: !adopting
      }).release;
      calendar.focus();
    }

    function hide(opts) {
      if (!open) return;
      open = false;
      calendar.classList.remove(OPEN);
      container.hidden = true;
      detach();
      if (release) { release(); release = null; }
      if (!opts || opts.restoreFocus !== false) (inputs[active] || inputs[0]).focus();
    }

    function pick(dateStr) {
      var d = parse(dateStr);
      if (!d) return;
      if (!isRange) {
        inputs[0].value = dateStr;
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        hide();
        return;
      }
      // Range: the first pick sets --from and clears --to; the second sets
      // --to, swapping if the user picked backwards.
      var from = parse(inputs[0].value);
      if (active === 0 || !from || parse(inputs[1].value)) {
        inputs[0].value = dateStr; inputs[1].value = '';
        active = 1; cursor = d; render();
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      if (d < from) { inputs[1].value = inputs[0].value; inputs[0].value = dateStr; }
      else inputs[1].value = dateStr;
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      hide();
    }

    function move(days) {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + days);
      view = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      render();
    }
    function shiftMonth(by) {
      view = new Date(view.getFullYear(), view.getMonth() + by, 1);
      render();
    }

    icons.forEach(function (icon, i) {
      icon.addEventListener('click', function (e) {
        e.preventDefault();
        if (open && active === i) hide(); else show(i);
      });
    });

    navs.forEach(function (nav) {
      nav.addEventListener('click', function (e) {
        e.preventDefault();
        shiftMonth(/previous/i.test(nav.getAttribute('aria-label') || '') ? -1 : 1);
      });
    });

    daysEl.addEventListener('click', function (e) {
      var b = e.target.closest('.' + DAY);
      if (b && b.dataset.ruxDate) pick(b.dataset.ruxDate);
    });

    // The ARIA grid pattern. NOT read off a running Carbon picker — the header
    // says so — because no key was pressed there.
    calendar.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft') { move(-1); }
      else if (k === 'ArrowRight') { move(1); }
      else if (k === 'ArrowUp') { move(-7); }
      else if (k === 'ArrowDown') { move(7); }
      else if (k === 'Home') { move(-cursor.getDay()); }
      else if (k === 'End') { move(6 - cursor.getDay()); }
      else if (k === 'PageUp') { shiftMonth(-1); }
      else if (k === 'PageDown') { shiftMonth(1); }
      else if (k === 'Enter' || k === ' ') { pick(iso(cursor)); }
      else return;
      e.preventDefault();
    });

    inputs.forEach(function (input) {
      input.addEventListener('change', function () { if (open) render(); });
    });

    // A page may ship the calendar open, the way sink/date-picker.html does.
    // Adopt that state rather than fighting it — the rule tile.js follows.
    // A page may ship it open on purpose; otherwise render once so the grid is
    // built, then take it out of the document.
    if (calendar.classList.contains(OPEN)) { open = false; show(0, true); }
    else { render(); container.hidden = true; detach(); }
  }

  function init(scope) {
    [].slice.call((scope || document).querySelectorAll(ROOT)).forEach(claim);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();

  window.Rux = window.Rux || {};
  window.Rux.datePicker = { init: init };
})();
