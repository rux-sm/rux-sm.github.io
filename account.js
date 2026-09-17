/* ==========================================================================
   Rux Apps — ACCOUNT
   --------------------------------------------------------------------------
   Loads after Design's js/profile.js, and syncs window.Rux.profile on pages
   that have the account panel. Holds the site's one Supabase client
   and the log-in /login/ uses. A staff account is a Supabase user linked to a row
   in public.profiles, which my_staff_profile() returns. There is no
   anonymous session and no GitHub or Google log-in. Without a login, as in a
   local preview, these pages use the profile this browser keeps.

   WITH A LOGIN, staff or not, the account panel offers Account settings and
   Log out, and the name and theme sync to platform.profiles, cloud first on
   load and local edits pushed up after, debounced. Which pages any
   account opens is /funnel.js's, and which apps the switcher lists is
   /switcher.js's.

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
  // not reach production auth. The cloud preview, `npm run serve -- --cloud`,
  // is the one loopback port that does: a port rather than a flag on the
  // address, so no redirect or link can drop it, and a bookmark keeps it.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    && location.port !== '8641';
  if (local) {
    console.info('account: local preview, cloud sync off (the cloud preview is http://localhost:8641/)');
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

  /* THE PERSON'S AVATAR is Carbon's user-avatar: their photo when the profile
     has one, otherwise their initials on a colour. A staff account's name,
     photo and colour are its public.profiles row, as rux-ui draws them; any
     other account's name is the one the account panel keeps. */
  const PHOTO_BUCKET = 'profile-photos';
  const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
  // Full class names, never built from parts, so the check can see each one.
  const ORDER_CLASSES = [
    'rux--user-avatar--order-1-cyan', 'rux--user-avatar--order-2-gray', 'rux--user-avatar--order-3-green',
    'rux--user-avatar--order-4-magenta', 'rux--user-avatar--order-5-purple', 'rux--user-avatar--order-6-teal',
    'rux--user-avatar--order-7-cyan', 'rux--user-avatar--order-8-gray', 'rux--user-avatar--order-9-green',
    'rux--user-avatar--order-10-magenta', 'rux--user-avatar--order-11-purple', 'rux--user-avatar--order-12-teal',
  ];
  // rux-ui's colour names as its avatar paints them, cyan as teal. Amber, and
  // orange and yellow, which rux-ui paints amber, have no Carbon order.
  const COLOUR_ORDERS = {
    teal: 'rux--user-avatar--order-6-teal', cyan: 'rux--user-avatar--order-6-teal',
    green: 'rux--user-avatar--order-3-green', purple: 'rux--user-avatar--order-5-purple',
    pink: 'rux--user-avatar--order-4-magenta',
  };
  const PHOTO_SIZES = {
    sm: 'rux--user-avatar__photo--sm', md: 'rux--user-avatar__photo--md',
    lg: 'rux--user-avatar__photo--lg', xl: 'rux--user-avatar__photo--xl',
  };
  // The first letters of the first two words, or the first two of one word.
  const initials = name => {
    const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
  };
  // A colour no profile names is one of the twelve, stable for the id.
  const hashedOrder = seed => {
    let h = 0;
    for (const ch of String(seed ?? '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return ORDER_CLASSES[h % ORDER_CLASSES.length];
  };
  const photoUrl = path => (path ? sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl : null);

  // Who is logged in: { id, name, photoPath, colour, staff }, or null. Read once.
  let personPromise = null;
  const person = () => (personPromise ??= (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session || session.user.is_anonymous) return null;
    let staff = null;
    try { staff = await staffProfile(); } catch { /* drawn from the account instead */ }
    if (staff) {
      return { id: staff.id, name: staff.display_name, photoPath: staff.photo_path, colour: staff.avatar_color, staff: true };
    }
    return { id: session.user.id, name: profile?.get().name ?? null, photoPath: null, colour: null, staff: false };
  })());

  // Every avatar on the page, redrawn when the person changes.
  const avatars = new Map();
  const draw = (host, who) => {
    host.classList.remove(...ORDER_CLASSES);
    host.classList.add(COLOUR_ORDERS[who.colour] || hashedOrder(who.id));
    host.textContent = initials(who.name);
    const url = photoUrl(who.photoPath);
    if (!url) return;
    const img = document.createElement('img');
    img.className = `rux--user-avatar__photo ${PHOTO_SIZES[avatars.get(host)] ?? PHOTO_SIZES.md}`;
    img.alt = '';
    // A photo that will not load leaves the initials showing.
    img.addEventListener('load', () => host.replaceChildren(img), { once: true });
    img.src = url;
  };
  const redraw = who => { for (const host of avatars.keys()) draw(host, who); };

  // Draws `host`, a `rux--user-avatar` element, for the logged-in person at
  // `size`. False when nobody is logged in.
  const showAvatar = async (host, size) => {
    const who = await person();
    if (!who) return false;
    avatars.set(host, size);
    draw(host, who);
    return true;
  };

  // A staff member's own photo, stored and removed as rux-ui does:
  // `<profile id>/photo-<milliseconds>.<extension>`, the old file first. Resolves
  // null, or a sentence to show.
  const setPhoto = async file => {
    const who = await person();
    if (!who?.staff) return 'Only a staff account has a photo.';
    if (file && !PHOTO_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, WebP or GIF picture.';
    if (file && file.size > PHOTO_MAX_BYTES) return 'Choose a picture under 5 MB.';
    const bucket = sb.storage.from(PHOTO_BUCKET);
    let path = null;
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      path = `${who.id}/photo-${Date.now()}.${ext}`;
      const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (error) return "The picture didn't upload. Try again.";
    }
    const { error } = await sb.from('profiles').update({ photo_path: path }).eq('id', who.id);
    if (error) {
      if (path) bucket.remove([path]).catch(() => {});
      return "The picture wasn't saved. Try again.";
    }
    // The old file is unused now; one that stays is only left behind.
    if (who.photoPath) bucket.remove([who.photoPath]).catch(() => {});
    who.photoPath = path;
    redraw(who);
    return null;
  };

  window.Rux.account = {
    client: sb,
    person,
    showAvatar,
    setPhoto,
    getSession: () => sb.auth.getSession().then(r => r.data.session),
    signOut: () => sb.auth.signOut(),
    signIn,
    staffProfile,
  };

  const panel = document.getElementById('rux-account-panel');
  const panelButton = panel?.querySelector('#rux-profile-sign-in');

  // THE ACCOUNT SIDE OF A PAGE, run at load once the login is confirmed, for
  // every account, staff or not: platform.profiles lets any login keep its
  // own row.
  const setupAccount = async session => {
    if (!profile || !session || session.user.is_anonymous) return;

    if (panelButton) {
      // The account panel's door into the Account page, which every account
      // with access opens.
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

    /* The header's Account action shows the person in place of its glyph,
       and says who it is. Another account's name follows the panel's. */
    const action = document.querySelector('.rux--header__action[aria-controls="rux-account-panel"]');
    if (action) {
      const avatar = document.createElement('div');
      avatar.className = 'rux--user-avatar rux--user-avatar--sm';
      avatar.setAttribute('aria-hidden', 'true');
      if (await showAvatar(avatar, 'sm')) {
        action.replaceChildren(avatar);
        const who = await person();
        const label = () => action.setAttribute('aria-label', who.name ? `Account, ${who.name}` : 'Account');
        label();
        if (!who.staff) profile.onChange(p => { who.name = p.name ?? null; label(); redraw(who); });
      }
    }

    let timer;
    profile.onChange(p => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        profiles().update({ display_name: p.name ?? null, theme: p.theme ?? null }).eq('id', uid)
          .then(() => {}, () => {});
      }, 500);
    });
  };

  let session;
  try { ({ data: { session } } = await sb.auth.getSession()); } catch { return; }
  // AN ANONYMOUS SESSION LEFT FROM BEFORE LOG-IN WAS STAFF-ONLY ENDS HERE, so
  // nothing syncs to it; this browser keeps its theme locally.
  if (session?.user.is_anonymous) {
    await sb.auth.signOut().catch(() => {});
    session = null;
  }

  /* THE LOGIN IS CONFIRMED once the page is open. /funnel.js opened the page
     from the login this browser keeps; the auth server says whether it still
     stands. A login the server refuses, such as one ended by a changed password
     or a deleted account, goes to the log-in page. A change to the account's
     access is taken into the stored login and applied to this page. A request
     with no answer, as when offline, changes nothing. A login that ends while
     the page is open, as by Log out in another tab, goes to the log-in page
     too. /login/ and /scheduler/share/ need no login, so they are not
     checked. */
  const access = window.Rux?.access;
  const path = location.pathname;
  if (access && !path.startsWith('/login/') && !path.startsWith('/scheduler/share/')) {
    const loginAddress = () => `/login/?next=${encodeURIComponent(path + location.search + location.hash)}`;
    const toLogin = async () => {
      await sb.auth.signOut({ scope: 'local' }).catch(() => {});
      location.replace(loginAddress());
    };
    if (!session) { await toLogin(); return; }
    const { data, error } = await sb.auth.getUser().catch(e => ({ data: null, error: e }));
    if (error) {
      if (window.supabase.isAuthApiError?.(error) && error.status >= 400 && error.status < 500) {
        await toLogin();
        return;
      }
    } else if (data?.user) {
      const granted = access.accessOf(data.user);
      if (JSON.stringify(granted) !== JSON.stringify(access.accessOf(session.user))) {
        await sb.auth.refreshSession().catch(() => {});
      }
      if (!access.canEnter(granted)) { await toLogin(); return; }
      if (!access.allows(granted, path)) { location.replace(access.landing(granted)); return; }
    }
    // Only a redirect, because supabase-js must not be called inside its own
    // auth callback.
    sb.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') location.replace(loginAddress());
    });
  }
  await setupAccount(session);
})();
