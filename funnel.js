/* ==========================================================================
   Rux Apps — FUNNEL, the site's page lock
   --------------------------------------------------------------------------
   Every full page loads this first in its <head>, followed by a style that
   keeps the page hidden until this script marks it open, so a browser with
   scripts off draws nothing. It reads the login supabase-js keeps in this
   browser, with no network, before the page draws:
   - no login, or an account with no access: to /login/?next=<this address>;
   - a page of an app the account lacks: to Home, or to its one app;
   - otherwise the page opens.
   /login/ and /scheduler/share/ open without a login. A local preview has no
   lock unless ?cloud is on the address, as account.js behaves.

   ACCESS, SHARED. window.Rux.access holds these rules for the log-in page too.
   Access is the owner switch and the ticked apps in the account's
   app_metadata. An app is a page's first path segment; the root, account/ and
   login/ are Home, which every account with access opens.

   A CURTAIN, NOT A LOCK. Anyone with a file's address can still fetch it; the
   database rules decide what data anyone can reach. */
(() => {
  'use strict';
  const STORAGE_KEY = 'sb-udnmqhayzhrbltxzzhjw-auth-token';
  const HOME = new Set(['', 'account', 'login']);
  const accessOf = user => ({
    owner: user?.app_metadata?.owner === true,
    apps: Array.isArray(user?.app_metadata?.apps) ? user.app_metadata.apps.filter(a => typeof a === 'string') : [],
  });
  const appOf = path => {
    const first = String(path).split(/[?#]/)[0].split('/')[1] ?? '';
    return HOME.has(first) || first.includes('.') ? '' : first;
  };
  const canEnter = granted => granted.owner || granted.apps.length > 0;
  const allows = (granted, path) =>
    canEnter(granted) && (granted.owner || appOf(path) === '' || granted.apps.includes(appOf(path)));
  const landing = granted => (!granted.owner && granted.apps.length === 1 ? `/${granted.apps[0]}/` : '/');
  // The user of the login this browser keeps, or null.
  const storedUser = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.user ?? null; }
    catch { return null; }
  };
  window.Rux = window.Rux || {};
  window.Rux.access = { accessOf, appOf, canEnter, allows, landing, storedUser };

  const open = () => document.documentElement.setAttribute('data-rux-open', '');
  const path = location.pathname;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if ((local && !new URLSearchParams(location.search).has('cloud'))
      || path.startsWith('/login/') || path.startsWith('/scheduler/share/')) {
    open();
    return;
  }

  const user = storedUser();
  const granted = accessOf(user);
  if (!user || user.is_anonymous || !canEnter(granted)) {
    location.replace(`/login/?next=${encodeURIComponent(path + location.search + location.hash)}`);
    return;
  }
  if (!allows(granted, path)) {
    location.replace(landing(granted));
    return;
  }
  open();
})();
