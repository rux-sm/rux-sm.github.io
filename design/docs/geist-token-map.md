---
type: reference
---

# Geist's dark tokens beside this theme's

Every colour `[data-theme="geist-dark"]` sets, against the Geist token that
best matches it. Geist's values are read from its own published Colors page
in dark mode and converted to sRGB; ours are read from `css/rux-theme.css`.

**201 colours. 70 land on a Geist token exactly, 52 sit within a
shade of one, and 79 have no Geist colour near them** -- the third column
then names the closest there is, which is a starting point and not a match.

A transparent value is only ever matched against a transparent Geist token, so
an overlay is never paired with a solid grey that happens to land on it over
black. Geist has no token for a hover, an active or a disabled state: its scale
is ten steps of each hue, and a component picks the step it wants.

**110 colours are not here,** because this theme never sets them and they keep
white's compiled values: 88 `syntax-*`, 21 `ai-*` and one `notification-*`.
Nothing in these apps draws them.

## Surfaces

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-background` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-background-active` | `rgba(255, 255, 255, 0.18)` | `--ds-gray-alpha-400 #ffffff/0.14` | close |
| `--rux-background-brand` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-background-hover` | `rgba(255, 255, 255, 0.06)` | `--ds-gray-alpha-100 #ffffff/0.06` | exact |
| `--rux-background-inverse` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-background-inverse-hover` | `#d4d4d4` | `--ds-gray-1000 #ededed` | nearest |
| `--rux-background-selected` | `rgba(255, 255, 255, 0.1)` | `--ds-gray-alpha-200 #ffffff/0.09` | close |
| `--rux-background-selected-hover` | `rgba(255, 255, 255, 0.14)` | `--ds-gray-alpha-400 #ffffff/0.14` | exact |
| `--rux-layer-01` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
| `--rux-layer-02` | `#111111` | `--ds-background-100 #0a0a0a` | close |
| `--rux-layer-03` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-layer-accent-01` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-layer-accent-02` | `#242424` | `--ds-gray-200 #1f1f1f` | close |
| `--rux-layer-accent-03` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-accent-active-01` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-layer-accent-active-02` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-layer-accent-active-03` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-layer-accent-hover-01` | `#242424` | `--ds-gray-200 #1f1f1f` | close |
| `--rux-layer-accent-hover-02` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-accent-hover-03` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-layer-active-01` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-active-02` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-layer-active-03` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-layer-background-01` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-layer-background-02` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
| `--rux-layer-background-03` | `#111111` | `--ds-background-100 #0a0a0a` | close |
| `--rux-layer-hover-01` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-layer-hover-02` | `#242424` | `--ds-gray-200 #1f1f1f` | close |
| `--rux-layer-hover-03` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-selected-01` | `#242424` | `--ds-gray-200 #1f1f1f` | close |
| `--rux-layer-selected-02` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-selected-03` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-layer-selected-disabled` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-layer-selected-hover-01` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-layer-selected-hover-02` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-layer-selected-hover-03` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-layer-selected-inverse` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-field-01` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
| `--rux-field-02` | `#111111` | `--ds-background-100 #0a0a0a` | close |
| `--rux-field-03` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-field-hover-01` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-field-hover-02` | `#242424` | `--ds-gray-200 #1f1f1f` | close |
| `--rux-field-hover-03` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-overlay` | `rgba(0, 0, 0, 0.72)` | `--ds-gray-alpha-900 #ffffff/0.61` | nearest |
| `--rux-skeleton-background` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-skeleton-element` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |

## Lines, text and icons

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-border-disabled` | `rgba(237, 237, 237, 0.25)` | `--ds-gray-alpha-500 #ffffff/0.24` | nearest |
| `--rux-border-interactive` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-border-inverse` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-border-strong-01` | `#606060` | `--ds-gray-500 #454545` | nearest |
| `--rux-border-strong-02` | `#666666` | `--ds-gray-800 #7d7d7d` | nearest |
| `--rux-border-strong-03` | `#888888` | `--ds-gray-600 #878787` | close |
| `--rux-border-subtle-00` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-border-subtle-01` | `#262626` | `--ds-gray-300 #292929` | close |
| `--rux-border-subtle-02` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-border-subtle-03` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-border-subtle-selected-01` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-border-subtle-selected-02` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-border-subtle-selected-03` | `#666666` | `--ds-gray-800 #7d7d7d` | nearest |
| `--rux-border-tile-01` | `#333333` | `--ds-gray-400 #2e2e2e` | close |
| `--rux-border-tile-02` | `#3f3f3f` | `--ds-gray-500 #454545` | close |
| `--rux-border-tile-03` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-text-disabled` | `rgba(237, 237, 237, 0.25)` | `--ds-gray-alpha-500 #ffffff/0.24` | nearest |
| `--rux-text-error` | `#ff6369` | `--ds-red-900 #ff565f` | nearest |
| `--rux-text-helper` | `#888888` | `--ds-gray-600 #878787` | close |
| `--rux-text-inverse` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-text-on-color` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-text-on-color-disabled` | `#8f8f8f` | `--ds-gray-700 #8f8f8f` | exact |
| `--rux-text-placeholder` | `rgba(237, 237, 237, 0.4)` | `--ds-gray-alpha-800 #ffffff/0.47` | nearest |
| `--rux-text-primary` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-text-secondary` | `#a1a1a1` | `--ds-gray-900 #a1a1a1` | exact |
| `--rux-link-inverse` | `#0070f3` | `--ds-blue-700 #006efe` | close |
| `--rux-link-inverse-active` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-link-inverse-hover` | `#0060d1` | `--ds-blue-800 #005be7` | nearest |
| `--rux-link-inverse-visited` | `#7c3aed` | `--ds-purple-600 #9440d5` | nearest |
| `--rux-link-primary` | `#52a8ff` | `--ds-blue-900 #47a8ff` | close |
| `--rux-link-primary-hover` | `#8fc7ff` | `--ds-blue-900 #47a8ff` | nearest |
| `--rux-link-secondary` | `#8fc7ff` | `--ds-blue-900 #47a8ff` | nearest |
| `--rux-link-visited` | `#bf7af0` | `--ds-purple-900 #c472fb` | nearest |
| `--rux-icon-disabled` | `rgba(237, 237, 237, 0.25)` | `--ds-gray-alpha-500 #ffffff/0.24` | nearest |
| `--rux-icon-interactive` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-icon-inverse` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-icon-on-color` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-icon-on-color-disabled` | `rgba(0, 0, 0, 0.4)` | `--ds-gray-alpha-800 #ffffff/0.47` | nearest |
| `--rux-icon-primary` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-icon-secondary` | `#a1a1a1` | `--ds-gray-900 #a1a1a1` | exact |

## Controls

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-focus` | `#ffffff` | `--ds-white #ffffff` | exact |
| `--rux-focus-inset` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-focus-inverse` | `#0070f3` | `--ds-blue-700 #006efe` | close |
| `--rux-interactive` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-highlight` | `#102a43` | `--ds-blue-200 #022248` | nearest |
| `--rux-shadow` | `rgba(0, 0, 0, 0.8)` | `--ds-gray-alpha-1000 #ffffff/0.92` | nearest |
| `--rux-toggle-off` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-button-primary` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-button-primary-hover` | `#d4d4d4` | `--ds-gray-1000 #ededed` | nearest |
| `--rux-button-primary-active` | `#a1a1a1` | `--ds-gray-900 #a1a1a1` | exact |
| `--rux-button-tertiary` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-button-tertiary-hover` | `#d4d4d4` | `--ds-gray-1000 #ededed` | nearest |
| `--rux-button-tertiary-active` | `#a1a1a1` | `--ds-gray-900 #a1a1a1` | exact |
| `--rux-button-secondary` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
| `--rux-button-secondary-hover` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-button-secondary-active` | `#2e2e2e` | `--ds-gray-400 #2e2e2e` | exact |
| `--rux-button-danger-primary` | `#e2162a` | `--ds-red-800 #e2162a` | exact |
| `--rux-button-danger-secondary` | `#ff565f` | `--ds-red-900 #ff565f` | exact |
| `--rux-button-danger-hover` | `#ff565f` | `--ds-red-900 #ff565f` | exact |
| `--rux-button-danger-active` | `#f13342` | `--ds-red-700 #f13342` | exact |
| `--rux-button-separator` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-button-disabled` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-content-switcher-background` | `rgba(0, 0, 0, 0)` | `--ds-gray-alpha-100 #ffffff/0.06` | nearest |
| `--rux-content-switcher-background-hover` | `rgba(141, 141, 141, 0.12)` | `--ds-gray-alpha-300 #ffffff/0.13` | nearest |
| `--rux-content-switcher-selected` | `rgba(141, 141, 141, 0.24)` | `--ds-gray-alpha-500 #ffffff/0.24` | nearest |

## Meaning

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-support-caution-major` | `#f97316` | `--ds-amber-800 #ff9300` | nearest |
| `--rux-support-caution-minor` | `#f5a623` | `--ds-amber-700 #ffae00` | nearest |
| `--rux-support-caution-undefined` | `#8e4ec6` | `--ds-purple-600 #9440d5` | nearest |
| `--rux-support-error` | `#f13342` | `--ds-red-700 #f13342` | exact |
| `--rux-support-error-inverse` | `#cd2b31` | `--ds-red-800 #e2162a` | nearest |
| `--rux-support-info` | `#52a8ff` | `--ds-blue-900 #47a8ff` | close |
| `--rux-support-info-inverse` | `#0070f3` | `--ds-blue-700 #006efe` | close |
| `--rux-support-success` | `#00ac3a` | `--ds-green-700 #00ac3a` | exact |
| `--rux-support-success-inverse` | `#2a7e3b` | `--ds-green-800 #009432` | nearest |
| `--rux-support-warning` | `#ffae00` | `--ds-amber-700 #ffae00` | exact |
| `--rux-support-warning-inverse` | `#d97706` | `--ds-amber-600 #ed9a00` | nearest |
| `--rux-notification-background-error` | `#220b0c` | `--ds-red-100 #330a11` | nearest |
| `--rux-notification-background-success` | `#0b190d` | `--ds-background-100 #0a0a0a` | nearest |
| `--rux-notification-background-info` | `#0c1926` | `--ds-gray-100 #1a1a1a` | nearest |
| `--rux-notification-background-warning` | `#251905` | `--ds-amber-100 #2a1700` | close |
| `--rux-notification-action-tertiary-inverse` | `#0f62fe` | `--ds-blue-700 #006efe` | nearest |
| `--rux-notification-action-tertiary-inverse-active` | `#002d9c` | `--ds-blue-500 #00418c` | nearest |
| `--rux-notification-action-tertiary-inverse-hover` | `#0050e6` | `--ds-blue-800 #005be7` | close |
| `--rux-notification-action-tertiary-inverse-text` | `#ffffff` | `--ds-white #ffffff` | exact |
| `--rux-notification-action-tertiary-inverse-text-on-color-disabled` | `#8d8d8d` | `--ds-gray-700 #8f8f8f` | close |
| `--rux-status-red` | `#fa4d56` | `--ds-red-900 #ff565f` | close |
| `--rux-status-orange` | `#ff832b` | `--ds-amber-800 #ff9300` | nearest |
| `--rux-status-orange-outline` | `#ff832b` | `--ds-amber-800 #ff9300` | nearest |
| `--rux-status-yellow` | `#f1c21b` | `--ds-amber-700 #ffae00` | nearest |
| `--rux-status-yellow-outline` | `#f1c21b` | `--ds-amber-700 #ffae00` | nearest |
| `--rux-status-green` | `#42be65` | `--ds-green-900 #00ca50` | nearest |
| `--rux-status-blue` | `#4589ff` | `--ds-blue-900 #47a8ff` | nearest |
| `--rux-status-purple` | `#a56eff` | `--ds-purple-900 #c472fb` | nearest |
| `--rux-status-gray` | `#8d8d8d` | `--ds-gray-700 #8f8f8f` | close |

## Tags

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-tag-background-red` | `#a2191f` | `--ds-red-500 #88151f` | nearest |
| `--rux-tag-color-red` | `#ffd7d9` | `--ds-red-1000 #ffe9ed` | nearest |
| `--rux-tag-hover-red` | `#c21e25` | `--ds-red-800 #e2162a` | nearest |
| `--rux-tag-background-magenta` | `#9f1853` | `--ds-pink-600 #ba0056` | nearest |
| `--rux-tag-color-magenta` | `#ffd6e8` | `--ds-red-1000 #ffe9ed` | nearest |
| `--rux-tag-hover-magenta` | `#bf1d63` | `--ds-pink-600 #ba0056` | nearest |
| `--rux-tag-background-purple` | `#6929c4` | `--ds-purple-800 #7d2bba` | nearest |
| `--rux-tag-color-purple` | `#e8daff` | `--ds-purple-1000 #fbecff` | nearest |
| `--rux-tag-hover-purple` | `#7c3dd6` | `--ds-purple-600 #9440d5` | nearest |
| `--rux-tag-background-blue` | `#0043ce` | `--ds-blue-800 #005be7` | nearest |
| `--rux-tag-color-blue` | `#d0e2ff` | `--ds-teal-1000 #cbfff5` | nearest |
| `--rux-tag-hover-blue` | `#0053ff` | `--ds-blue-800 #005be7` | nearest |
| `--rux-tag-background-cyan` | `#00539a` | `--ds-blue-500 #00418c` | nearest |
| `--rux-tag-color-cyan` | `#bae6ff` | `--ds-teal-1000 #cbfff5` | nearest |
| `--rux-tag-hover-cyan` | `#0066bd` | `--ds-blue-800 #005be7` | nearest |
| `--rux-tag-background-teal` | `#005d5d` | `--ds-teal-500 #006354` | close |
| `--rux-tag-color-teal` | `#9ef0f0` | `--ds-teal-1000 #cbfff5` | nearest |
| `--rux-tag-hover-teal` | `#007070` | `--ds-teal-500 #006354` | nearest |
| `--rux-tag-background-green` | `#0e6027` | `--ds-green-500 #006717` | nearest |
| `--rux-tag-color-green` | `#a7f0ba` | `--ds-green-1000 #d8ffe4` | nearest |
| `--rux-tag-hover-green` | `#11742f` | `--ds-green-500 #006717` | nearest |
| `--rux-tag-background-gray` | `#525252` | `--ds-gray-500 #454545` | nearest |
| `--rux-tag-color-gray` | `#f4f4f4` | `--ds-gray-1000 #ededed` | close |
| `--rux-tag-hover-gray` | `#636363` | `--ds-gray-800 #7d7d7d` | nearest |
| `--rux-tag-border-red` | `#fa4d56` | `--ds-red-900 #ff565f` | close |
| `--rux-tag-border-blue` | `#4589ff` | `--ds-blue-900 #47a8ff` | nearest |
| `--rux-tag-border-cyan` | `#1192e8` | `--ds-blue-600 #0090ff` | nearest |
| `--rux-tag-border-teal` | `#009d9a` | `--ds-teal-700 #00aa95` | close |
| `--rux-tag-border-green` | `#24a148` | `--ds-green-700 #00ac3a` | nearest |
| `--rux-tag-border-magenta` | `#ee5396` | `--ds-pink-900 #ff4d8d` | nearest |
| `--rux-tag-border-purple` | `#a56eff` | `--ds-purple-900 #c472fb` | nearest |
| `--rux-tag-border-gray` | `#8d8d8d` | `--ds-gray-700 #8f8f8f` | close |
| `--rux-tag-border-cool-gray` | `#878d96` | `--ds-gray-700 #8f8f8f` | close |
| `--rux-tag-border-warm-gray` | `#8f8b8b` | `--ds-gray-700 #8f8f8f` | close |
| `--rux-tag-background-cool-gray` | `#4d5358` | `--ds-gray-500 #454545` | nearest |
| `--rux-tag-color-cool-gray` | `#f2f4f8` | `--ds-blue-1000 #eaf6ff` | close |
| `--rux-tag-hover-cool-gray` | `#5d646a` | `--ds-gray-800 #7d7d7d` | nearest |
| `--rux-tag-background-warm-gray` | `#565151` | `--ds-gray-500 #454545` | nearest |
| `--rux-tag-color-warm-gray` | `#f7f3f2` | `--ds-gray-1000 #ededed` | close |
| `--rux-tag-hover-warm-gray` | `#696363` | `--ds-gray-800 #7d7d7d` | nearest |

## Chat

| Token | This theme | Nearest Geist token | |
| :--- | :--- | :--- | :--- |
| `--rux-chat-avatar-agent` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-chat-avatar-bot` | `#888888` | `--ds-gray-600 #878787` | close |
| `--rux-chat-avatar-user` | `#52a8ff` | `--ds-blue-900 #47a8ff` | close |
| `--rux-chat-bubble-agent` | `#111111` | `--ds-background-100 #0a0a0a` | close |
| `--rux-chat-bubble-agent-text` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-chat-bubble-border` | `#262626` | `--ds-gray-300 #292929` | close |
| `--rux-chat-bubble-user` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-chat-bubble-user-text` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-chat-button` | `#52a8ff` | `--ds-blue-900 #47a8ff` | close |
| `--rux-chat-button-active` | `rgba(255, 255, 255, 0.18)` | `--ds-gray-alpha-400 #ffffff/0.14` | close |
| `--rux-chat-button-hover` | `rgba(255, 255, 255, 0.06)` | `--ds-gray-alpha-100 #ffffff/0.06` | exact |
| `--rux-chat-button-selected` | `rgba(255, 255, 255, 0.1)` | `--ds-gray-alpha-200 #ffffff/0.09` | close |
| `--rux-chat-button-text-hover` | `#8fc7ff` | `--ds-blue-900 #47a8ff` | nearest |
| `--rux-chat-button-text-selected` | `#a1a1a1` | `--ds-gray-900 #a1a1a1` | exact |
| `--rux-chat-header-background` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
| `--rux-chat-header-text` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-chat-prompt-background` | `#000000` | `--ds-background-200 #000000` | exact |
| `--rux-chat-prompt-border-end` | `rgba(26, 26, 26, 0)` | `--ds-gray-alpha-100 #ffffff/0.06` | nearest |
| `--rux-chat-prompt-border-start` | `#1a1a1a` | `--ds-gray-100 #1a1a1a` | exact |
| `--rux-chat-prompt-text` | `#ededed` | `--ds-gray-1000 #ededed` | exact |
| `--rux-chat-shell-background` | `#0a0a0a` | `--ds-background-100 #0a0a0a` | exact |
