/* THE SAVED VIEW, BEFORE THE PAGE DRAWS. The view menu keeps its choices in
   `scheduler.view`, which data.js reads once the page has loaded. The one
   that changes the board's shape, Fill the window, which widens the frame to
   the window, is set on the root here, in the head, so the first measure of
   the board counts its days as the drawn one will; data.js keeps it in step
   after. */
(() => {
  try {
    const view = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    if (view.fill) document.documentElement.dataset.schedulerFill = '';
  } catch { /* A view that cannot be read draws the default week. */ }
})();
