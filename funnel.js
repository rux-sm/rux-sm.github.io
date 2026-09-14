/* ==========================================================================
   Rux Apps — FUNNEL
   --------------------------------------------------------------------------
   A team account uses only the scheduler: every page outside /scheduler/
   loads this first in its <head> and sends that account there before the
   page draws. A team account is a staff profile without sees_all_apps;
   account.js records its user id under rux.team-account when it logs in and
   clears it on log out. This file compares that record with the session
   supabase-js keeps, so it needs no network and waits for nothing.

   A WALL, NOT SECURITY. The database rules decide what staff data anyone can
   reach; this only keeps a team account inside the app it was given. */
(() => {
  'use strict';
  if (location.pathname.startsWith('/scheduler/')) return;
  try {
    const team = localStorage.getItem('rux.team-account');
    if (!team) return;
    const session = JSON.parse(localStorage.getItem('sb-udnmqhayzhrbltxzzhjw-auth-token') || 'null');
    if (session?.user?.id === team) location.replace('/scheduler/');
  } catch { /* storage blocked or unreadable: nothing to compare */ }
})();
