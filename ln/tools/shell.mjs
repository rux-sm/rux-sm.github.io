// shell.mjs -- the site header LN Guide carries: the menu button, the
// name, the account action and its panel, and the side nav, whose links the
// build passes in. It is Design's shell with LN Guide's name and
// logo, and the action and the panel are Design's own, written once in
// design/tools/lib/shell.mjs.
//
// `shellAt(base, nav)` takes the prefix a page a folder down reaches the
// app's files by, and the nav. The nav stands beside the content on a wide
// screen, as Design's document-page template has it, and the menu button
// opens it on a narrow one.
import { accountAction, accountPanel } from '../../design/tools/lib/shell.mjs';

export const shellAt = (base, nav) => `<header class="rux--header" data-theme="g100" aria-label="Rux LN Guide">
  <a class="rux--skip-to-content" href="#main-content">Skip to main content</a>
  <button type="button" class="rux--header__action rux--header__menu-trigger rux--header__menu-toggle rux--header__menu-toggle__hidden" aria-label="Open menu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-menu"/></svg></button>
  <a class="rux--header__name" href="${base || './'}"><img src="${base}brand/logo.svg" alt="" style="height:1.5rem;width:auto;margin-right:.5rem;flex:none"><span class="rux--header__name--prefix">Rux</span>&nbsp;LN Guide</a>
  <div class="rux--header__global">
${accountAction()}
  </div>
${accountPanel()}
  <div class="rux--side-nav__overlay"></div>
  <nav class="rux--side-nav__navigation rux--side-nav rux--side-nav--ux" aria-label="Side navigation">
    ${nav}
  </nav>
</header>
`;
