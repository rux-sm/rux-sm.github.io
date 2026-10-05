---
type: reference
---

# Apple's light colours and sizes, for apple-light

What Apple's own software says, read from Apple and not from memory. The
`apple-light` block in `css/rux-theme.css` is built from these values.

**Where each table comes from.**

- **System colours and greys:** the Specifications tables of the Color page
  in Apple's Human Interface Guidelines: light mode, default and increased
  contrast, and the dark increased-contrast step of each colour.
- **Labels, fills, backgrounds, accent, link and text styles:** AppKit's own
  colours and fonts, asked of macOS 27.0.1 under the light appearance.
- **Controls, a list and an alert:** AppKit's own, drawn off screen under the
  light appearance at eight times size in a window that answers as the front
  one, so a chosen control shows the accent colour. Height is the frame, and
  a corner is the first drawn point on its diagonal.

A Calendar event, a sheet and a menu are not measured. An app or the window
server draws each, and no view of AppKit's does.

## System colours

| Colour | Default | Increased contrast | Increased contrast, dark |
| :--- | :--- | :--- | :--- |
| Red | `#ff383c` 255, 56, 60 | `#e9152d` 233, 21, 45 | `#ff6165` 255, 97, 101 |
| Orange | `#ff8d28` 255, 141, 40 | `#c55300` 197, 83, 0 | `#ffa056` 255, 160, 86 |
| Yellow | `#ffcc00` 255, 204, 0 | `#a16a00` 161, 106, 0 | `#fedf43` 254, 223, 67 |
| Green | `#34c759` 52, 199, 89 | `#008932` 0, 137, 50 | `#4ad968` 74, 217, 104 |
| Mint | `#00c8b3` 0, 200, 179 | `#008575` 0, 133, 117 | `#54dfcb` 84, 223, 203 |
| Teal | `#00c3d0` 0, 195, 208 | `#008198` 0, 129, 152 | `#3bddec` 59, 221, 236 |
| Cyan | `#00c0e8` 0, 192, 232 | `#007eae` 0, 126, 174 | `#6dd9ff` 109, 217, 255 |
| Blue | `#0088ff` 0, 136, 255 | `#1e6ef4` 30, 110, 244 | `#5cb8ff` 92, 184, 255 |
| Indigo | `#6155f5` 97, 85, 245 | `#564ade` 86, 74, 222 | `#a7aaff` 167, 170, 255 |
| Purple | `#cb30e0` 203, 48, 224 | `#b02fc2` 176, 47, 194 | `#ea8dff` 234, 141, 255 |
| Pink | `#ff2d55` 255, 45, 85 | `#e7124d` 231, 18, 77 | `#ff8ac4` 255, 138, 196 |
| Brown | `#ac7f5e` 172, 127, 94 | `#956d51` 149, 109, 81 | `#dba679` 219, 166, 121 |

The dark column is for words on the one dark surface this theme has, the
inverse one a tooltip is drawn on.

## System greys

| Grey | Default | Increased contrast |
| :--- | :--- | :--- |
| Gray | `#8e8e93` 142, 142, 147 | `#6c6c70` 108, 108, 112 |
| Gray 2 | `#aeaeb2` 174, 174, 178 | `#8e8e93` 142, 142, 147 |
| Gray 3 | `#c7c7cc` 199, 199, 204 | `#aeaeb2` 174, 174, 178 |
| Gray 4 | `#d1d1d6` 209, 209, 214 | `#bcbcc0` 188, 188, 192 |
| Gray 5 | `#e5e5ea` 229, 229, 234 | `#d8d8dc` 216, 216, 220 |
| Gray 6 | `#f2f2f7` 242, 242, 247 | `#ebebf0` 235, 235, 240 |

## Labels, fills and separator

Each is black at a strength, so it darkens whatever it sits on. The last
column is what that makes on white.

| Use | AppKit name | Value | On white |
| :--- | :--- | :--- | :--- |
| Label | `labelColor` | black at 84.7% | `#272727` |
| Secondary label | `secondaryLabelColor` | black at 49.8% | `#808080` |
| Tertiary label | `tertiaryLabelColor` | black at 25.9% | `#bdbdbd` |
| Quaternary label | `quaternaryLabelColor` | black at 9.8% | `#e6e6e6` |
| Placeholder text | `placeholderTextColor` | black at 49.8% | `#808080` |
| Disabled control text | `disabledControlTextColor` | black at 24.7% | `#c0c0c0` |
| Separator | `separatorColor` | black at 9.8% | `#e6e6e6` |
| Fill | `systemFill` | black at 9.8% | `#e6e6e6` |
| Secondary fill | `secondarySystemFill` | black at 7.8% | `#ebebeb` |
| Tertiary fill | `tertiarySystemFill` | black at 4.7% | `#f3f3f3` |
| Quaternary fill | `quaternarySystemFill` | black at 2.7% | `#f8f8f8` |
| Quinary fill | `quinarySystemFill` | black at 0.8% | `#fdfdfd` |

## Backgrounds, accent and selection

| Use | AppKit name | Value |
| :--- | :--- | :--- |
| Window background | `windowBackgroundColor` | `#ffffff` 255, 255, 255 |
| Control background | `controlBackgroundColor` | `#ffffff` 255, 255, 255 |
| Under-page background | `underPageBackgroundColor` | `#f6f6f6` 246, 246, 246 |
| Alternating row | `alternatingContentBackgroundColors[1]` | `#f4f5f5` 244, 245, 245 |
| Grid | `gridColor` | `#e6e6e6` 230, 230, 230 |
| Control accent | `controlAccentColor` | `#007aff` 0, 122, 255 |
| Link | `linkColor` | `#0068da` 0, 104, 218 |
| Selected content | `selectedContentBackgroundColor` | `#0064e1` 0, 100, 225 |
| Selected content, unemphasized | `unemphasizedSelectedContentBackgroundColor` | `#dcdcdc` 220, 220, 220 |
| Selected text | `selectedTextBackgroundColor` | `#b3d7ff` 179, 215, 255 |
| Focus ring | `keyboardFocusIndicatorColor` | 0,103,244 at 49.8% |

The control accent is the Mac's own setting and reads 0, 122, 255 at its
default. It is not the system blue, 0, 136, 255.

## Text styles

The system face is San Francisco. Sizes and lines are in points.

| Style | Size | Line | Weight |
| :--- | :--- | :--- | :--- |
| Large title | 26 | 32 | regular |
| Title 1 | 22 | 26 | regular |
| Title 2 | 17 | 22 | regular |
| Title 3 | 15 | 20 | regular |
| Headline | 13 | 16 | bold |
| Body | 13 | 16 | regular |
| Callout | 12 | 15 | regular |
| Subheadline | 11 | 14 | regular |
| Footnote | 10 | 13 | regular |
| Caption 1 | 10 | 13 | regular |
| Caption 2 | 10 | 13 | medium |

This theme keeps the site's sizes and takes Apple's weights. A style Carbon
sets at 600 is 700, as Headline is bold, and a style Carbon sets at 300 is
400, because no style of Apple's is light.

## Controls

A push button, a pop-up button and a segmented control share one height
and corner at each size. From the large size up the corner is half the
height, so the control is a capsule. Their resting fill reads 235, 235, 235,
which is the secondary fill on white.

| Control size | Height | Corner |
| :--- | :--- | :--- |
| Small | 20 | 5 |
| Regular | 24 | 6 |
| Large | 28 | 14, a capsule |
| Extra large | 36 | 18, a capsule |

| Control | Size | Corner | Drawn as |
| :--- | :--- | :--- | :--- |
| Text field | 24 high | 6 to 7 | white inside a 1pt line of 217, 217, 217 |
| Search field | 24 high, 28 large | half its height | white inside the same line |
| Checkbox | 16 by 16 | 5.5 | filled |
| Radio | 16 by 16 | a circle | filled |
| Switch | 54 by 24 | a capsule | a white thumb in a filled track |

Every control's text is 13pt at every size.

## Chosen controls

The accent is the Mac's own setting, here at its default blue.

| Control | Fill | On it |
| :--- | :--- | :--- |
| Default button | 0, 123, 255 | a white label |
| Chosen segment | 0, 120, 249 | a white label, on the control's own corner |
| Switch, on | 0, 120, 249 | a white thumb |
| Switch, off | 230, 230, 230 | a white thumb |
| Checkbox, ticked | 0, 120, 249 | a white tick |
| Checkbox, empty | 230, 230, 230 | nothing |
| Radio, chosen | 0, 120, 249 | a white dot |

This theme fills each with its own button blue, the increased-contrast one,
so white words on it make 4.5 to 1.

## A list

| Part | Measure |
| :--- | :--- |
| Row | 24 high |
| Header | 28 high, 11pt regular |
| Chosen row | 0, 100, 225, the selected-content blue, 10 in from each side of the list, corner 8 |

## An alert

260 wide, with everything 20 in from its sides. The title is 13pt bold and
the message 13pt regular. Its buttons are the large size, 28 high, side by
side at one width, 8 apart and 16 from the edge.

## This theme's tokens

Every value `[data-theme="apple-light"]` sets in `css/rux-theme.css`, beside
where it came from. 133 tokens take a value read from Apple as it stands.
49 take one worked out from Apple's, because Apple names no hover or
pressed step, no tint, and no ink for a tint; the last column says which.

| Value | From Apple | | Tokens, each `--rux-` |
| :--- | :--- | :--- | :--- |
| `light` | The light appearance | read | `color-scheme` |
| `#f6f6f6` | Under-page background | read | `background`, `layer-03`, `layer-background-03` |
| `#dcdcdc` | Selected content, unemphasized | read | `background-active`, `background-selected-hover`, `layer-accent-active-02`, `layer-accent-hover-03`, `layer-active-03`, `layer-selected-hover-03`, `button-secondary-active` |
| `#1e6ef4` | Blue, increased contrast | read | `background-brand`, `border-interactive`, `icon-interactive`, `support-info`, `interactive`, `button-primary`, `status-blue`, `content-switcher-selected` |
| `#ededed` | Black at 7% on white, between the two fills | derived | `background-hover` |
| `#272727` | Label on white | read | `background-inverse`, `layer-selected-inverse`, `border-inverse`, `text-primary`, `icon-primary`, `notification-action-tertiary-inverse-text` |
| `#3a3a3a` | The label on white, lightened for hover | derived | `background-inverse-hover` |
| `#e6e6e6` | Separator and fill on white | read | `background-selected`, `layer-accent-03`, `layer-accent-active-01`, `layer-accent-hover-02`, `layer-active-01`, `layer-active-02`, `layer-selected-03`, `layer-selected-hover-01`, `layer-selected-hover-02`, `border-disabled`, `border-subtle-00`, `border-subtle-01`, `border-tile-01`, `skeleton-element`, `button-secondary-hover`, `content-switcher-background-hover` |
| `#ffffff` | Window and control background | read | `layer-01`, `layer-02`, `layer-background-01`, `layer-background-02`, `field-01`, `field-02`, `field-03`, `text-inverse`, `text-on-color`, `link-inverse-active`, `icon-inverse`, `icon-on-color`, `focus-inset`, `focus-inverse`, `notification-action-tertiary-inverse` |
| `#f3f3f3` | Tertiary fill on white | read | `layer-accent-01`, `layer-hover-01`, `layer-hover-02`, `field-hover-03`, `skeleton-background`, `button-disabled`, `notification-action-hover`, `notification-action-tertiary-inverse-hover` |
| `#ebebeb` | Secondary fill on white | read | `layer-accent-02`, `layer-accent-hover-01`, `layer-hover-03`, `layer-selected-01`, `layer-selected-02`, `button-secondary`, `content-switcher-background` |
| `#c7c7cc` | Gray 3 | read | `layer-accent-active-03`, `border-strong-01`, `border-subtle-selected-03`, `notification-action-tertiary-inverse-active` |
| `#aeaeb2` | Gray 2 | read | `layer-selected-disabled`, `border-strong-02`, `toggle-off` |
| `#f8f8f8` | Quaternary fill on white | read | `field-hover-01`, `field-hover-02` |
| `#8e8e93` | Gray | read | `border-strong-03`, `text-on-color-disabled`, `icon-on-color-disabled`, `notification-action-tertiary-inverse-text-on-color-disabled` |
| `#d9d9d9` | A text field's line | read | `border-subtle-02`, `border-subtle-03`, `border-subtle-selected-01`, `border-subtle-selected-02`, `border-tile-02`, `border-tile-03`, `button-separator` |
| `rgba(0, 0, 0, 0.247)` | Disabled control text | read | `text-disabled`, `icon-disabled` |
| `#cd1228` | Red, increased contrast, darkened to 4.5 to 1 on its tint and on the page | derived | `text-error`, `button-danger-secondary`, `button-danger-hover`, `tag-color-red`, `tag-border-red` |
| `#6c6c70` | Gray, increased contrast | read | `text-helper`, `text-secondary`, `icon-secondary`, `tag-color-gray`, `tag-border-gray`, `tag-border-cool-gray`, `tag-color-cool-gray`, `status-gray` |
| `rgba(0, 0, 0, 0.498)` | Placeholder text | read | `text-placeholder` |
| `#5cb8ff` | Blue, increased contrast, dark | read | `link-inverse`, `support-info-inverse` |
| `#8fd0ff` | The dark increased-contrast blue, lightened for hover | derived | `link-inverse-hover` |
| `#a7aaff` | Indigo, increased contrast, dark | read | `link-inverse-visited` |
| `#0068da` | Link | read | `link-primary`, `button-primary-hover`, `button-tertiary`, `button-tertiary-hover` |
| `#0064e1` | Selected content | read | `link-primary-hover`, `link-secondary`, `button-primary-active`, `button-tertiary-active` |
| `#564ade` | Indigo, increased contrast | read | `link-visited` |
| `#c55300` | Orange, increased contrast | read | `support-caution-major`, `support-warning`, `status-orange`, `status-orange-outline` |
| `#a16a00` | Yellow, increased contrast | read | `support-caution-minor`, `status-yellow-outline` |
| `#b02fc2` | Purple, increased contrast | read | `support-caution-undefined`, `status-purple` |
| `#e9152d` | Red, increased contrast | read | `support-error`, `button-danger-primary`, `status-red` |
| `#ff6165` | Red, increased contrast, dark | read | `support-error-inverse` |
| `#008932` | Green, increased contrast | read | `support-success`, `status-green` |
| `#4ad968` | Green, increased contrast, dark | read | `support-success-inverse` |
| `#fedf43` | Yellow, increased contrast, dark | read | `support-warning-inverse` |
| `#0067f4` | Focus ring, at full strength | read | `focus` |
| `#b3d7ff` | Selected text | read | `highlight` |
| `rgba(0, 0, 0, 0.3)` | Black at 30%, behind a pop-up | derived | `overlay` |
| `rgba(0, 0, 0, 0.16)` | Black at 16%, a shadow | derived | `shadow` |
| `#b11022` | The red ink, darkened for a press | derived | `button-danger-active` |
| `#ffe3e4` | Red at 14% on white | derived | `tag-background-red` |
| `#ffd3d4` | Red at 22% on white | derived | `tag-hover-red` |
| `#ffe2e7` | Pink at 14% on white | derived | `tag-background-magenta` |
| `#d01045` | Pink, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-magenta`, `tag-border-magenta` |
| `#ffd1da` | Pink at 22% on white | derived | `tag-hover-magenta` |
| `#f8e2fb` | Purple at 14% on white | derived | `tag-background-purple` |
| `#a92dba` | Purple, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-purple`, `tag-border-purple` |
| `#f4d1f8` | Purple at 22% on white | derived | `tag-hover-purple` |
| `#dbeeff` | Blue at 14% on white | derived | `tag-background-blue` |
| `#1b63dc` | Blue, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-blue`, `tag-border-blue` |
| `#c7e5ff` | Blue at 22% on white | derived | `tag-hover-blue` |
| `#dbf6fc` | Cyan at 14% on white | derived | `tag-background-cyan` |
| `#0076a4` | Cyan, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-cyan`, `tag-border-cyan` |
| `#c7f1fa` | Cyan at 22% on white | derived | `tag-hover-cyan` |
| `#dbf7f8` | Teal at 14% on white | derived | `tag-background-teal` |
| `#00798f` | Teal, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-teal`, `tag-border-teal` |
| `#c7f2f5` | Teal at 22% on white | derived | `tag-hover-teal` |
| `#e3f7e8` | Green at 14% on white | derived | `tag-background-green` |
| `#007e2e` | Green, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-color-green`, `tag-border-green` |
| `#d2f3da` | Green at 22% on white | derived | `tag-hover-green` |
| `#efeff0` | Gray at 14% on white | derived | `tag-background-gray`, `tag-background-cool-gray` |
| `#e6e6e7` | Gray at 22% on white | derived | `tag-hover-gray`, `tag-hover-cool-gray` |
| `#89644b` | Brown, increased contrast, darkened to 4.5 to 1 on its tint | derived | `tag-border-warm-gray`, `tag-color-warm-gray` |
| `#f3ede8` | Brown at 14% on white | derived | `tag-background-warm-gray` |
| `#ede3dc` | Brown at 22% on white | derived | `tag-hover-warm-gray` |
| `#ffebec` | Red at 10% on white | derived | `notification-background-error` |
| `#e6f3ff` | Blue at 10% on white | derived | `notification-background-info` |
| `#ffcc00` | Yellow | read | `status-yellow` |
| `#e7f8eb` | Green at 12% on white | derived | `notification-background-success` |
| `#fff1e5` | Orange at 12% on white | derived | `notification-background-warning` |
