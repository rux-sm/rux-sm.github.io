/* THE SAVED VIEW, BEFORE THE PAGE DRAWS. The view menu keeps its choices in
   `scheduler.view`, which data.js reads once the page has loaded. The one
   that changes the board's shape, Fill the window, which widens the frame to
   the window, is set on the root here, in the head, so the first measure of
   the board counts its days as the drawn one will; data.js keeps it in step
   after. So is the phone's view, List or 3 days, kept in
   `scheduler.phone-view`, so a phone opens on the one last used with no
   flash of the other: List the first time. */
(() => {
  try {
    const view = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    if (view.fill) document.documentElement.dataset.schedulerFill = '';
  } catch { /* A view that cannot be read draws the default week. */ }
  let phone = 'list';
  try { if (localStorage.getItem('scheduler.phone-view') === 'days') phone = 'days'; } catch { /* List, then. */ }
  document.documentElement.dataset.schedulerPhone = phone;
})();
