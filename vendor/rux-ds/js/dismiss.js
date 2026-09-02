/* ==========================================================================
   rux-ds — DISMISSIBLE: NOTIFICATIONS AND FILTER TAGS
                                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only to share the `window.Rux` namespace. Neither of
   these overlays anything, so neither joins the dismiss stack — the kernel
   answers "which surface owns this press", and these two are answering a
   different question: "this thing is gone now".

   ONE MODULE, because they are the same behaviour under two class names: a
   control inside a box removes the box. Notifications and tags have nothing
   else in common and do not need to — this file is grouped by what it DOES,
   the way form-controls is.

   REMOVED, NOT HIDDEN. Carbon's React unmounts a dismissed notification, and
   a hidden-but-present tag would keep answering `querySelectorAll` for code
   that counts active filters. `hidden` would also leave it in the DOM for a
   screen reader to skip past forever.

   FOCUS IS THE PART THAT IS EASY TO GET WRONG. Removing the element that has
   focus drops focus to <body>, which sends a keyboard user back to the top of
   the document — and dismissing three filter tags in a row is exactly when
   that hurts. Focus moves to the NEXT dismissible in the same group, or to the
   previous one when the last is removed, or to the group itself when nothing
   is left. That last case needs the group to be focusable, so it is given
   `tabindex="-1"`: programmatically focusable, never a tab stop.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-notifications-inline--default
   and https://react.carbondesignsystem.com/iframe.html?id=components-tag--dismissible
   clicking real close buttons and reading the DOM and document.activeElement after each.

   THE UNSOURCED CLAIM IS NOW SOURCED, AND IT WAS TRUE. This label used to say that
   "Carbon's React unmounts a dismissed notification rather than hiding it" was asserted
   with nothing cited, and that the whole remove-don't-hide design rested on it. Measured:
   clicking the close button took the notification out of the DOM entirely -- querying it
   afterwards returns nothing, and there is no hidden survivor. The same for a tag, 12 to
   11. Nothing was hidden; both were unmounted.

   FOCUS AFTER DISMISSAL SPLITS, and only one half is ours. Dismissing a TAG moved focus
   to the NEXT tag's close button -- dismissing the tag at index 3 left focus on the tag
   that slid into index 3, which is exactly what nextFocus() does. Dismissing a
   NOTIFICATION left document.activeElement on BODY. So this module matches Carbon for
   tags and deliberately exceeds it for notifications, which is the same call already made
   in modal.js and made for the same reason: dropping a keyboard user at the top of the
   document is a real cost and Carbon paying it is not a reason to.

   The close-button class names match per variant, and `.cds--tag__close-icon` is a real
   <button>, so the selectors in KINDS are right.

   NOT VERIFIED: the toast and actionable variants -- their close buttons carry different
   classes, which are in KINDS from the captures but were not clicked. And the
   last-one-removed case, where focus falls back to the group.
   ========================================================================== */
(() => {
  'use strict';
  if (!window.Rux?.overlay) return; // js/overlay.js must load first

  // A close control and the box it dismisses. Notifications name their close
  // button per variant — inline, toast and actionable each have their own —
  // because Carbon does; the tag has one class for all colours.
  const KINDS = [
    { close: '.rux--inline-notification__close-button', box: '.rux--inline-notification' },
    { close: '.rux--toast-notification__close-button', box: '.rux--toast-notification' },
    { close: '.rux--actionable-notification__close-button', box: '.rux--actionable-notification' },
    { close: '.rux--tag__close-icon', box: '.rux--tag' },
  ];

  const CLOSERS = KINDS.map(k => k.close).join(', ');

  function nextFocus(box, closeSelector) {
    // Siblings that are still dismissible, in document order.
    const group = box.parentElement;
    if (!group) return null;
    const peers = [...group.children].filter(el => el !== box && el.querySelector(closeSelector));
    const after = peers.filter(el => box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    const target = after[0] ?? peers[peers.length - 1] ?? null;
    if (target) return target.querySelector(closeSelector);
    // Nothing left to land on: the group takes focus so the reader stays put.
    if (!group.hasAttribute('tabindex')) group.setAttribute('tabindex', '-1');
    return group;
  }

  function dismiss(box, kind) {
    if (!box) return;
    const landing = nextFocus(box, kind.close);
    box.dispatchEvent(new CustomEvent('rux:dismissed', { bubbles: true, detail: { kind: kind.box } }));
    box.remove();
    landing?.focus?.({ preventScroll: true });
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const closer = event.target.closest(CLOSERS);
    if (!closer) return;
    const kind = KINDS.find(k => closer.matches(k.close));
    const box = closer.closest(kind.box);
    if (!box) return;
    event.preventDefault();
    dismiss(box, kind);
  });

  window.Rux.dismiss = box => {
    const kind = KINDS.find(k => box?.matches?.(k.box));
    if (kind) dismiss(box, kind);
  };
})();
