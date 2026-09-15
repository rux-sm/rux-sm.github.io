/* ==========================================================================
   Rux Apps — ACCOUNT
   --------------------------------------------------------------------------
   Loads after Design's js/profile.js, and syncs window.Rux.profile on pages
   that have the account panel. Holds the site's one Supabase client
   and the staff log-in. A staff account is a Supabase user linked to a row
   in public.profiles, which my_staff_profile() returns. There is no
   anonymous session and no GitHub or Google log-in: a visitor without a
   staff session uses these pages with the profile this browser keeps.

   WITH A STAFF SESSION the name and theme sync to platform.profiles, cloud
   first on load and local edits pushed up after, debounced. A team account,
   one whose profile lacks sees_all_apps, has the app switcher hidden. Which
   pages any account opens is /funnel.js's.

   THE PUBLISHABLE KEY AND THE TURNSTILE SITE KEY ARE NOT SECRETS. Both are
   meant to sit in client code; the paired secret keys stay in the Supabase
   project's settings. Captcha protection is on for the project, so every
   log-in carries a Turnstile token.

   window.Rux.account IS THE ONE CLIENT for anything that needs Supabase
   beyond the panel. A second createClient() on the same storage key is
   undefined behaviour in supabase-js. */
(async () => {
  'use strict';
  // Absent on a page without the account panel, such as the log-in page, where
  // the client and log-in still work and nothing syncs to a profile.
  const profile = window.Rux?.profile;
  if (!window.supabase) return;

  // A LOCAL PREVIEW NEVER TOUCHES THE CLOUD, so a `npm run serve` visit does
  // not reach production auth; `?cloud` on the URL opts back in.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  if (local && !new URLSearchParams(location.search).has('cloud')) {
    console.info('account: local preview, cloud sync off (add ?cloud to the URL to enable)');
    return;
  }

  const SUPABASE_URL = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';
  const TURNSTILE_SITE_KEY = '0x4AAAAAAEmfPE09UcbC-aRI';
  // The same rule as rux-ui's js/core/staff-username.js: a username is that
  // name on the reserved staff domain, which nobody can own; a full email
  // address is used as typed.
  const STAFF_EMAIL_DOMAIN = 'staff.invalid';
  // STORAGE_KEY is supabase-js's own default for this project, which
  // /funnel.js reads by name, so the two files cannot drift.
  const STORAGE_KEY = 'sb-udnmqhayzhrbltxzzhjw-auth-token';
  const TEAM_KEY = 'rux.team-account';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: STORAGE_KEY } });
  const profiles = () => sb.schema('platform').from('profiles');

  const usernameToEmail = input => {
    const value = String(input ?? '').trim().toLowerCase();
    if (!value) return null;
    if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : null;
    return /^[a-z0-9._-]{1,40}$/.test(value) ? `${value}@${STAFF_EMAIL_DOMAIN}` : null;
  };

  // One Turnstile token for one log-in attempt, rendered into `host`. A token
  // works once, so each attempt replaces the widget before asking again.
  let widget = null;
  const captchaToken = host => new Promise(resolve => {
    let tries = 0;
    const attempt = () => {
      if (!window.turnstile) {
        if (++tries > 50) return resolve(null);
        return setTimeout(attempt, 200);
      }
      try {
        if (widget !== null) window.turnstile.remove(widget);
        widget = window.turnstile.render(host, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          callback: token => resolve(token),
          'error-callback': () => resolve(null),
          'expired-callback': () => resolve(null),
        });
      } catch { resolve(null); }
    };
    attempt();
  });

  // The signed-in staff profile, or null for no session, an anonymous one, or
  // an account with no linked profile.
  const staffProfile = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || session.user.is_anonymous) return null;
    const { data, error } = await sb.rpc('my_staff_profile');
    if (error) throw new Error(error.message);
    return data ?? null;
  };

  // Resolves null once a staff account is signed in, or a sentence to show.
  const signInStaff = async (username, password, captchaHost) => {
    const email = usernameToEmail(username);
    if (!email) return 'Type your username.';
    if (!password) return 'Type your password.';
    const token = await captchaToken(captchaHost);
    if (!token) return "The security check didn't finish. Try again.";
    const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
    if (error) {
      return /invalid login/i.test(error.message)
        ? "That username and password don't match."
        : "Can't log in right now. Try again.";
    }
    const staff = await staffProfile().catch(() => null);
    if (!staff) {
      await sb.auth.signOut().catch(() => {});
      return "This account isn't set up for this app.";
    }
    return null;
  };

  // The site's log-in page: resolves null once an account with access is
  // logged in, or a sentence to show. An account with no owner switch and no
  // ticked apps is logged straight out again. Access is read by
  // window.Rux.access, which /funnel.js defines on every page that uses this.
  const signIn = async (username, password, captchaHost) => {
    const email = usernameToEmail(username);
    if (!email) return 'Type your username.';
    if (!password) return 'Type your password.';
    const token = await captchaToken(captchaHost);
    if (!token) return "The security check didn't finish. Try again.";
    const { data, error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: token } });
    if (error) {
      return /invalid login/i.test(error.message)
        ? "That username and password don't match."
        : "Can't log in right now. Try again.";
    }
    const access = window.Rux.access;
    if (!access?.canEnter(access.accessOf(data.user))) {
      await sb.auth.signOut().catch(() => {});
      return "This account can't open any app yet. Ask the owner to give it one.";
    }
    return null;
  };

  window.Rux.account = {
    client: sb,
    getSession: () => sb.auth.getSession().then(r => r.data.session),
    signOut: () => sb.auth.signOut(),
    signIn,
    signInStaff,
    staffProfile,
    onAuthChange: callback => sb.auth.onAuthStateChange((event, session) => callback(event, session)),
  };

  const panel = document.getElementById('rux-account-panel');
  const panelButton = panel?.querySelector('#rux-profile-sign-in');

  // THE STAFF SIDE OF A PAGE, run once: at load for a session that already
  // exists, or when someone logs in on the page, as the scheduler's form does.
  let staffReady = false;
  const setupStaff = async session => {
    if (staffReady || !profile || !session || session.user.is_anonymous) return;
    let staff = null;
    try { staff = await staffProfile(); } catch { return; }
    if (!staff || staffReady) return;
    staffReady = true;

    // A team account has no switcher. Which pages any account opens is
    // /funnel.js's.
    if (!staff.sees_all_apps) {
      try { localStorage.setItem(TEAM_KEY, session.user.id); } catch {}
      document.querySelector('.rux--header__action[aria-controls="rux-switcher-panel"]')?.setAttribute('hidden', '');
      document.getElementById('rux-switcher-panel')?.setAttribute('hidden', '');
    } else {
      try { localStorage.removeItem(TEAM_KEY); } catch {}
    }
    if (staff.sees_all_apps && panelButton) {
      // THE ONE DOOR INTO THE FULLER ACCOUNT PAGE, for the account that sees
      // every app; a team account has no reason to leave the scheduler.
      const link = document.createElement('a');
      link.className = 'rux--link rux--link--inline';
      link.href = '/account/';
      link.textContent = 'Account settings';
      panelButton.insertAdjacentElement('afterend', link);
    }

    // The panel's one button becomes Log out. profile.js reveals it only when
    // something registers a handler.
    profile.onSignIn(async () => {
      await sb.auth.signOut().catch(() => {});
      location.reload();
    });
    if (panelButton) panelButton.textContent = 'Log out';

    const uid = session.user.id;
    try {
      const { data: row } = await profiles().select('display_name, theme').eq('id', uid).maybeSingle();
      const patch = {};
      if (row?.display_name != null) patch.name = row.display_name;
      if (row?.theme != null) patch.theme = row.theme;
      if (Object.keys(patch).length) profile.set(patch);
      if (!row) {
        const localProfile = profile.get();
        await profiles().upsert({ id: uid, display_name: localProfile.name ?? null, theme: localProfile.theme ?? null });
      }
    } catch { /* platform unreachable: the local profile stands */ }

    let timer;
    profile.onChange(p => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        profiles().update({ display_name: p.name ?? null, theme: p.theme ?? null }).eq('id', uid)
          .then(() => {}, () => {});
      }, 500);
    });
  };

  // Someone logging in on the page gets the staff side without a reload. The
  // work runs after the callback returns, because supabase-js must not be
  // awaited inside its own auth callback.
  sb.auth.onAuthStateChange((event, next) => {
    if (event === 'SIGNED_IN') setTimeout(() => setupStaff(next), 0);
    if (event === 'SIGNED_OUT') try { localStorage.removeItem(TEAM_KEY); } catch {}
  });

  let session;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch { return; }
  // AN ANONYMOUS SESSION LEFT FROM BEFORE LOG-IN WAS STAFF-ONLY ENDS HERE, so
  // nothing syncs to it; this browser keeps its theme locally.
  if (session?.user.is_anonymous) {
    await sb.auth.signOut().catch(() => {});
    return;
  }
  await setupStaff(session);
})();
