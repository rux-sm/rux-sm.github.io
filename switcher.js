/* The ecosystem's one shared list. Every app built on rux-ds links this file
   and fetches /switcher.json from the account root, so the switcher panel on
   every site names the same apps and marks the one you are on. If the fetch
   fails — a module served alone, offline — the entries the page shipped stay.
   The hub's own landing grid is filled from the same list. */
(async () => {
  let apps;
  try { apps = (await (await fetch('/switcher.json', { cache: 'no-store' })).json()).apps; }
  catch { return; }
  if (!Array.isArray(apps) || !apps.length) return;
  const here = location.pathname;
  const current = a => a.path === '/' ? here === '/' || here === '/index.html' : here.startsWith(a.path);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  for (const ul of document.querySelectorAll('ul.rux--switcher')) {
    ul.innerHTML = apps.map((a, i) =>
      `<li class="rux--switcher__item"><a class="rux--switcher__item-link" href="${esc(a.path)}"${current(a) ? ' aria-current="page"' : ''}>${esc(a.name)}</a></li>`
      + (i === 0 && apps.length > 1 ? '<li><hr class="rux--switcher__item--divider"></li>' : '')).join('');
    // A collapsed panel's links stay out of the tab order, as js/ui-shell.js leaves them.
    if (!ul.closest('.rux--header-panel--expanded')) for (const a of ul.querySelectorAll('a')) a.tabIndex = -1;
  }
  const grid = document.getElementById('apps-grid');
  if (grid) grid.innerHTML = apps.map(a =>
    `<div class="rux--css-grid-column rux--col-span-4"><a class="rux--link rux--tile rux--tile--clickable" href="${esc(a.path)}"><p><strong>${esc(a.name)}</strong></p><p>${esc(a.description)}</p><svg class="rux--tile--icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-arrow--right"/></svg></a></div>`).join('');
})();
