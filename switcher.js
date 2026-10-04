/* The ecosystem's one shared list. Every app built on Design links this file
   and fetches /switcher.json from the account root, so the switcher panel on
   every site names the same apps and marks the one you are on. If the fetch
   fails — a module served alone, offline — the entries the page shipped stay.
   The hub's own landing grid is filled from the same list. */
(async () => {
  let apps;
  try { apps = (await (await fetch('/switcher.json', { cache: 'no-store' })).json()).apps; }
  catch { return; }
  if (!Array.isArray(apps) || !apps.length) return;
  // THE LIST FOLLOWS THE ACCOUNT'S ACCESS: Home and the apps the login in this
  // browser can open, by window.Rux.access from /funnel.js. With no login, as
  // in a local preview without the lock, every app is listed.
  const access = window.Rux?.access;
  const user = access?.storedUser();
  if (user) {
    const granted = access.accessOf(user);
    apps = apps.filter(a => a.path === '/' || access.allows(granted, a.path));
  }
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
  // THE TILE: the app's icon, its name, and a description of three or four
  // words. Every tile is built by the one template below, so no two differ in
  // construction.
  //
  // THE ICON IS A MASK, NOT AN <img>. currentColor does not reach inside an
  // <img>, and a tile's colour changes with the theme, so a baked colourway
  // would be wrong in some of them. The app's own drawn mark, its
  // brand/icon.svg, is masked over the tile's text colour, and only the
  // file's alpha is read. docs/app-icons.md is how one is drawn, and the
  // check fails an app that has none. The header logo stays an <img>: the
  // header has one colour to carry.
  const icon = a => `<span style="display:block;height:32px;width:32px;background:currentColor;-webkit-mask:url(${esc(a.icon)}) center/contain no-repeat;mask:url(${esc(a.icon)}) center/contain no-repeat"></span>`;
  const grid = document.getElementById('apps-grid');
  if (grid) grid.innerHTML = apps.filter(a => !current(a)).map(a =>
    `<div class="rux--css-grid-column rux--col-span-4"><a class="rux--link rux--tile rux--tile--clickable" href="${esc(a.path)}"><span class="rux--stack-vertical rux--stack-scale-3">${icon(a)}<span class="rux--type-productive-heading-03">${esc(a.name)}</span><span class="rux--type-body-01">${esc(a.description)}</span></span></a></div>`).join('');
})();
