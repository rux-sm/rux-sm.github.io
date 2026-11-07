/* THE SAVED VIEW, BEFORE THE PAGE DRAWS. The view menu keeps its choices in
   `scheduler.view`, which data.js reads once the page has loaded. What
   changes the board's shape is set here, in the head, so the first paint is
   the board the page will draw:
   - Fill the window, which widens the frame to the window, on the root, so
     the first measure of the board counts its days as the drawn one will;
   - the bar's rows, on the week the moment the parser makes it, so its
     loading skeleton stands at the saved height rather than six lines.
   data.js keeps both in step after. The rows' names, the classes that hide
   them and the compact board's set are here, their one home, and data.js
   reads them from `window.SchedulerView`. */
(() => {
  const ROWS = ['client', 'contact', 'time', 'update', 'drivers'];
  // The class that hides each row, written out in full so the check can read it.
  const HIDE_ROW = {
    client: 'scheduler-week--no-client',
    contact: 'scheduler-week--no-contact',
    time: 'scheduler-week--no-time',
    update: 'scheduler-week--no-update',
    drivers: 'scheduler-week--no-drivers',
  };
  /* Compact is the destination, the times and the drivers, about half a
     bar's height, which a phone's board draws whatever the view holds. */
  const COMPACT = { client: false, contact: false, time: true, update: false, drivers: true };

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('scheduler.view') || '{}') || {};
    if (saved.fill) document.documentElement.dataset.schedulerFill = '';
  } catch { /* A view that cannot be read draws the default week. */ }

  /* Dresses the week in the bar's rows: each row the view turns off hidden,
     and the count, one for the destination and one for each row on, which
     app.css lays the bars and the bus tiles out by. `shown` says whether a
     row is on. */
  function dress(week, shown) {
    for (const r of ROWS) week.classList.toggle(HIDE_ROW[r], !shown(r));
    const count = String(1 + ROWS.filter(shown).length);
    week.style.setProperty('--scheduler-bar-rows', count);
    week.dataset.barRows = count;
  }

  /* The saved rows, or on a phone's width the compact board's, set on the
     week as soon as it is parsed, before anything is painted. */
  const phone = matchMedia('(max-width: 41.98rem)').matches;
  const early = r => (phone ? COMPACT[r] : saved[r] !== false);
  const watch = new MutationObserver(() => {
    const week = document.getElementById('scheduler-week');
    if (!week) return;
    watch.disconnect();
    dress(week, early);
  });
  watch.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => watch.disconnect(), { once: true });

  window.SchedulerView = { ROWS, HIDE_ROW, COMPACT, dress };
})();
