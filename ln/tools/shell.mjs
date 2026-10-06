// shell.mjs -- the site header LN Guide carries: the menu button, the
// name, the account and app-switcher panels, and the side nav, whose links the
// build puts where {{nav}} is. It is Design's shell with LN Guide's name and logo.

export const shell = `<header class="rux--header" data-theme="g100" aria-label="Rux LN Guide">
  <a class="rux--skip-to-content" href="#main-content">Skip to main content</a>
  <button type="button" class="rux--header__action rux--header__menu-trigger rux--header__menu-toggle" aria-label="Open menu" aria-expanded="false"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-menu"/></svg></button>
  <a class="rux--header__name" href="./"><img src="brand/logo.svg" alt="" style="height:1.5rem;width:auto;margin-right:.5rem;flex:none"><span class="rux--header__name--prefix">Rux</span>&nbsp;LN Guide</a>
  <div class="rux--header__global">
    <button type="button" class="rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only" aria-label="Account" aria-expanded="false" aria-controls="rux-account-panel"><svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#i-user--avatar"/></svg></button>
    <button type="button" class="rux--header__action rux--btn rux--layout--size-lg rux--btn--ghost rux--btn--icon-only" aria-label="App switcher" aria-expanded="false" aria-controls="rux-switcher-panel"><svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-grid"/></svg></button>
  </div>
  <div class="rux--header-panel" id="rux-switcher-panel">
    <ul class="rux--switcher" aria-label="Applications">
    <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/">Home</a></li>
    <li><hr class="rux--switcher__item--divider"></li>
    <li class="rux--switcher__item"><a class="rux--switcher__item-link" href="/ln/" aria-current="page">LN Guide</a></li>
  </ul>
  </div>
  <div class="rux--header-panel" id="rux-account-panel">
    <div class="rux--layer-two rux--stack-vertical rux--stack-scale-5">
      <div class="rux--form-item rux--text-input-wrapper">
        <div class="rux--text-input__label-wrapper">
          <label class="rux--label" for="rux-profile-name">Display name</label>
        </div>
        <div class="rux--text-input__field-outer-wrapper">
          <div class="rux--text-input__field-wrapper">
            <input id="rux-profile-name" class="rux--text-input" type="text" autocomplete="nickname" placeholder="Saved in this browser">
          </div>
        </div>
      </div>
      <div class="rux--form-item">
        <fieldset class="rux--radio-button-group rux--radio-button-group--label-right rux--radio-button-group--vertical" id="rux-profile-theme">
          <legend class="rux--label">Theme</legend>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-white" class="rux--radio-button" type="radio" name="rux-theme" value="white" checked>
            <label for="rux-theme-white" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">White</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g10" class="rux--radio-button" type="radio" name="rux-theme" value="g10">
            <label for="rux-theme-g10" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 10</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g90" class="rux--radio-button" type="radio" name="rux-theme" value="g90">
            <label for="rux-theme-g90" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 90</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-g100" class="rux--radio-button" type="radio" name="rux-theme" value="g100">
            <label for="rux-theme-g100" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Gray 100</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-geist-dark" class="rux--radio-button" type="radio" name="rux-theme" value="geist-dark">
            <label for="rux-theme-geist-dark" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Geist dark</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-ant-dark" class="rux--radio-button" type="radio" name="rux-theme" value="ant-dark">
            <label for="rux-theme-ant-dark" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Ant dark</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-spotify-dark" class="rux--radio-button" type="radio" name="rux-theme" value="spotify-dark">
            <label for="rux-theme-spotify-dark" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Spotify dark</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-apple-light" class="rux--radio-button" type="radio" name="rux-theme" value="apple-light">
            <label for="rux-theme-apple-light" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Apple light</span>
            </label>
          </div>
          <div class="rux--radio-button-wrapper">
            <input id="rux-theme-apple-dark" class="rux--radio-button" type="radio" name="rux-theme" value="apple-dark">
            <label for="rux-theme-apple-dark" class="rux--radio-button__label">
              <span class="rux--radio-button__appearance"></span>
              <span class="rux--radio-button__label-text">Apple dark</span>
            </label>
          </div>
        </fieldset>
      </div>
      <button type="button" class="rux--btn rux--btn--tertiary" id="rux-profile-sign-in" hidden>Sign in</button>
    </div>
  </div>
  <div class="rux--side-nav__overlay"></div>
  <nav class="rux--side-nav__navigation rux--side-nav rux--side-nav--ux rux--side-nav--hidden" aria-label="Side navigation">
    {{nav}}
  </nav>
</header>
`;
