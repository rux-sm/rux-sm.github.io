---
type: reference
---

# Apple's dark colours, for apple-dark

What Apple's own software says under the dark appearance, read from Apple and
not from memory. The `apple-dark` block in `css/rux-theme.css` is built from
these values. Its shapes, sizes and type are apple-light's, in
`apple-token-map.md`, which also holds every light value named here.

**Where each table comes from.**

- **System colours and greys:** the Specifications tables of the Color page
  in Apple's Human Interface Guidelines, dark mode, default and increased
  contrast.
- **Labels, fills, backgrounds, accent, link and selection:** AppKit's own
  colours, asked of macOS 27.0.1 under the dark appearance. AppKit's system
  colours answer with the Guidelines' dark defaults.
- **Controls:** AppKit's own, drawn off screen under the dark appearance at
  eight times size on the window background.

## System colours

| Colour | Dark | Increased contrast, dark |
| :--- | :--- | :--- |
| Red | `#ff4245` 255, 66, 69 | `#ff6165` 255, 97, 101 |
| Orange | `#ff9230` 255, 146, 48 | `#ffa056` 255, 160, 86 |
| Yellow | `#ffd600` 255, 214, 0 | `#fedf43` 254, 223, 67 |
| Green | `#30d158` 48, 209, 88 | `#4ad968` 74, 217, 104 |
| Mint | `#00dac3` 0, 218, 195 | `#54dfcb` 84, 223, 203 |
| Teal | `#00d2e0` 0, 210, 224 | `#3bddec` 59, 221, 236 |
| Cyan | `#3cd3fe` 60, 211, 254 | `#6dd9ff` 109, 217, 255 |
| Blue | `#0091ff` 0, 145, 255 | `#5cb8ff` 92, 184, 255 |
| Indigo | `#6d7cff` 109, 124, 255 | `#a7aaff` 167, 170, 255 |
| Purple | `#db34f2` 219, 52, 242 | `#ea8dff` 234, 141, 255 |
| Pink | `#ff375f` 255, 55, 95 | `#ff8ac4` 255, 138, 196 |
| Brown | `#b78a66` 183, 138, 102 | `#dba679` 219, 166, 121 |

A status mark takes the dark column, and words in a status colour the
increased-contrast one. The one light surface this theme has is the inverse
one a tooltip is drawn on, and what is drawn there takes apple-light's
increased-contrast steps.

## System greys

| Grey | Dark | Increased contrast, dark |
| :--- | :--- | :--- |
| Gray | `#8e8e93` 142, 142, 147 | `#aeaeb2` 174, 174, 178 |
| Gray 2 | `#636366` 99, 99, 102 | `#7c7c80` 124, 124, 128 |
| Gray 3 | `#48484a` 72, 72, 74 | `#545456` 84, 84, 86 |
| Gray 4 | `#3a3a3c` 58, 58, 60 | `#444446` 68, 68, 70 |
| Gray 5 | `#2c2c2e` 44, 44, 46 | `#363638` 54, 54, 56 |
| Gray 6 | `#1c1c1e` 28, 28, 30 | `#242426` 36, 36, 38 |

## Labels, fills and separator

Each is white at a strength, so it lightens whatever it sits on. The last two
columns are what that makes on the window and on this theme's raised surface,
the under-page background.

| Use | AppKit name | Value | On the window | On the raised surface |
| :--- | :--- | :--- | :--- | :--- |
| Label | `labelColor` | white at 84.7% | `#dddddd` | `#dedede` |
| Secondary label | `secondaryLabelColor` | white at 54.9% | `#9a9a9a` | `#9e9e9e` |
| Tertiary label | `tertiaryLabelColor` | white at 24.7% | `#565656` | `#5d5d5d` |
| Placeholder text | `placeholderTextColor` | white at 54.9% | `#9a9a9a` | `#9e9e9e` |
| Disabled control text | `disabledControlTextColor` | white at 24.7% | `#565656` | `#5d5d5d` |
| Separator | `separatorColor` | white at 9.8% | `#343434` | `#3d3d3d` |
| Fill | `systemFill` | white at 9.8% | `#343434` | `#3d3d3d` |
| Secondary fill | `secondarySystemFill` | white at 7.8% | `#303030` | `#393939` |
| Tertiary fill | `tertiarySystemFill` | white at 4.7% | `#292929` | `#323232` |
| Quaternary fill | `quaternarySystemFill` | white at 2.7% | `#242424` | `#2e2e2e` |
| Quinary fill | `quinarySystemFill` | white at 0.8% | `#202020` | `#2a2a2a` |

## Backgrounds, accent and selection

| Use | AppKit name | Value |
| :--- | :--- | :--- |
| Window background | `windowBackgroundColor` | `#1e1e1e` 30, 30, 30 |
| Control background | `controlBackgroundColor` | `#1e1e1e` 30, 30, 30 |
| Under-page background | `underPageBackgroundColor` | `#282828` 40, 40, 40 |
| Alternating row | `alternatingContentBackgroundColors[1]` | white at 4.7% |
| Grid | `gridColor` | `#1a1a1a` 26, 26, 26 |
| Control accent | `controlAccentColor` | `#007aff` 0, 122, 255 |
| Link | `linkColor` | `#419cff` 65, 156, 255 |
| Selected content | `selectedContentBackgroundColor` | `#0059d1` 0, 89, 209 |
| Selected content, unemphasized | `unemphasizedSelectedContentBackgroundColor` | `#464646` 70, 70, 70 |
| Selected text | `selectedTextBackgroundColor` | `#3f638b` 63, 99, 139 |
| Focus ring | `keyboardFocusIndicatorColor` | 26,169,255 at 49.8% |

The under-page background is the lighter of the two here, where under the
light appearance it is the darker. So this theme's page is the window and its
raised surface the under-page grey, and a card still stands off the page by
its fill.

The control accent is one colour under both appearances.

## Controls

Each resting control is a fill of white on the window.

| Control | Drawn as |
| :--- | :--- |
| Push button, pop-up button, segmented control | 48, 48, 48, the secondary fill on the window |
| Text field, search field | 22, 22, 22 inside a 1pt line of 51, 51, 51 |
| Checkbox and radio, empty | 52, 52, 52, the fill on the window |
| Switch, off | 52, 52, 52 under a thumb of 225, 225, 225 |

A field's inside is darker than the window it sits in, where under the light
appearance the two are one white.

## What this theme takes from elsewhere in Apple's tables

| Where | Apple's own | Makes | This theme takes | Makes |
| :--- | :--- | :--- | :--- | :--- |
| Secondary text on a chosen row | Secondary label, `#9e9e9e` | 4.31 | Gray, increased contrast, dark | 5.22 |
| A link on a chosen row | Link, `#419cff` | 4.08 | Blue, increased contrast, dark | 5.37 |
| A white label on the filled button | Control accent | 4.02 | Blue, increased contrast, light | 4.57 |
| Red words on the red tag | Red, increased contrast, dark | 4.13 | The same, 13% toward white | 4.69 |

## This theme's tokens

Every value `[data-theme="apple-dark"]` sets in `css/rux-theme.css`, beside
where it came from. 162 tokens take a value read from Apple as it stands.
41 take one worked out from Apple's, because Apple names no hover or pressed
step, no tint, and no chat surface; the third column says which.

| Value | From Apple | | Tokens, each `--rux-` |
| :--- | :--- | :--- | :--- |
| `dark` | The dark appearance | read | `color-scheme` |
| `#1e1e1e` | Window and control background | read | `background`, `layer-03`, `layer-background-03`, `text-inverse`, `link-inverse-active`, `icon-inverse`, `focus-inset`, `notification-action-tertiary-inverse`, `chat-prompt-background` |
| `#464646` | Selected content, unemphasized | read | `background-active`, `background-selected-hover`, `layer-accent-active-02`, `layer-accent-hover-03`, `layer-active-03`, `layer-selected-hover-03`, `button-secondary-active` |
| `#1e6ef4` | Blue, increased contrast, light | read | `background-brand`, `support-info-inverse`, `button-primary`, `content-switcher-selected` |
| `#2e2e2e` | White at 7% on the window, between the two fills | derived | `background-hover` |
| `#dedede` | Label on the raised surface | read | `background-inverse`, `layer-selected-inverse`, `border-inverse`, `text-primary`, `icon-primary`, `notification-action-tertiary-inverse-text`, `chat-bubble-agent-text`, `chat-bubble-user-text`, `chat-header-text`, `chat-prompt-text` |
| `#c8c8c8` | The label on the raised surface, darkened for hover | derived | `background-inverse-hover` |
| `#343434` | Separator and fill on the window | read | `background-selected`, `layer-selected-03` |
| `#282828` | Under-page background | read | `layer-01`, `layer-02`, `layer-background-01`, `layer-background-02`, `chat-bubble-agent`, `chat-header-background`, `chat-prompt-border-start`, `chat-shell-background` |
| `#323232` | Tertiary fill on the raised surface | read | `layer-accent-01`, `layer-hover-01`, `layer-hover-02`, `skeleton-background`, `button-disabled`, `notification-action-hover`, `notification-action-tertiary-inverse-hover` |
| `#393939` | Secondary fill on the raised surface | read | `layer-accent-02`, `layer-accent-hover-01`, `layer-selected-01`, `layer-selected-02`, `button-secondary`, `content-switcher-background`, `chat-bubble-user` |
| `#3d3d3d` | Separator and fill on the raised surface | read | `layer-accent-03`, `layer-accent-active-01`, `layer-accent-hover-02`, `layer-active-01`, `layer-active-02`, `layer-selected-hover-01`, `layer-selected-hover-02`, `border-disabled`, `border-subtle-00`, `border-subtle-01`, `border-tile-01`, `skeleton-element`, `button-secondary-hover`, `content-switcher-background-hover` |
| `#545456` | Gray 3, increased contrast, dark | read | `layer-accent-active-03`, `border-strong-01`, `border-subtle-selected-03` |
| `#303030` | Secondary fill on the window | read | `layer-hover-03` |
| `#636366` | Gray 2, dark | read | `layer-selected-disabled`, `border-strong-02`, `text-on-color-disabled`, `icon-on-color-disabled`, `toggle-off` |
| `#161616` | A text field's inside | read | `field-01`, `field-02`, `field-03` |
| `#1c1c1c` | Quaternary fill on a text field's inside | read | `field-hover-01`, `field-hover-02` |
| `#212121` | Tertiary fill on a text field's inside | read | `field-hover-03` |
| `#0091ff` | Blue, dark | read | `border-interactive`, `icon-interactive`, `support-info`, `interactive`, `status-blue`, `chat-avatar-user` |
| `#8e8e93` | Gray, dark | read | `border-strong-03`, `notification-action-tertiary-inverse-text-on-color-disabled`, `chat-avatar-bot` |
| `#48484a` | Gray 3, dark | read | `border-subtle-02`, `border-subtle-03`, `border-subtle-selected-01`, `border-subtle-selected-02`, `border-tile-02`, `border-tile-03`, `button-separator`, `notification-action-tertiary-inverse-active`, `chat-bubble-border` |
| `rgba(255, 255, 255, 0.247)` | Disabled control text | read | `text-disabled`, `icon-disabled` |
| `#ff6165` | Red, increased contrast, dark | read | `text-error`, `button-danger-secondary` |
| `#aeaeb2` | Gray, increased contrast, dark | read | `text-helper`, `text-secondary`, `icon-secondary`, `tag-color-gray`, `tag-border-gray`, `tag-border-cool-gray`, `tag-color-cool-gray`, `status-gray`, `chat-avatar-agent`, `chat-button-text-selected` |
| `#ffffff` | White, the label on a filled control | read | `text-on-color`, `icon-on-color` |
| `rgba(255, 255, 255, 0.549)` | Placeholder text | read | `text-placeholder` |
| `#0059d1` | Selected content | read | `link-inverse` |
| `#0047a7` | The selected-content blue, darkened for hover | derived | `link-inverse-hover` |
| `#564ade` | Indigo, increased contrast, light | read | `link-inverse-visited` |
| `#5cb8ff` | Blue, increased contrast, dark | read | `link-primary`, `button-tertiary`, `button-tertiary-hover`, `tag-color-blue`, `tag-border-blue`, `chat-button` |
| `#8fd0ff` | The dark increased-contrast blue, lightened for hover | derived | `link-primary-hover`, `link-secondary`, `button-tertiary-active`, `chat-button-text-hover` |
| `#a7aaff` | Indigo, increased contrast, dark | read | `link-visited` |
| `#ff9230` | Orange, dark | read | `support-caution-major`, `support-warning`, `status-orange`, `status-orange-outline` |
| `#ffd600` | Yellow, dark | read | `support-caution-minor`, `status-yellow`, `status-yellow-outline` |
| `#db34f2` | Purple, dark | read | `support-caution-undefined`, `status-purple` |
| `#ff4245` | Red, dark | read | `support-error`, `status-red` |
| `#e9152d` | Red, increased contrast, light | read | `support-error-inverse`, `button-danger-primary` |
| `#30d158` | Green, dark | read | `support-success`, `status-green` |
| `#008932` | Green, increased contrast, light | read | `support-success-inverse` |
| `#a16a00` | Yellow, increased contrast, light | read | `support-warning-inverse` |
| `#1aa9ff` | Focus ring, at full strength | read | `focus` |
| `#0067f4` | Focus ring, light, at full strength | read | `focus-inverse` |
| `#3f638b` | Selected text | read | `highlight` |
| `rgba(0, 0, 0, 0.5)` | Black at 50%, behind a pop-up and as a shadow | derived | `overlay`, `shadow` |
| `#0068da` | Link, light | read | `button-primary-hover` |
| `#0064e1` | Selected content, light | read | `button-primary-active` |
| `#cd1228` | The light increased-contrast red, darkened for hover | derived | `button-danger-hover` |
| `#b11022` | The same red, darkened for a press | derived | `button-danger-active` |
| `#661a1c` | Red at 40% on black | derived | `tag-background-red` |
| `#ff7679` | Red, increased contrast, dark, 13% toward white for 4.5 to 1 on its tint | derived | `tag-color-red`, `tag-border-red` |
| `#701d1e` | Red at 44% on black | derived | `tag-hover-red` |
| `#661626` | Pink at 40% on black | derived | `tag-background-magenta` |
| `#ff8ac4` | Pink, increased contrast, dark | read | `tag-color-magenta`, `tag-border-magenta` |
| `#70182a` | Pink at 44% on black | derived | `tag-hover-magenta` |
| `#581561` | Purple at 40% on black | derived | `tag-background-purple` |
| `#ea8dff` | Purple, increased contrast, dark | read | `tag-color-purple`, `tag-border-purple` |
| `#60176a` | Purple at 44% on black | derived | `tag-hover-purple` |
| `#003a66` | Blue at 40% on black | derived | `tag-background-blue` |
| `#004070` | Blue at 44% on black | derived | `tag-hover-blue` |
| `#185466` | Cyan at 40% on black | derived | `tag-background-cyan` |
| `#6dd9ff` | Cyan, increased contrast, dark | read | `tag-color-cyan`, `tag-border-cyan` |
| `#1a5d70` | Cyan at 44% on black | derived | `tag-hover-cyan` |
| `#00545a` | Teal at 40% on black | derived | `tag-background-teal` |
| `#3bddec` | Teal, increased contrast, dark | read | `tag-color-teal`, `tag-border-teal` |
| `#005c63` | Teal at 44% on black | derived | `tag-hover-teal` |
| `#135423` | Green at 40% on black | derived | `tag-background-green` |
| `#4ad968` | Green, increased contrast, dark | read | `tag-color-green`, `tag-border-green` |
| `#155c27` | Green at 44% on black | derived | `tag-hover-green` |
| `#39393b` | Gray at 40% on black | derived | `tag-background-gray`, `tag-background-cool-gray` |
| `#3e3e41` | Gray at 44% on black | derived | `tag-hover-gray`, `tag-hover-cool-gray` |
| `#dba679` | Brown, increased contrast, dark | read | `tag-border-warm-gray`, `tag-color-warm-gray` |
| `#493729` | Brown at 40% on black | derived | `tag-background-warm-gray` |
| `#513d2d` | Brown at 44% on black | derived | `tag-hover-warm-gray` |
| `#471213` | Red at 28% on black | derived | `notification-background-error` |
| `#0d3b19` | Green at 28% on black | derived | `notification-background-success` |
| `#002947` | Blue at 28% on black | derived | `notification-background-info` |
| `#47290d` | Orange at 28% on black | derived | `notification-background-warning` |
| `rgba(141, 141, 141, 0.4)` | Carbon's own dark set | derived | `chat-button-active` |
| `rgba(141, 141, 141, 0.16)` | Carbon's own dark set | derived | `chat-button-hover` |
| `rgba(141, 141, 141, 0.24)` | Carbon's own dark set | derived | `chat-button-selected` |
| `rgba(40, 40, 40, 0)` | The under-page background at no strength, the end of a fade | derived | `chat-prompt-border-end` |
