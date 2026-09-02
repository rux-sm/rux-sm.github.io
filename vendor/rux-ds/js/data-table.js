/* ==========================================================================
   rux-ds — DATA TABLE                                  Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only for `autoId`. A table is not a dismissible
   surface and never joins the stack.

   Three behaviours, one per module Carbon splits data-table into, and the
   manifest compiles all four as of 2026-08-28:

     sort        `data-table/sort`       cycle, reorder, announce
     expand      `data-table/expandable` a parent row and its child row
     select      `data-table/action`     row and select-all, and the batch bar

   SORTING REORDERS THE DOM, because a sortable header that only changes an
   arrow is a lie told in ARIA. `aria-sort` on the <th> is the announcement;
   the rows moving is the behaviour, and a screen reader that hears
   "ascending" and finds the old order has been misled.

   ROWS MOVE IN PAIRS. An expandable table interleaves `parent-row` with its
   `[data-child-row]`, so sorting by row would tear a child away from its
   parent and leave it under someone else's. Rows are grouped first, sorted as
   groups, and re-appended as groups.

   THE SORT CYCLE IS THREE-STATE — none, ascending, descending, none — which is
   Carbon's, and the third state matters: it restores the order the markup
   shipped in. That order is captured once, at load, because after the first
   sort it is no longer recoverable from the DOM.

   THE BATCH BAR IS DERIVED, NEVER ASSERTED. `batch-actions--active` is
   `clip-path` opening the bar, and it belongs to "some row is selected"
   rather than to the markup. The count text is the same fact said twice, so
   it is written from the same place.

   THE CLOSED BAR IS HIDDEN THREE WAYS AND EACH ONE IS NEEDED. `clip-path`
   takes it off the screen, `aria-hidden` takes it off the accessibility tree,
   and `tabindex="-1"` takes its buttons out of the tab order. Ship only the
   first two and the page has focusable elements inside an aria-hidden subtree
   — invisible tab stops that announce nothing. Read from running Carbon on
   2026-08-28: closed is aria-hidden=true with every button at -1, open is
   aria-hidden=false with every button at 0.
   ========================================================================== */

/* BEHAVIOUR: verified-live · https://react.carbondesignsystem.com/iframe.html?id=components-datatable-batch-actions--default
   read 2026-08-28 -- both batch-bar states from the DOM: closed is aria-hidden=true with
   every button tabindex=-1, open is aria-hidden=false with every button at 0.
   NOT VERIFIED: sorting and expansion. No running Carbon table was opened for either, and
   no capture in docs/ carries a sorted column -- table-sort--active, --descending and
   __icon-inactive appear in none of the 641. templates/table-page.html calls the sorted
   state its weakest claim for the same reason.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const TABLE = '.rux--data-table';
  const order = new WeakMap();   // tbody -> the row groups as the markup shipped them

  /* ── rows, grouped so a child row travels with its parent ──────────────── */
  function groups(tbody) {
    const out = [];
    for (const row of tbody.rows) {
      if (row.hasAttribute('data-child-row') && out.length) out[out.length - 1].push(row);
      else out.push([row]);
    }
    return out;
  }

  const cellText = (group, index) => group[0].cells[index]?.textContent.trim() ?? '';

  // Numeric when BOTH sides are numeric; otherwise locale-aware text. Mixing the
  // two is how "10" ends up before "9" in one table and after it in the next.
  const compare = (a, b) => {
    const x = Number(a), y = Number(b);
    return (a !== '' && b !== '' && !Number.isNaN(x) && !Number.isNaN(y))
      ? x - y : a.localeCompare(b);
  };

  function sortBy(table, th, direction) {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    if (!order.has(tbody)) order.set(tbody, groups(tbody));
    const index = [...th.parentElement.cells].indexOf(th);

    const rows = direction === 'none'
      ? order.get(tbody)
      : [...groups(tbody)].sort((a, b) => {
          const r = compare(cellText(a, index), cellText(b, index));
          return direction === 'descending' ? -r : r;
        });

    for (const group of rows) for (const row of group) tbody.appendChild(row);
  }

  function setSort(table, th, direction) {
    // One sorted column at a time: another column's arrow still showing its old
    // direction claims an order the table is no longer in.
    for (const other of table.querySelectorAll('th.rux--table-sort__header')) {
      const button = other.querySelector('.rux--table-sort');
      if (other === th) continue;
      other.setAttribute('aria-sort', 'none');
      button?.classList.remove('rux--table-sort--active', 'rux--table-sort--descending');
    }
    const button = th.querySelector('.rux--table-sort');
    th.setAttribute('aria-sort', direction);
    button?.classList.toggle('rux--table-sort--active', direction !== 'none');
    button?.classList.toggle('rux--table-sort--descending', direction === 'descending');
    sortBy(table, th, direction);
    table.dispatchEvent(new CustomEvent('rux:table-sorted', {
      bubbles: true, detail: { column: th, direction },
    }));
  }

  const NEXT = { none: 'ascending', ascending: 'descending', descending: 'none' };

  /* ── selection and the batch bar ───────────────────────────────────────── */
  const containerOf = table => table.closest('.rux--data-table-container') ?? table.parentElement;

  const rowBoxes = table => [...table.querySelectorAll(
    'tbody td.rux--table-column-checkbox input[type="checkbox"]')];

  function syncSelection(table) {
    const boxes = rowBoxes(table);
    let count = 0;
    for (const box of boxes) {
      const row = box.closest('tr');
      row?.classList.toggle('rux--data-table--selected', box.checked);
      if (box.checked) count++;
    }
    // Select-all reflects the rows rather than driving them: part-checked is
    // `indeterminate`, which is a PROPERTY and has no attribute to set.
    const all = table.querySelector('thead th.rux--table-column-checkbox input[type="checkbox"]');
    if (all) {
      all.checked = count > 0 && count === boxes.length;
      all.indeterminate = count > 0 && count < boxes.length;
    }
    const bar = containerOf(table)?.querySelector('.rux--batch-actions');
    if (bar) {
      bar.classList.toggle('rux--batch-actions--active', count > 0);
      bar.setAttribute('aria-hidden', String(count === 0));
      // aria-hidden AND tabindex, together or not at all. The bar is closed by
      // `clip-path`, which removes it from view and leaves its buttons in the
      // tab order — a tab stop inside an aria-hidden subtree, which is the one
      // combination the ARIA spec rules out. Carbon pairs them.
      for (const btn of bar.querySelectorAll('button')) {
        btn.tabIndex = count === 0 ? -1 : 0;
      }
      const para = bar.querySelector('.rux--batch-summary__para span');
      if (para) para.textContent = `${count} item${count === 1 ? '' : 's'} selected`;
    }
    table.dispatchEvent(new CustomEvent('rux:table-selection', {
      bubbles: true, detail: { count, total: boxes.length },
    }));
  }

  /* ── expansion ─────────────────────────────────────────────────────────── */
  function setExpanded(button, open) {
    const row = button.closest('tr');
    const child = row?.nextElementSibling;
    button.setAttribute('aria-expanded', String(open));
    // An EXPANDED parent carries both classes — `tr.--parent-row.--expandable-row`
    // is what Carbon selects — and a collapsed one carries only parent-row.
    row?.classList.toggle('rux--expandable-row', open);
    // THE CHEVRON'S ROTATION HANGS OFF AN ATTRIBUTE, not a class, and the
    // attribute names the PREVIOUS value: `data-previous-value=collapsed` means
    // the row WAS collapsed, so it is now OPEN. Carbon's React sets it on the
    // cell when it expands, and the same selector also clears the row's bottom
    // border so no rule cuts between a parent and its own child row.
    const cell = button.closest('td.rux--table-expand');
    if (cell) {
      if (open) cell.setAttribute('data-previous-value', 'collapsed');
      else cell.removeAttribute('data-previous-value');
    }
    if (child?.hasAttribute('data-child-row')) {
      child.hidden = !open;
      button.setAttribute('aria-controls', overlay.autoId(child, 'rux-child-row'));
    }
  }

  /* ── wiring ────────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const sort = event.target.closest('.rux--table-sort');
    if (sort) {
      const th = sort.closest('th');
      const table = sort.closest(TABLE);
      if (th && table) {
        event.preventDefault();
        setSort(table, th, NEXT[th.getAttribute('aria-sort') ?? 'none'] ?? 'ascending');
      }
      return;
    }

    const expand = event.target.closest('.rux--table-expand__button');
    if (expand) {
      event.preventDefault();
      setExpanded(expand, expand.getAttribute('aria-expanded') !== 'true');
    }
  });

  document.addEventListener('change', event => {
    if (!(event.target instanceof Element)) return;
    const box = event.target.closest('input[type="checkbox"]');
    const table = box?.closest(TABLE);
    if (!box || !table) return;
    if (box.closest('thead th.rux--table-column-checkbox')) {
      for (const row of rowBoxes(table)) row.checked = box.checked;
    } else if (!box.closest('td.rux--table-column-checkbox')) {
      return;   // a checkbox in a cell that is not the selection column
    }
    syncSelection(table);
  });

  /* Adopt what the markup shipped: rows already checked, panels already open,
     and the original row order, which the third sort state restores to. */
  for (const table of document.querySelectorAll(TABLE)) {
    const tbody = table.tBodies[0];
    if (tbody) order.set(tbody, groups(tbody));
    // A column shipped `aria-sort="ascending"` must LOOK sorted. The classes are
    // synced without reordering: the markup is presumed to be in the order it
    // claims, and re-sorting could contradict a demo that means something.
    for (const th of table.querySelectorAll('th.rux--table-sort__header')) {
      const direction = th.getAttribute('aria-sort') ?? 'none';
      const button = th.querySelector('.rux--table-sort');
      button?.classList.toggle('rux--table-sort--active', direction !== 'none');
      button?.classList.toggle('rux--table-sort--descending', direction === 'descending');
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
    }
    for (const button of table.querySelectorAll('.rux--table-expand__button'))
      setExpanded(button, button.getAttribute('aria-expanded') === 'true');
    if (rowBoxes(table).length) syncSelection(table);
  }

  window.Rux.dataTable = {
    sort: (table, th, direction) => setSort(table, th, direction),
    expand: (button, open) => setExpanded(button, open),
    sync: table => syncSelection(table),
  };
})();
