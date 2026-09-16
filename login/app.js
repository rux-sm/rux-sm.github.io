/* ==========================================================================
   login/app.js — the site's log-in page
   --------------------------------------------------------------------------
   An address opened without a log-in comes here as /login/?next=<address>.
   After logging in, the account goes to that address when its access opens
   it, and otherwise to its landing: Home, or its one app when it has only one.
   window.Rux.access, from /funnel.js, decides both. Only a path on this site
   is accepted as next, so the page cannot send anyone elsewhere. An account
   already logged in is sent on at once.
   ========================================================================== */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('login-form');
  const username = $('login-username');
  const password = $('login-password');
  const submit = $('login-submit');
  const say = text => { $('login-error-text').textContent = text || ''; $('login-error').hidden = !text; };
  const access = window.Rux?.access;
  const account = window.Rux?.account;

  // The remembered address: a path on this site, and never the log-in page.
  const next = (() => {
    const raw = new URLSearchParams(location.search).get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
    try {
      const url = new URL(raw, location.origin);
      if (url.origin !== location.origin || url.pathname.startsWith('/login')) return null;
      return url.pathname + url.search + url.hash;
    } catch { return null; }
  })();

  const goOn = user => {
    const granted = access.accessOf(user);
    location.replace(next && access.allows(granted, next) ? next : access.landing(granted));
  };

  // A local preview has no account layer, except the cloud preview on :8641.
  if (!account?.signIn || !access) {
    say('This preview has no log-in. Open http://localhost:8641/, the cloud preview, to log in.');
    submit.disabled = true;
    return;
  }

  try {
    const session = await account.getSession();
    if (session && !session.user.is_anonymous && access.canEnter(access.accessOf(session.user))) {
      goOn(session.user);
      return;
    }
  } catch { /* the form stands */ }

  username.focus();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    submit.disabled = true;
    say('');
    try {
      const problem = await account.signIn(username.value, password.value, $('login-captcha'));
      password.value = '';
      if (problem) { say(problem); return; }
      goOn((await account.getSession()).user);
    } catch {
      say("Can't log in right now. Try again.");
    } finally {
      submit.disabled = false;
    }
  });
})();
