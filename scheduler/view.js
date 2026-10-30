/* THE SAVED VIEW, BEFORE THE PAGE DRAWS. The view menu keeps its choices in
   `scheduler.view`, which data.js reads once the page has loaded. The two
   that change the board's shape, Fill the window, which widens the frame to
   the window, and Two weeks, which doubles its days, are set on the root
   here, in the head, so the loading week stands as the drawn one will and
   nothing moves when it arrives; data.js keeps them in step after. Two
   weeks is one week on a phone and in a strip, as data.js draws it. */
(() => {
  try {
    const view = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    const phone = matchMedia('(max-width: 41.98rem)').matches;
    const root = document.documentElement;
    if (view.twoWeeks && !view.scroll && !phone) root.dataset.schedulerDays = '14';
    if (view.fill) root.dataset.schedulerFill = '';
  } catch { /* A view that cannot be read draws the default week. */ }
})();
