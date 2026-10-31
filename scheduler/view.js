/* THE SAVED VIEW, BEFORE THE PAGE DRAWS. The view menu keeps its choices in
   `scheduler.view`, which data.js reads once the page has loaded. The two
   that change the board's shape, Fill the window, which widens the frame to
   the window, and Up to two weeks, which fits more days on screen from md
   up, are set on the root here, in the head, so the first measure of the
   board counts its days as the drawn one will; data.js keeps them in step
   after. */
(() => {
  try {
    const view = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    const phone = matchMedia('(max-width: 41.98rem)').matches;
    const root = document.documentElement;
    if (view.fill) root.dataset.schedulerFill = '';
    if (view.fitDays && !phone) root.dataset.schedulerFitDays = '';
  } catch { /* A view that cannot be read draws the default week. */ }
})();
