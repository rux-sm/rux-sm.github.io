/* ==========================================================================
   offline.js — Pixels with no connection
   --------------------------------------------------------------------------
   A SERVICE WORKER, which app.js registers on every Pixels page. It keeps a
   copy of every file a Pixels page loads, its own and Design's, the site's
   scripts and supabase-js, as each one arrives, and asks the network first
   every time, so a change is seen as soon as there is a connection. With
   none, the copy kept is served, and a page asked for with any address after
   its name, such as play.html?id=, is the one page kept. The core files are
   kept on install, so the first visit is enough.

   What a player is sent and has solved is kept by data.js, and a solve made
   with no connection waits there; this keeps only the files.
   ========================================================================== */
const CACHE = 'pixels-1';
const CORE = [
  './', 'index.html', 'play.html', 'category.html', 'me.html', 'create.html', 'friends.html', 'make.html',
  'app.js', 'data.js', 'puzzles.js', 'play.js', 'category.js', 'me.js', 'create.js', 'friends.js', 'make.js',
  'theme.css', 'overrides.css', 'app.css', 'manifest.json', 'brand/favicon.svg', 'brand/icon.svg',
  '/funnel.js', '/account.js', '/switcher.js', '/switcher.json',
  '/design/css/rux.css', '/design/css/rux-theme.css', '/design/css/rux-overrides.css', '/design/css/rux-game.css',
  '/design/assets/fonts/plex.css', '/design/assets/fonts/Silkscreen-Regular-Latin1.woff2',
  '/design/assets/fonts/IBMPlexSans-Regular-Latin1.woff2', '/design/assets/fonts/IBMPlexSans-SemiBold-Latin1.woff2',
  ...['overlay', 'popover', 'menu', 'form-controls', 'dismiss', 'modal', 'ui-shell', 'profile', 'content-switcher', 'tile', 'custom-themes', 'theme']
    .map(name => `/design/js/${name}.js`),
];
// Kept as they are fetched, from this site and the one CDN its pages use.
const KEPT = url => url.origin === self.location.origin || url.host === 'cdn.jsdelivr.net';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(CORE.map(file => cache.add(file).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || !KEPT(url)) return;
  const page = request.mode === 'navigate';
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(page ? url.origin + url.pathname : request, copy));
    }
    return response;
  }).catch(() => caches.match(page ? url.origin + url.pathname : request, { ignoreSearch: page })
    .then(found => found || (page ? caches.match(url.pathname.endsWith('/') ? url.pathname : `${url.pathname.replace(/[^/]*$/, '')}index.html`) : undefined))
    .then(found => found || Response.error())));
});
