//
// ONE SHELL, EMITTED ONCE, FOR EVERY PAGE THIS REPOSITORY PUBLISHES.
//
// A shell hand-kept in each page's own generator drifts the way four copies
// of anything drift, and a design system's own pages disagreeing about the
// design system's own shell is the specific embarrassment this removes.
//
// THREE PAGES CALL shell() DIRECTLY FROM THEIR GENERATORS. index.html is
// hand-written -- prose and a tile grid nobody wants inside a template literal
// -- so tools/inline-shell.mjs splices the same output between two markers in
// it, the way tools/build-icons.mjs splices the sprite into templates/. Same bytes,
// two delivery routes, no fifth copy.
//
// THE SHAPE, and why each part is the way it is:
//
//   COLLAPSIBLE, NOT PERSISTENT. The toggle carries no
//   `__menu-toggle__hidden`, so the hamburger is on screen at every width, and
//   the nav carries `--side-nav--hidden` and opens over the page.
//   js/ui-shell.js names both configurations and calls this one legitimate;
//   templates/ ship the other. Chosen for these pages because none of them
//   wants a 256px column standing open beside its content.
//
//   THE NAV HOLDS PAGES. IBM's UI shell guidance puts the header at the
//   highest level of navigation and the left panel one tier below it, and says
//   content beneath that tier belongs in tabs within the page rather than in
//   the nav. kitchen-sink.html's section links are the wrong tier for it. A
//   page's own sections are the page's.
//
//   NO HEADER MENU BAR. The same four links in a bar above the panel that
//   holds them is duplication, and the bar is the part that goes: the panel is
//   where Carbon puts a product's navigation.
//
//   NO 18rem CONTENT OFFSET. `.rux--content` is indented only when a nav sits
//   BESIDE it. This one overlays, so an offset would be a permanent gap next
//   to nothing. templates/app-shell.html keeps its offset because it keeps the
//   persistent shell.
//
// WHAT THIS SHELL COSTS, quoted from js/ui-shell.js rather than rediscovered
// once per page: Carbon tightens the app name to 8px of inline start whenever
// the toggle lacks `__hidden`, at every width and with no media query, so
// check-spacing reports 8px against a capture taken from the persistent shell.
// It is correct and there is no capture of this shell to compare against.
//
// NOT USED BY templates/. Those are worked examples an app copies, and they
// ship the persistent shell deliberately. Nothing here should reach them.
//

// THE SHELL'S OWN SCRIPTS, because a panel nobody wired is an affordance that
// lies — the rule js/ states about itself. The account panel carries the
// theme's select, and js/profile.js is what listens to it: a page with the
// panel and without the script picks a theme and moves nothing, and a stored
// theme renders white because nothing applies it.
//
// TWO PLACES, AND THE SPLIT IS NOT COSMETIC. The first pair goes in <head>,
// BEFORE the stylesheets paint, because js/theme.js puts the stored theme on
// <html> and doing that after first paint is a visible flash of the wrong
// theme. js/profile.js needs the panel to exist, so it goes at the end of
// <body> with the other modules. A generator that emits the shell must emit
// both.
export const shellHead = () => `<script src="js/custom-themes.js"></script>
<script src="js/theme.js"></script>`;

export const shellScripts = () => `<script src="js/profile.js"></script>
<script src="/switcher.js"></script>`;

// The four pages, in nav order. Order is deliberate and not alphabetical:
// home is the front door, the sink the reference, and the two tools follow.
// `file` is what every page links to — these all sit at the root together, so
// no prefix is needed and none is offered.
export const PAGES = [
  // HOME IS index.html AND IT IS NOT THE SWITCHER'S HOME. The switcher's Home
  // is the ACCOUNT root, another product entirely; this is Design's own front
  // door, the page /design/ serves. Two tiers, two panels, which is the
  // layering Carbon's shell exists to express — and until 2026-09-11 this page
  // was reachable only through the switcher's "Design System" entry, which is
  // the app-switcher tier reaching sideways at its own app.
  { id: 'index', file: 'index.html', label: 'Home' },
  { id: 'kitchen-sink', file: 'kitchen-sink.html', label: 'Kitchen sink' },
  { id: 'builder', file: 'builder.html', label: 'Page builder' },
  { id: 'theme-creator', file: 'theme-creator.html', label: 'Theme creator' },
];

// THE ACCOUNT PANEL, the one panel the header's one action opens, and the
// one place its markup is written. shell() emits it into the pages a
// generator writes, and tools/inline-account.mjs splices the same bytes
// between two markers in every template, so no page keeps a copy of its own
// to drift.
//
// WHAT IS IN IT, top to bottom, is two of Carbon's switcher lists. The first
// is the account's own rows: Profile, which opens the Account page; the
// theme, as Carbon's inline select, which says the theme in use and opens the
// list in place; and Log out, a link to the log-in page that the script
// behind it turns into the act. Profile and Log out ship hidden: /account.js
// shows them once someone is logged in, and writes who that is above them.
// The second list is the apps that account can open. /switcher.js fills it
// from /switcher.json and leaves it out where there is only the app the page
// is, so its one entry here is what stays when that fetch fails.
//
// THE THEMES ARE GENERATED rather than pasted. White is selected because a
// page ships `data-theme="white"`; js/profile.js selects whichever one
// storage holds on load, and adds an option for each saved custom theme.
const THEME_NAMES = [
  ['white', 'White'], ['g10', 'Gray 10'], ['g90', 'Gray 90'], ['g100', 'Gray 100'],
  ['geist-dark', 'Geist dark'], ['ant-dark', 'Ant dark'], ['spotify-dark', 'Spotify dark'],
  ['apple-light', 'Apple light'], ['apple-dark', 'Apple dark'],
  ['rux-dark', 'Rux dark'], ['pixel-dark', 'Pixel dark'],
];

const themeOptions = () => THEME_NAMES.map(([value, label]) =>
`                  <option class="rux--select-option" value="${value}"${value === 'white' ? ' selected' : ''}>${label}</option>`).join('\n');

export const accountAction = () =>
`    <button type="button" class="rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only" aria-label="Account" aria-expanded="false" aria-controls="rux-account-panel"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-user--avatar"/></svg></button>`;

export const accountPanel = () =>
`  <div class="rux--header-panel" id="rux-account-panel">
    <ul class="rux--switcher" aria-label="Account">
      <li class="rux--switcher__item" id="rux-account-profile" hidden><a class="rux--switcher__item-link" href="/account/">Profile</a></li>
      <li>
        <div class="rux--form-item">
          <div class="rux--select rux--select--inline rux--layout--size-md">
            <label class="rux--label" for="rux-profile-theme">Theme</label>
            <div class="rux--select-input--inline__wrapper">
              <div class="rux--select-input__wrapper">
                <select id="rux-profile-theme" class="rux--select-input">
${themeOptions()}
                </select>
                <svg class="rux--select__arrow" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-chevron--down"/></svg>
              </div>
            </div>
          </div>
        </div>
      </li>
      <li class="rux--switcher__item" hidden><a class="rux--switcher__item-link" href="/login/" id="rux-profile-sign-in">Log out</a></li>
    </ul>
    <ul class="rux--switcher" aria-label="Applications">
      <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/">Home</a></li>
    </ul>
  </div>`;

const navItems = current => PAGES.map(p => {
  const active = p.id === current;
  return `      <li class="rux--side-nav__item${active ? ' rux--side-nav__item--active' : ''}">`
    + `<a class="rux--side-nav__link" href="${p.file}"${active ? ' aria-current="page"' : ''}>`
    + `<span class="rux--side-nav__link-text">${p.label}</span></a></li>`;
}).join('\n');

// `current` is one of PAGES' ids. An id this does not know throws rather than
// emitting a shell with nothing marked current — a nav that never says where
// you are is the failure this whole change is about, and a silent one would be
// worse than a build that stops.
export function shell(current) {
  if (!PAGES.some(p => p.id === current))
    throw new Error(`shell(): unknown page "${current}" — expected one of ${PAGES.map(p => p.id).join(', ')}`);
  return `<header class="rux--header" data-theme="g100" aria-label="Rux Design">
  <a class="rux--skip-to-content" href="#main-content">Skip to main content</a>
  <button type="button" class="rux--header__action rux--header__menu-trigger rux--header__menu-toggle" aria-label="Open menu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-menu"/></svg></button>
  <a class="rux--header__name" href="./"><img src="brand/logo.svg" alt="" style="height:2rem;width:auto;margin-right:.5rem;flex:none"><span class="rux--header__name--prefix">Rux</span>&nbsp;Design</a>
  <div class="rux--header__global">
${accountAction()}
  </div>
${accountPanel()}

  <div class="rux--side-nav__overlay"></div>
  <nav class="rux--side-nav__navigation rux--side-nav rux--side-nav--ux rux--side-nav--hidden" aria-label="Pages">
    <ul class="rux--side-nav__items">
${navItems(current)}
    </ul>
  </nav>
</header>`;
}
