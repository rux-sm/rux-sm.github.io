---
type: reference
---

# Rux dark's tokens and where each comes from

Every colour `[data-theme="rux-dark"]` sets in `css/rux-theme.css`, beside the
value geist-dark sets for the same token, and the rule rux-dark's comes from.
The rules are the ones below; the block's own comment says why.

**The ink** is the mark's `#f4f4f4`, Carbon gray 10. A wash over a surface is
Carbon cool gray 10, `#f2f4f8`, at the strength geist-dark gives white.

**A cool grey** takes the OKLCH lightness of the neutral grey its row names and
Carbon cool gray's hue, 248, at chroma 0.0065, half of cool gray's own. The
page is `#000000`.

**Slate** is Carbon blue's hue, 262, at about half its chroma. Its steps, as
OKLCH lightness and chroma, are the quiet steps every hue shares:

| Step | Lightness | Chroma | Slate |
| :--- | :--- | :--- | :--- |
| text | 0.75 | 0.076 | `#94afdf` |
| hover | 0.83 | 0.049 | `#b6c8e8` |
| fill | 0.556 | 0.109 | `#4f72b3` |
| fillHover | 0.50 | 0.105 | `#41629f` |
| fillActive | 0.44 | 0.094 | `#355186` |
| tint | 0.29 | 0.039 | `#212b3f` |
| tintHover | 0.32 | 0.043 | `#273349` |
| tagText | 0.82 | 0.055 | `#b1c5e9` |

**The signal steps** are for what must be seen -- support, status, error text
and the danger button -- at more chroma: glyph 0.70 and 0.16, glyphLight (amber
and yellow) 0.82 and 0.15, text 0.75 and 0.13, fill 0.55 and 0.17, fillHover
0.50 and 0.16, fillActive 0.45 and 0.15. A notification's fill is its glyph at
15% over the page.

**The hues**, in OKLCH degrees: red 25, orange 50, amber 75, yellow 95, green
150, teal 185, cyan 225, blue 262, purple 300, magenta 350.

| Token | geist-dark | rux-dark | From |
| :--- | :--- | :--- | :--- |
| `color-scheme` | `dark` | `dark` | kept |
| `background` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `background-active` | `rgba(255, 255, 255, 0.18)` | `rgba(242, 244, 248, 0.18)` | Carbon cool gray 10 at 0.18 |
| `background-brand` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(242, 244, 248, 0.06)` | Carbon cool gray 10 at 0.06 |
| `background-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-inverse-hover` | `#d4d4d4` | `#d1d5d8` | cool grey at the lightness of #d4d4d4 |
| `background-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(242, 244, 248, 0.1)` | Carbon cool gray 10 at 0.1 |
| `background-selected-hover` | `rgba(255, 255, 255, 0.14)` | `rgba(242, 244, 248, 0.14)` | Carbon cool gray 10 at 0.14 |
| `layer-01` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `layer-02` | `#111111` | `#181a1d` | cool grey at the lightness of #1a1a1a |
| `layer-03` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `layer-accent-01` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `layer-accent-02` | `#242424` | `#2c2e31` | cool grey at the lightness of #2e2e2e |
| `layer-accent-03` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-accent-active-01` | `#333333` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `layer-accent-active-02` | `#3f3f3f` | `#4f5256` | cool grey at the lightness of #525252 |
| `layer-accent-active-03` | `#525252` | `#63666a` | cool grey at the lightness of #666666 |
| `layer-accent-hover-01` | `#242424` | `#2c2e31` | cool grey at the lightness of #2e2e2e |
| `layer-accent-hover-02` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-accent-hover-03` | `#333333` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `layer-active-01` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-active-02` | `#333333` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `layer-active-03` | `#3f3f3f` | `#4f5256` | cool grey at the lightness of #525252 |
| `layer-background-01` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `layer-background-02` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `layer-background-03` | `#111111` | `#181a1d` | cool grey at the lightness of #1a1a1a |
| `layer-hover-01` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `layer-hover-02` | `#242424` | `#2c2e31` | cool grey at the lightness of #2e2e2e |
| `layer-hover-03` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-selected-01` | `#242424` | `#2c2e31` | cool grey at the lightness of #2e2e2e |
| `layer-selected-02` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-selected-03` | `#333333` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `layer-selected-disabled` | `#525252` | `#63666a` | cool grey at the lightness of #666666 |
| `layer-selected-hover-01` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `layer-selected-hover-02` | `#333333` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `layer-selected-hover-03` | `#3f3f3f` | `#4f5256` | cool grey at the lightness of #525252 |
| `layer-selected-inverse` | `#ededed` | `#eaeef1` | cool grey at the lightness of #ededed |
| `field-01` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `field-02` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `field-03` | `#111111` | `#181a1d` | cool grey at the lightness of #1a1a1a |
| `field-hover-01` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `field-hover-02` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `field-hover-03` | `#242424` | `#2c2e31` | cool grey at the lightness of #2e2e2e |
| `border-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `border-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-strong-01` | `#606060` | `#63666a` | cool grey, the darkest that rings a field at 3 to 1 |
| `border-strong-02` | `#666666` | `#63666a` | cool grey at the lightness of #666666 |
| `border-strong-03` | `#888888` | `#85898c` | cool grey at the lightness of #888888 |
| `border-subtle-00` | `#1a1a1a` | `#323437` | cool grey at the lightness of #343434 |
| `border-subtle-01` | `#262626` | `#404346` | cool grey at the lightness of #434343 |
| `border-subtle-02` | `#333333` | `#404346` | cool grey at the lightness of #434343 |
| `border-subtle-03` | `#3f3f3f` | `#404346` | cool grey at the lightness of #434343 |
| `border-subtle-selected-01` | `#3f3f3f` | `#4f5256` | cool grey at the lightness of #525252 |
| `border-subtle-selected-02` | `#525252` | `#63666a` | cool grey at the lightness of #666666 |
| `border-subtle-selected-03` | `#666666` | `#85898c` | cool grey at the lightness of #888888 |
| `border-tile-01` | `#333333` | `#404346` | cool grey at the lightness of #434343 |
| `border-tile-02` | `#3f3f3f` | `#404346` | cool grey at the lightness of #434343 |
| `border-tile-03` | `#525252` | `#404346` | cool grey at the lightness of #434343 |
| `text-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `text-error` | `#ff6369` | `#f58b84` | signal red text |
| `text-helper` | `#888888` | `#8c9093` | cool grey at the lightness of #8f8f8f |
| `text-inverse` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `text-on-color` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `text-on-color-disabled` | `#8f8f8f` | `#8c9093` | cool grey at the lightness of #8f8f8f |
| `text-placeholder` | `rgba(237, 237, 237, 0.4)` | `rgba(244, 244, 244, 0.4)` | the ink at 0.4 |
| `text-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `text-secondary` | `#a1a1a1` | `#9ea2a5` | cool grey at the lightness of #a1a1a1 |
| `link-inverse` | `#005ff2` | `#41629f` | slate fillHover |
| `link-inverse-active` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `link-inverse-hover` | `#002359` | `#355186` | slate fillActive |
| `link-inverse-visited` | `#7c3aed` | `#6d5496` | quiet purple fillHover |
| `link-primary` | `#52a8ff` | `#94afdf` | slate text |
| `link-primary-hover` | `#8fc7ff` | `#b6c8e8` | slate hover |
| `link-secondary` | `#8fc7ff` | `#b6c8e8` | slate hover |
| `link-visited` | `#bf7af0` | `#b5a3d8` | quiet purple text |
| `icon-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `icon-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-inverse` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `icon-on-color` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `icon-on-color-disabled` | `rgba(0, 0, 0, 0.4)` | `rgba(0, 0, 0, 0.4)` | black, as before |
| `icon-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-secondary` | `#a1a1a1` | `#9ea2a5` | cool grey at the lightness of #a1a1a1 |
| `support-caution-major` | `#f97316` | `#eb7c33` | signal orange glyph |
| `support-caution-minor` | `#f5a623` | `#e3c23b` | signal yellow glyphLight |
| `support-caution-undefined` | `#8e4ec6` | `#ae84f2` | signal purple glyph |
| `support-error` | `#f13342` | `#f2716a` | signal red glyph |
| `support-error-inverse` | `#cd2b31` | `#c13c3b` | signal red fill |
| `support-info` | `#52a8ff` | `#679cff` | signal blue glyph |
| `support-info-inverse` | `#0070f3` | `#4f72b3` | slate fill |
| `support-success` | `#00ac3a` | `#43b966` | signal green glyph |
| `support-success-inverse` | `#2a7e3b` | `#05893e` | signal green fill |
| `support-warning` | `#ffae00` | `#fcb442` | signal amber glyphLight |
| `support-warning-inverse` | `#d97706` | `#986600` | signal amber fill |
| `focus` | `#ffffff` | `#ffffff` | white |
| `focus-inset` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `focus-inverse` | `#0070f3` | `#4f72b3` | slate fill |
| `chat-avatar-agent` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-avatar-bot` | `#888888` | `#85898c` | cool grey at the lightness of #888888 |
| `chat-avatar-user` | `#52a8ff` | `#94afdf` | slate text |
| `chat-bubble-agent` | `#111111` | `#181a1d` | cool grey at the lightness of #1a1a1a |
| `chat-bubble-agent-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-bubble-border` | `#262626` | `#404346` | cool grey at the lightness of #434343 |
| `chat-bubble-user` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `chat-bubble-user-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-button` | `#52a8ff` | `#94afdf` | slate text |
| `chat-button-active` | `rgba(255, 255, 255, 0.18)` | `rgba(242, 244, 248, 0.18)` | Carbon cool gray 10 at 0.18 |
| `chat-button-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(242, 244, 248, 0.06)` | Carbon cool gray 10 at 0.06 |
| `chat-button-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(242, 244, 248, 0.1)` | Carbon cool gray 10 at 0.1 |
| `chat-button-text-hover` | `#8fc7ff` | `#b6c8e8` | slate hover |
| `chat-button-text-selected` | `#a1a1a1` | `#9ea2a5` | cool grey at the lightness of #a1a1a1 |
| `chat-header-background` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `chat-header-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-prompt-background` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `chat-prompt-border-end` | `rgba(26, 26, 26, 0)` | `rgba(50, 52, 55, 0)` | the rule colour, clear |
| `chat-prompt-border-start` | `#1a1a1a` | `#323437` | cool grey at the lightness of #343434 |
| `chat-prompt-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-shell-background` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `highlight` | `#102a43` | `#212b3f` | slate tint |
| `overlay` | `rgba(0, 0, 0, 0.72)` | `rgba(0, 0, 0, 0.72)` | black, as before |
| `shadow` | `rgba(0, 0, 0, 0.8)` | `rgba(0, 0, 0, 0.8)` | black, as before |
| `skeleton-background` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `skeleton-element` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `toggle-off` | `#2e2e2e` | `#6c7073` | cool grey at the lightness of #6f6f6f |
| `button-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-primary-hover` | `#d4d4d4` | `#d1d5d8` | cool grey at the lightness of #d4d4d4 |
| `button-primary-active` | `#a1a1a1` | `#9ea2a5` | cool grey at the lightness of #a1a1a1 |
| `button-tertiary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-tertiary-hover` | `#d4d4d4` | `#d1d5d8` | cool grey at the lightness of #d4d4d4 |
| `button-tertiary-active` | `#a1a1a1` | `#9ea2a5` | cool grey at the lightness of #a1a1a1 |
| `button-secondary` | `#0a0a0a` | `#0f1114` | cool grey at the lightness of #111111 |
| `button-secondary-hover` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `button-secondary-active` | `#2e2e2e` | `#313336` | cool grey at the lightness of #333333 |
| `button-danger-primary` | `#e2162a` | `#c13c3b` | signal red fill |
| `button-danger-secondary` | `#ff565f` | `#f58b84` | signal red text |
| `button-danger-hover` | `#cd2b31` | `#ac3031` | signal red fillHover |
| `button-danger-active` | `#b81d26` | `#972527` | signal red fillActive |
| `button-separator` | `#000000` | `#000000` | cool grey at the lightness of #000000 |
| `button-disabled` | `#1a1a1a` | `#222427` | cool grey at the lightness of #242424 |
| `tag-background-red` | `#4f000f` | `#3d2421` | quiet red tint |
| `tag-color-red` | `#ff565f` | `#e6b7b2` | quiet red tagText |
| `tag-hover-red` | `#550614` | `#462a28` | quiet red tintHover |
| `tag-background-magenta` | `#530029` | `#3a232e` | quiet magenta tint |
| `tag-color-magenta` | `#ff4d8d` | `#e1b6c9` | quiet magenta tagText |
| `tag-hover-magenta` | `#59002e` | `#442a36` | quiet magenta tintHover |
| `tag-background-purple` | `#3b084d` | `#2e273c` | quiet purple tint |
| `tag-color-purple` | `#c472fb` | `#c9bde3` | quiet purple tagText |
| `tag-hover-purple` | `#400f53` | `#362e46` | quiet purple tintHover |
| `tag-background-blue` | `#002458` | `#212b3f` | slate tint |
| `tag-color-blue` | `#47a8ff` | `#b1c5e9` | slate tagText |
| `tag-hover-blue` | `#00295e` | `#273349` | slate tintHover |
| `tag-background-cyan` | `#002458` | `#132f3a` | quiet cyan tint |
| `tag-color-cyan` | `#47a8ff` | `#9eccdf` | quiet cyan tagText |
| `tag-hover-cyan` | `#00295e` | `#183743` | quiet cyan tintHover |
| `tag-background-teal` | `#003429` | `#11322e` | quiet teal tint |
| `tag-color-teal` | `#00cfb7` | `#9cd0c9` | quiet teal tagText |
| `tag-hover-teal` | `#003a2e` | `#153a36` | quiet teal tintHover |
| `tag-background-green` | `#003400` | `#1d3121` | quiet green tint |
| `tag-color-green` | `#00ca50` | `#accfb2` | quiet green tagText |
| `tag-hover-green` | `#003902` | `#223927` | quiet green tintHover |
| `tag-background-gray` | `#262626` | `#3c3f42` | cool grey at the lightness of #3f3f3f |
| `tag-color-gray` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `tag-hover-gray` | `#2b2b2b` | `#474a4e` | cool grey at the lightness of #4a4a4a |
| `tag-border-red` | `#fa4d56` | `#da9c96` | quiet red text |
| `tag-border-blue` | `#4589ff` | `#94afdf` | slate text |
| `tag-border-cyan` | `#1192e8` | `#77b9d2` | quiet cyan text |
| `tag-border-teal` | `#009d9a` | `#74beb4` | quiet teal text |
| `tag-border-green` | `#24a148` | `#8cbc95` | quiet green text |
| `tag-border-magenta` | `#ee5396` | `#d49bb5` | quiet magenta text |
| `tag-border-purple` | `#a56eff` | `#b5a3d8` | quiet purple text |
| `tag-border-gray` | `#8d8d8d` | `#8a8e91` | cool grey at the lightness of #8d8d8d |
| `tag-border-cool-gray` | `#878d96` | `#878d96` | Carbon cool gray 50 |
| `tag-border-warm-gray` | `#8f8b8b` | `#8f8b8b` | Carbon warm gray 50 |
| `tag-background-cool-gray` | `#262626` | `#343a3f` | Carbon cool gray 80 |
| `tag-color-cool-gray` | `#ededed` | `#dde1e6` | Carbon cool gray 20 |
| `tag-hover-cool-gray` | `#2b2b2b` | `#4d5358` | Carbon cool gray 70 |
| `tag-background-warm-gray` | `#262626` | `#3c3838` | Carbon warm gray 80 |
| `tag-color-warm-gray` | `#ededed` | `#e5e0df` | Carbon warm gray 20 |
| `tag-hover-warm-gray` | `#2b2b2b` | `#565151` | Carbon warm gray 70 |
| `notification-background-error` | `#220b0c` | `#241110` | signal red glyph at 15% over the page |
| `notification-background-success` | `#0b190d` | `#0a1c0f` | signal green glyph at 15% over the page |
| `notification-background-info` | `#0c1926` | `#0f1726` | signal blue glyph at 15% over the page |
| `notification-background-warning` | `#251905` | `#261b0a` | signal amber glyph at 15% over the page |
| `notification-action-hover` | `var(--rux-layer-hover)` | `var(--rux-layer-hover)` | Carbon g100, by reference |
| `notification-action-tertiary-inverse` | `#0f62fe` | `#4f72b3` | slate fill |
| `notification-action-tertiary-inverse-active` | `#002d9c` | `#355186` | slate fillActive |
| `notification-action-tertiary-inverse-hover` | `#0050e6` | `#41629f` | slate fillHover |
| `notification-action-tertiary-inverse-text` | `#ffffff` | `#ffffff` | white |
| `notification-action-tertiary-inverse-text-on-color-disabled` | `#8d8d8d` | `#8a8e91` | cool grey at the lightness of #8d8d8d |
| `status-red` | `#fa4d56` | `#f2716a` | signal red glyph |
| `status-orange` | `#ff832b` | `#eb7c33` | signal orange glyph |
| `status-orange-outline` | `#ff832b` | `#eb7c33` | signal orange glyph |
| `status-yellow` | `#f1c21b` | `#e3c23b` | signal yellow glyphLight |
| `status-yellow-outline` | `#f1c21b` | `#e3c23b` | signal yellow glyphLight |
| `status-green` | `#42be65` | `#43b966` | signal green glyph |
| `status-blue` | `#4589ff` | `#679cff` | signal blue glyph |
| `status-purple` | `#a56eff` | `#ae84f2` | signal purple glyph |
| `status-gray` | `#8d8d8d` | `#8a8e91` | cool grey at the lightness of #8d8d8d |
| `content-switcher-background` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | black, as before |
| `content-switcher-background-hover` | `rgba(141, 141, 141, 0.12)` | `rgba(138, 142, 145, 0.12)` | cool grey at the lightness of #8d8d8d, as a wash |
| `content-switcher-selected` | `rgba(141, 141, 141, 0.24)` | `rgba(138, 142, 145, 0.24)` | cool grey at the lightness of #8d8d8d, as a wash |
| `ai-aura-end` | `not set` | `rgba(0, 0, 0, 0)` | clear, as Carbon g100 |
| `ai-aura-hover-background` | `not set` | `#313336` | cool grey at the lightness of #333333 |
| `ai-aura-hover-end` | `not set` | `rgba(0, 0, 0, 0)` | clear, as Carbon g100 |
| `ai-aura-hover-start` | `not set` | `rgba(148, 175, 223, 0.4)` | slate text at 0.4 |
| `ai-aura-start` | `not set` | `rgba(148, 175, 223, 0.1)` | slate text at 0.1 |
| `ai-aura-start-sm` | `not set` | `rgba(148, 175, 223, 0.16)` | slate text at 0.16 |
| `ai-border-end` | `not set` | `#94afdf` | slate text |
| `ai-border-start` | `not set` | `rgba(182, 200, 232, 0.36)` | slate hover at 0.36 |
| `ai-border-strong` | `not set` | `#b6c8e8` | slate hover |
| `ai-drop-shadow` | `not set` | `rgba(0, 0, 0, 0.28)` | black, as Carbon g100 |
| `ai-inner-shadow` | `not set` | `rgba(148, 175, 223, 0.16)` | slate text at 0.16 |
| `ai-overlay` | `not set` | `rgba(0, 0, 0, 0.5)` | black, as Carbon g100 |
| `ai-popover-background` | `not set` | `#0f1114` | cool grey at the lightness of #111111 |
| `ai-popover-caret-bottom` | `not set` | `#94afdf` | slate text |
| `ai-popover-caret-bottom-background` | `not set` | `#212b3f` | slate tint |
| `ai-popover-caret-bottom-background-actions` | `not set` | `#1d2638` | slate tint, a step darker |
| `ai-popover-caret-center` | `not set` | `#4f72b3` | slate fill |
| `ai-popover-shadow-outer-01` | `not set` | `rgba(0, 0, 0, 0.12)` | black, as Carbon g100 |
| `ai-popover-shadow-outer-02` | `not set` | `rgba(0, 0, 0, 0.08)` | black, as Carbon g100 |
| `ai-skeleton-background` | `not set` | `rgba(148, 175, 223, 0.5)` | slate text at 0.5 |
| `ai-skeleton-element-background` | `not set` | `rgba(148, 175, 223, 0.3)` | slate text at 0.3 |
