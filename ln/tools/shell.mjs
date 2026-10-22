// shell.mjs -- the site header LN Guide carries: the menu button, the
// name, the account action and its panel, and the side nav, whose links the
// build puts where {{nav}} is. It is Design's shell with LN Guide's name and
// logo, and the action and the panel are Design's own, written once in
// design/tools/lib/shell.mjs.
//
// `shell` is the one-page LN Guide's, with the nav hidden until the menu
// button opens it. `shellAt(base, nav)` is the pages', written into folders
// a level down, so its paths are prefixed; its nav stands beside the content
// on a wide screen, as Design's document-page template has it, and the menu
// button opens it on a narrow one.
import { accountAction, accountPanel } from '../../design/tools/lib/shell.mjs';

const header = (base, home, toggle, nav) => `<header class="rux--header" data-theme="g100" aria-label="Rux LN Guide">
  <a class="rux--skip-to-content" href="#main-content">Skip to main content</a>
  <button type="button" class="rux--header__action rux--header__menu-trigger rux--header__menu-toggle${toggle}" aria-label="Open menu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-menu"/></svg></button>
  <a class="rux--header__name" href="${home}"><img src="${base}brand/logo.svg" alt="" style="height:1.5rem;width:auto;margin-right:.5rem;flex:none"><span class="rux--header__name--prefix">Rux</span>&nbsp;LN Guide</a>
  <div class="rux--header__global">
${accountAction()}
  </div>
${accountPanel()}
  <div class="rux--side-nav__overlay"></div>
  <nav class="rux--side-nav__navigation rux--side-nav rux--side-nav--ux${nav}" aria-label="Side navigation">
    {{nav}}
  </nav>
</header>
`;

export const shell = header('', './', '', ' rux--side-nav--hidden');
export const shellAt = (base, nav) => header(base, `${base}home.html`, ' rux--header__menu-toggle__hidden', '').replace('{{nav}}', nav);
