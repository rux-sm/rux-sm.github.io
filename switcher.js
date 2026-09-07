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
  // THE GRID DROPS THE APP YOU ARE ON. A tile whose destination is the page
  // under it is not a destination, and on the hub it was a "Home" card on Home.
  // The PANEL keeps that entry, marked aria-current: there it is how you know
  // where you are, which is the opposite job. Filtering by current() rather
  // than by path means any site that grows a grid gets the same rule.
  // THE TILE: an icon, the name, and a description of three or four words.
  // The placeholder is a FILLED swatch, not an outline: an empty box on a
  // page this bare reads as an unchecked control or an image that failed,
  // which is what the outline did. layer-accent-01 rather than layer-02
  // because it is the one that moves in BOTH themes - #e0e0e0 on the white
  // theme's #f4f4f4 tile, #393939 on g100's #262626, where layer-02 is
  // #ffffff on white and all but invisible.
  // An app may name its own icon with an "icon" key in switcher.json — an
  // absolute path to an SVG that app serves, e.g. "/rux-ds/brand/icon.svg".
  // Until it does, a 32px outlined square holds exactly the space the icon
  // will take, so adding one later moves nothing else on the page. That is
  // the same bargain as the list itself: one entry here, no markup anywhere.
  const icon = a => a.icon
    ? `<img src="${esc(a.icon)}" alt="" width="32" height="32" style="display:block;height:32px;width:32px">`
    : `<span style="display:block;height:32px;width:32px;background:var(--rux-layer-accent-01)"></span>`;
  const grid = document.getElementById('apps-grid');
  if (grid) grid.innerHTML = apps.filter(a => !current(a)).map(a =>
    `<div class="rux--css-grid-column rux--col-span-4"><a class="rux--link rux--tile rux--tile--clickable" href="${esc(a.path)}"><span class="rux--stack-vertical rux--stack-scale-3">${icon(a)}<span class="rux--type-productive-heading-03">${esc(a.name)}</span><span class="rux--type-body-01">${esc(a.description)}</span></span></a></div>`).join('');
})();
