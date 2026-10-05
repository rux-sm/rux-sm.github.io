---
type: reference
---

# Apple's light colours and sizes, for apple-light

What Apple's own software says, read from Apple and not from memory. The
`apple-light` block in `css/rux-theme.css` is built from these values.

**Where each table comes from.**

- **System colours and greys:** the Specifications tables of the Color page
  in Apple's Human Interface Guidelines, light mode, default and increased
  contrast.
- **Labels, fills, backgrounds, accent, link and text styles:** AppKit's own
  colours and fonts, asked of macOS 27.0.1 under the light appearance.
- **Controls:** AppKit's controls drawn off screen under the light appearance
  at eight times size, then measured: the frame for height, the first drawn
  point on the corner's diagonal for the corner.

A control drawn off screen is in a window that is not the front one, so it
shows its resting grey and not the accent colour. The accent-filled states,
a Calendar event, a sheet, an alert, a menu and a list row are not measured.

## System colours

| Colour | Default | Increased contrast |
| :--- | :--- | :--- |
| Red | `#ff383c` 255, 56, 60 | `#e9152d` 233, 21, 45 |
| Orange | `#ff8d28` 255, 141, 40 | `#c55300` 197, 83, 0 |
| Yellow | `#ffcc00` 255, 204, 0 | `#a16a00` 161, 106, 0 |
| Green | `#34c759` 52, 199, 89 | `#008932` 0, 137, 50 |
| Mint | `#00c8b3` 0, 200, 179 | `#008575` 0, 133, 117 |
| Teal | `#00c3d0` 0, 195, 208 | `#008198` 0, 129, 152 |
| Cyan | `#00c0e8` 0, 192, 232 | `#007eae` 0, 126, 174 |
| Blue | `#0088ff` 0, 136, 255 | `#1e6ef4` 30, 110, 244 |
| Indigo | `#6155f5` 97, 85, 245 | `#564ade` 86, 74, 222 |
| Purple | `#cb30e0` 203, 48, 224 | `#b02fc2` 176, 47, 194 |
| Pink | `#ff2d55` 255, 45, 85 | `#e7124d` 231, 18, 77 |
| Brown | `#ac7f5e` 172, 127, 94 | `#956d51` 149, 109, 81 |

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
