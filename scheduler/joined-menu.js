/* ==========================================================================
   Rux Scheduler — A MENU JOINED TO ITS BUTTON
   --------------------------------------------------------------------------
   A menu hung flush under the button that opened it is one surface with
   it, as Carbon's overflow menu is with its trigger, loaded by the board
   and the forms page: the board's ⋮ and month list, and a form's pick cell.

   Both are marked `data-attached`, and the button is raised into the
   menu's Layer 02 with Carbon's `rux--layer-two`, as Carbon's table toolbar
   opens its menus and their buttons, so the open button does not read as
   the bar's own Layer 01. The menu is told where the button stands over it,
   unrounded, so the strip overrides.css lays along the button's foot lands
   on the button wherever the menu's width puts its edge. A menu that had to
   open elsewhere, or that a theme floats clear by its gap, stays apart.
   ========================================================================== */
(() => {
  'use strict';

  // Joins the two when the menu's top is the button's foot; true if it did.
  function join(menu, button) {
    const b = button.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    if (Math.abs(m.top - b.bottom) >= 1) return false;
    menu.style.setProperty('--scheduler-attach-x', `${b.left - m.left}px`);
    menu.style.setProperty('--scheduler-attach-w', `${b.width}px`);
    menu.dataset.attached = '';
    button.dataset.attached = '';
    button.classList.add('rux--layer-two');
    return true;
  }

  // Parts them as the menu closes.
  function part(menu, button) {
    delete menu.dataset.attached;
    delete button.dataset.attached;
    button.classList.remove('rux--layer-two');
  }

  window.SchedulerJoinedMenu = { join, part };
})();
