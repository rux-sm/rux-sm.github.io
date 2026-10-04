/* ==========================================================================
   Design — TAG OVERFLOW
   --------------------------------------------------------------------------
   Requires js/overlay.js for the namespace and js/popover.js, which opens and
   closes the list of hidden tags from the count. A row with a "view all" link
   also needs js/modal.js, which opens and closes the modal of every tag.

   WHAT IT DOES. Every tag is written into the row. This module measures the
   row, hides the tags that do not fit, counts them on the "+N" tag and lists
   their labels in its popover. It measures again whenever the row's width
   changes.

   HIDDEN, NOT REMOVED. Carbon's React leaves a tag that does not fit out of the
   tree and renders it again when there is room. A static page has no tree to
   render from, so the tag stays in the markup with `hidden`, which takes it
   out of layout and out of the accessibility tree alike.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-10-03 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=utilities-tagoverflow--tags-with-overflow-count
   and read against @carbon/ibm-products 2.99.0, TagOverflow.js,
   TagOverflowPopover.js and useOverflowItems.js.

   READ OFF THE RUNNING COMPONENT: five tags in a 250px row show three and
   "+2"; the two hidden labels are the popover's list items; the count is an
   operational tag whose `aria-expanded` follows the popover.

   FROM THE SOURCE, the arithmetic: a tag's width is its box plus its inline
   margins. When the tags together are wider than the row, tags are taken in
   order while they fit in the row less the count's own width; otherwise every
   tag shows and there is no count. The popover lists at most ten labels.

   PAST TEN HIDDEN TAGS, read against TagOverflowPopover.js and
   TagOverflowModal.js: the popover lists the first ten and shows its "view
   all" link; the link closes the popover and opens a modal holding every tag
   of the row, shown or not; the modal's search keeps the tags whose label
   contains what is typed, whatever its case. The link names the modal with
   `aria-controls`, and js/modal.js opens and closes it. Driven here in
   Chrome, not on Carbon's page.

   NOT WRITTEN: `maxVisible`; the multiline variant, which wraps and so never
   overflows; dismissible tags in the popover and the modal. With no count to
   show, Carbon unmounts it; here its holder is `hidden`. */
(() => {
  'use strict';
  if (!window.Rux?.overlay) return; // js/overlay.js must load first

  const ROOT = '.rux--tag-overflow';
  const LISTED = 10;

  const outer = el => {
    const style = getComputedStyle(el);
    return el.offsetWidth + parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10);
  };

  function fit(root) {
    const row = root.querySelector('.rux--tag-overflow__visible-tags');
    const indicator = row?.querySelector(':scope > .rux--tag-overflow__indicator');
    if (!row || !indicator || row.classList.contains('rux--tag-overflow--multiline')) return;
    const holders = [...row.children].filter(el => el !== indicator);

    // Measured as Carbon measures them: all showing, none shrunk by the row.
    indicator.hidden = false;
    for (const holder of holders) { holder.hidden = false; holder.style.flex = '0 0 auto'; }
    const widths = holders.map(outer);
    const count = indicator.offsetWidth;
    for (const holder of holders) holder.style.flex = '';

    const needed = widths.reduce((sum, w) => sum + w, 0);
    const room = needed > row.offsetWidth ? row.offsetWidth - count : row.offsetWidth;
    let used = 0, shown = 0;
    while (shown < holders.length && used + widths[shown] <= room) used += widths[shown++];

    const hidden = holders.slice(shown);
    holders.forEach((holder, i) => { holder.hidden = i >= shown; });
    indicator.hidden = hidden.length === 0;

    const label = indicator.querySelector('.rux--tag-overflow-popover__trigger .rux--tag__label');
    if (label) label.textContent = `+${hidden.length}`;
    const list = indicator.querySelector('.rux--tag-overflow-popover__tag-list');
    if (list) {
      list.replaceChildren(...hidden.slice(0, LISTED).map(holder => {
        const item = document.createElement('li');
        item.className = 'rux--tag-overflow-popover__tag-item rux--tag-overflow-popover__tag-item--default';
        item.textContent = holder.textContent.trim();
        return item;
      }));
    }
    if (!hidden.length) {
      const container = indicator.querySelector('.rux--popover-container');
      if (container) window.Rux.popover?.close(container);
    }

    const link = indicator.querySelector(LINK);
    if (link) {
      link.hidden = hidden.length <= LISTED;
      const body = modalOf(link)?.querySelector('.rux--tag-overflow-modal__body');
      body?.replaceChildren(...holders.map(holder => {
        const tag = document.createElement('div');
        tag.className = 'rux--tag rux--layout--size-md';
        const text = document.createElement('span');
        text.className = 'rux--tag__label';
        text.textContent = holder.textContent.trim();
        tag.append(text);
        return tag;
      }));
    }
  }

  /* ── every tag, in a modal ────────────────────────────────────────────── */
  const LINK = '.rux--tag-overflow-popover__show-all-tags-link';
  const modalOf = link => {
    const modal = document.getElementById(link.getAttribute('aria-controls') || '');
    return modal?.classList.contains('rux--tag-overflow-modal') ? modal : null;
  };

  // The count is the modal's trigger, so focus returns to something that is
  // still on the page: the link goes when its popover shuts.
  document.addEventListener('click', event => {
    const link = event.target instanceof Element && event.target.closest(LINK);
    if (!link) return;
    event.preventDefault();
    const container = link.closest('.rux--popover-container');
    const modal = modalOf(link);
    if (container) window.Rux.popover?.close(container);
    if (modal) window.Rux.modal?.open(modal, container?.querySelector('.rux--tag-overflow-popover__trigger'));
  });

  document.addEventListener('input', event => {
    const search = event.target instanceof Element
      && event.target.closest('.rux--tag-overflow-modal__search .rux--search-input');
    if (!search) return;
    const text = search.value.toLocaleLowerCase();
    const tags = search.closest('.rux--tag-overflow-modal').querySelectorAll('.rux--tag-overflow-modal__body > .rux--tag');
    for (const tag of tags) tag.hidden = !tag.textContent.toLocaleLowerCase().includes(text);
  });

  const fitAll = () => document.querySelectorAll(ROOT).forEach(fit);

  if ('ResizeObserver' in window) {
    const widthOf = new WeakMap();
    const observer = new ResizeObserver(entries => {
      for (const { target } of entries) {
        // The fit changes what the row holds, never how wide it is, so a
        // width that has not changed is this module's own echo.
        if (widthOf.get(target) === target.offsetWidth) continue;
        widthOf.set(target, target.offsetWidth);
        fit(target);
      }
    });
    for (const root of document.querySelectorAll(ROOT)) observer.observe(root);
  } else {
    window.addEventListener('resize', fitAll);
  }
  fitAll();

  window.Rux.tagOverflow = { fit };
})();
