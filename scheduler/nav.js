/* ==========================================================================
   nav.js — THE SIDE NAV'S MAINTENANCE LINK
   --------------------------------------------------------------------------
   The maintenance page opens by its link's token, and the token is a secret
   this public repository cannot hold. So the nav item starts hidden, and for
   a staff account this reads the current token through
   get_maintenance_schedule_share, fills in the address and shows the item.
   With no active link, no staff profile or no connection, as in a local
   preview, the item stays hidden. It never creates a link; rux-ui's
   maintenance button does that.
   ========================================================================== */
(async () => {
  'use strict';
  const item = document.getElementById('scheduler-nav-maintenance');
  const account = window.Rux?.account;
  if (!item || !account?.staffProfile) return;
  try {
    if (!(await account.staffProfile())) return;
    const { data, error } = await account.client.rpc('get_maintenance_schedule_share');
    if (error || !data?.token) return;
    item.querySelector('a').href = `share/maintenance.html?s=${encodeURIComponent(data.token)}`;
    item.hidden = false;
  } catch { /* no link to offer: the item stays hidden */ }
})();
