/* ==========================================================================
   Rux Apps — FUNNEL
   --------------------------------------------------------------------------
   Every page outside /scheduler/ loads this first in its <head>.

   ACCESS, SHARED. window.Rux.access says which pages an account's access
   opens and where it lands, for the log-in page. Access is the owner switch
   and the ticked apps in the account's app_metadata. An app is a page's first
   path segment; the root, account/ and login/ are Home, which every account
   with access opens.

   A TEAM ACCOUNT uses only the scheduler, and is sent there before the page
   draws. A team account is a staff profile without sees_all_apps; account.js
   records its user id under rux.team-account when it logs in and clears it on
   log out. This file compares that record with the session supabase-js keeps,
   so it needs no network and waits for nothing.

   A WALL, NOT SECURITY. The database rules decide what staff data anyone can
   reach; this only keeps an account inside the apps it was given. */
(() => {
  'use strict';
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
  window.Rux = window.Rux || {};
  window.Rux.access = { accessOf, appOf, canEnter, allows, landing };

  if (location.pathname.startsWith('/scheduler/')) return;
  try {
    const team = localStorage.getItem('rux.team-account');
    if (!team) return;
    const session = JSON.parse(localStorage.getItem('sb-udnmqhayzhrbltxzzhjw-auth-token') || 'null');
    if (session?.user?.id === team) location.replace('/scheduler/');
  } catch { /* storage blocked or unreadable: nothing to compare */ }
})();
