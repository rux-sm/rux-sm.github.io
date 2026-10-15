---
type: reference
---

# Rux dark's tokens and where each comes from

Every colour `[data-theme="rux-dark"]` sets in `css/rux-theme.css`, on the page
and on Carbon's guide banner, which carries g100's tokens of its own, beside the
value geist-dark sets for the same token, and the rule rux-dark's comes from.
The rules are the ones below; the block's own comment says why.

**The ink** is the mark's `#f4f4f4`, Carbon gray 10. A wash over a surface is
that ink at the strength geist-dark gives white.

**The greys are neutral,** a ladder whose first raised surface is `#111111`,
on a page of `#000000`. **The lines are quiet:** a rule and a box's edge are
`#343434`, and the faint rule `#2e2e2e`; only an outlined button's ring takes
`border-strong-01`. **A field is filled** one even step of OKLCH lightness,
0.062, above the layer it sits on, inside the quiet line.

**The palette** is vivid, and every hue takes the same steps. A step is an
OKLCH lightness, and each hue takes 95% of the most chroma Display P3 holds
there, to 0.2 at most: an ink at 0.75 and its hover at 0.82 (amber and yellow
0.82 and 0.88), and a fill at the lightest step that still holds white at 4.5
to 1, pressing 0.05 and 0.10 darker. **A tag is a container,** as Material 3
draws one: a deep colour at 0.40 and 0.44 on hover, holding 0.17 of chroma or
90% of what P3 holds there where that is less, under words at 0.92 that keep
0.05 of the hue. Every pairing is measured at full P3 strength and as an
ordinary screen shows it, and holds on both.

| Hue | container | container, hover | words | ink | ink, hover | fill |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| red | `oklch(0.40 0.165 25)` | `oklch(0.44 0.17 25)` | `oklch(0.92 0.05 25)` | `oklch(0.75 0.183 25)` | `oklch(0.82 0.124 25)` | `oklch(0.59 0.2 25)` |
| orange | `oklch(0.40 0.108 50)` | `oklch(0.44 0.119 50)` | `oklch(0.92 0.05 50)` | `oklch(0.75 0.2 50)` | `oklch(0.82 0.136 50)` | `oklch(0.58 0.166 50)` |
| amber | `oklch(0.40 0.087 75)` | `oklch(0.44 0.096 75)` | `oklch(0.92 0.05 75)` | `oklch(0.82 0.188 75)` | `oklch(0.88 0.121 75)` | `oklch(0.57 0.131 75)` |
| yellow | `oklch(0.40 0.085 95)` | `oklch(0.44 0.094 95)` | `oklch(0.92 0.05 95)` | `oklch(0.82 0.185 95)` | `oklch(0.88 0.198 95)` | `oklch(0.565 0.127 95)` |
| green | `oklch(0.40 0.138 150)` | `oklch(0.44 0.152 150)` | `oklch(0.92 0.05 150)` | `oklch(0.75 0.2 150)` | `oklch(0.82 0.2 150)` | `oklch(0.535 0.195 150)` |
| teal | `oklch(0.40 0.086 185)` | `oklch(0.44 0.094 185)` | `oklch(0.92 0.05 185)` | `oklch(0.75 0.17 185)` | `oklch(0.82 0.186 185)` | `oklch(0.54 0.122 185)` |
| cyan | `oklch(0.40 0.09 225)` | `oklch(0.44 0.099 225)` | `oklch(0.92 0.05 225)` | `oklch(0.75 0.177 225)` | `oklch(0.82 0.125 225)` | `oklch(0.55 0.131 225)` |
| blue | `oklch(0.40 0.17 262)` | `oklch(0.44 0.17 262)` | `oklch(0.92 0.04 262)` | `oklch(0.75 0.132 262)` | `oklch(0.82 0.093 262)` | `oklch(0.575 0.2 262)` |
| purple | `oklch(0.40 0.17 300)` | `oklch(0.44 0.17 300)` | `oklch(0.92 0.047 300)` | `oklch(0.75 0.157 300)` | `oklch(0.82 0.111 300)` | `oklch(0.59 0.2 300)` |
| magenta | `oklch(0.40 0.168 350)` | `oklch(0.44 0.17 350)` | `oklch(0.92 0.05 350)` | `oklch(0.75 0.2 350)` | `oklch(0.82 0.15 350)` | `oklch(0.59 0.2 350)` |

The hues are red 25, orange 50, amber 75, yellow 95, green 150, teal 185, cyan
225, blue 262, purple 300 and magenta 350, in OKLCH degrees. The accent is the
blue. A low-contrast notification's fill is its ink at 15% over the page, so a
big surface stays calm.

| Token | geist-dark | rux-dark | From |
| :--- | :--- | :--- | :--- |
| `color-scheme` | `dark` | `dark` | kept |
| `background` | `#000000` | `#000000` | neutral grey #000000 |
| `background-active` | `rgba(255, 255, 255, 0.18)` | `rgba(244, 244, 244, 0.18)` | the ink at 0.18 |
| `background-brand` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(244, 244, 244, 0.06)` | the ink at 0.06 |
| `background-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-inverse-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `background-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(244, 244, 244, 0.1)` | the ink at 0.1 |
| `background-selected-hover` | `rgba(255, 255, 255, 0.14)` | `rgba(244, 244, 244, 0.14)` | the ink at 0.14 |
| `layer-01` | `#0a0a0a` | `#111111` | neutral grey #111111 |
| `layer-02` | `#111111` | `#1a1a1a` | neutral grey #1a1a1a |
| `layer-03` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `layer-accent-01` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `layer-accent-02` | `#242424` | `#2e2e2e` | neutral grey #2e2e2e |
| `layer-accent-03` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-accent-active-01` | `#333333` | `#3f3f3f` | neutral grey #3f3f3f |
| `layer-accent-active-02` | `#3f3f3f` | `#525252` | neutral grey #525252 |
| `layer-accent-active-03` | `#525252` | `#666666` | neutral grey #666666 |
| `layer-accent-hover-01` | `#242424` | `#2e2e2e` | neutral grey #2e2e2e |
| `layer-accent-hover-02` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-accent-hover-03` | `#333333` | `#3f3f3f` | neutral grey #3f3f3f |
| `layer-active-01` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-active-02` | `#333333` | `#3f3f3f` | neutral grey #3f3f3f |
| `layer-active-03` | `#3f3f3f` | `#525252` | neutral grey #525252 |
| `layer-background-01` | `#000000` | `#000000` | neutral grey #000000 |
| `layer-background-02` | `#0a0a0a` | `#111111` | neutral grey #111111 |
| `layer-background-03` | `#111111` | `#1a1a1a` | neutral grey #1a1a1a |
| `layer-hover-01` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `layer-hover-02` | `#242424` | `#2e2e2e` | neutral grey #2e2e2e |
| `layer-hover-03` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-selected-01` | `#242424` | `#2e2e2e` | neutral grey #2e2e2e |
| `layer-selected-02` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-selected-03` | `#333333` | `#3f3f3f` | neutral grey #3f3f3f |
| `layer-selected-disabled` | `#525252` | `#666666` | neutral grey #666666 |
| `layer-selected-hover-01` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `layer-selected-hover-02` | `#333333` | `#3f3f3f` | neutral grey #3f3f3f |
| `layer-selected-hover-03` | `#3f3f3f` | `#525252` | neutral grey #525252 |
| `layer-selected-inverse` | `#ededed` | `#ededed` | neutral grey #ededed |
| `field-01` | `#0a0a0a` | `#1f1f1f` | one step above layer-01 |
| `field-02` | `#0a0a0a` | `#292929` | one step above layer-02 |
| `field-03` | `#111111` | `#333333` | one step above layer-03 |
| `field-hover-01` | `#1a1a1a` | `#2e2e2e` | a step above field-01 |
| `field-hover-02` | `#1a1a1a` | `#383838` | a step above field-02 |
| `field-hover-03` | `#242424` | `#434343` | a step above field-03 |
| `border-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `border-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-strong-01` | `#606060` | `#666666` | neutral grey, ringing a field at 3 to 1 |
| `border-strong-02` | `#666666` | `#666666` | neutral grey #666666 |
| `border-strong-03` | `#888888` | `#888888` | neutral grey #888888 |
| `border-subtle-00` | `#1a1a1a` | `#2e2e2e` | the faint line, a step under the quiet line |
| `border-subtle-01` | `#262626` | `#343434` | the quiet line, neutral grey #343434 |
| `border-subtle-02` | `#333333` | `#343434` | the quiet line, neutral grey #343434 |
| `border-subtle-03` | `#3f3f3f` | `#343434` | the quiet line, neutral grey #343434 |
| `border-subtle-selected-01` | `#3f3f3f` | `#525252` | neutral grey #525252 |
| `border-subtle-selected-02` | `#525252` | `#666666` | neutral grey #666666 |
| `border-subtle-selected-03` | `#666666` | `#888888` | neutral grey #888888 |
| `border-tile-01` | `#333333` | `#343434` | the quiet line, neutral grey #343434 |
| `border-tile-02` | `#3f3f3f` | `#343434` | the quiet line, neutral grey #343434 |
| `border-tile-03` | `#525252` | `#343434` | the quiet line, neutral grey #343434 |
| `text-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `text-error` | `#ff6369` | `oklch(0.75 0.183 25)` | red ink |
| `text-helper` | `#888888` | `#8f8f8f` | neutral grey #8f8f8f |
| `text-inverse` | `#000000` | `#000000` | neutral grey #000000 |
| `text-on-color` | `#000000` | `#000000` | neutral grey #000000 |
| `text-on-color-disabled` | `#8f8f8f` | `#8f8f8f` | neutral grey #8f8f8f |
| `text-placeholder` | `rgba(237, 237, 237, 0.4)` | `rgba(244, 244, 244, 0.4)` | the ink at 0.4 |
| `text-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `text-secondary` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `link-inverse` | `#005ff2` | `oklch(0.525 0.2 262)` | blue fill, hover |
| `link-inverse-active` | `#000000` | `#000000` | neutral grey #000000 |
| `link-inverse-hover` | `#002359` | `oklch(0.475 0.2 262)` | blue fill, pressed |
| `link-inverse-visited` | `#7c3aed` | `oklch(0.54 0.2 300)` | purple fill, hover |
| `link-primary` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `link-primary-hover` | `#8fc7ff` | `oklch(0.82 0.093 262)` | blue ink, hover |
| `link-secondary` | `#8fc7ff` | `oklch(0.82 0.093 262)` | blue ink, hover |
| `link-visited` | `#bf7af0` | `oklch(0.75 0.157 300)` | purple ink |
| `icon-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `icon-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-inverse` | `#000000` | `#000000` | neutral grey #000000 |
| `icon-on-color` | `#000000` | `#000000` | neutral grey #000000 |
| `icon-on-color-disabled` | `rgba(0, 0, 0, 0.4)` | `rgba(0, 0, 0, 0.4)` | black, as before |
| `icon-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-secondary` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `support-caution-major` | `#f97316` | `oklch(0.75 0.2 50)` | orange ink |
| `support-caution-minor` | `#f5a623` | `oklch(0.82 0.185 95)` | yellow ink |
| `support-caution-undefined` | `#8e4ec6` | `oklch(0.75 0.157 300)` | purple ink |
| `support-error` | `#f13342` | `oklch(0.75 0.183 25)` | red ink |
| `support-error-inverse` | `#cd2b31` | `oklch(0.59 0.2 25)` | red fill |
| `support-info` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `support-info-inverse` | `#0070f3` | `oklch(0.575 0.2 262)` | blue fill |
| `support-success` | `#00ac3a` | `oklch(0.75 0.2 150)` | green ink |
| `support-success-inverse` | `#2a7e3b` | `oklch(0.535 0.195 150)` | green fill |
| `support-warning` | `#ffae00` | `oklch(0.82 0.188 75)` | amber ink |
| `support-warning-inverse` | `#d97706` | `oklch(0.57 0.131 75)` | amber fill |
| `focus` | `#ffffff` | `#ffffff` | white |
| `focus-inset` | `#000000` | `#000000` | neutral grey #000000 |
| `focus-inverse` | `#0070f3` | `oklch(0.575 0.2 262)` | blue fill |
| `chat-avatar-agent` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-avatar-bot` | `#888888` | `#888888` | neutral grey #888888 |
| `chat-avatar-user` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `chat-bubble-agent` | `#111111` | `#1a1a1a` | neutral grey #1a1a1a |
| `chat-bubble-agent-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-bubble-border` | `#262626` | `#343434` | the quiet line, neutral grey #343434 |
| `chat-bubble-user` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `chat-bubble-user-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-button` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `chat-button-active` | `rgba(255, 255, 255, 0.18)` | `rgba(244, 244, 244, 0.18)` | the ink at 0.18 |
| `chat-button-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(244, 244, 244, 0.06)` | the ink at 0.06 |
| `chat-button-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(244, 244, 244, 0.1)` | the ink at 0.1 |
| `chat-button-text-hover` | `#8fc7ff` | `oklch(0.82 0.093 262)` | blue ink, hover |
| `chat-button-text-selected` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `chat-header-background` | `#0a0a0a` | `#111111` | neutral grey #111111 |
| `chat-header-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-prompt-background` | `#000000` | `#000000` | neutral grey #000000 |
| `chat-prompt-border-end` | `rgba(26, 26, 26, 0)` | `rgba(46, 46, 46, 0)` | the faint line, clear |
| `chat-prompt-border-start` | `#1a1a1a` | `#2e2e2e` | the faint line, a step under the quiet line |
| `chat-prompt-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-shell-background` | `#0a0a0a` | `#111111` | neutral grey #111111 |
| `interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `highlight` | `#102a43` | `oklch(0.40 0.17 262)` | blue container |
| `overlay` | `rgba(0, 0, 0, 0.72)` | `rgba(0, 0, 0, 0.72)` | black, as before |
| `shadow` | `rgba(0, 0, 0, 0.8)` | `rgba(0, 0, 0, 0.8)` | black, as before |
| `skeleton-background` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `skeleton-element` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `toggle-off` | `#2e2e2e` | `#6f6f6f` | neutral grey #6f6f6f |
| `button-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-primary-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `button-primary-active` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `button-tertiary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-tertiary-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `button-tertiary-active` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `button-secondary` | `#0a0a0a` | `#111111` | neutral grey #111111 |
| `button-secondary-hover` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `button-secondary-active` | `#2e2e2e` | `#333333` | neutral grey #333333 |
| `button-danger-primary` | `#e2162a` | `oklch(0.59 0.2 25)` | red fill |
| `button-danger-secondary` | `#ff565f` | `oklch(0.75 0.183 25)` | red ink |
| `button-danger-hover` | `#cd2b31` | `oklch(0.54 0.2 25)` | red fill, hover |
| `button-danger-active` | `#b81d26` | `oklch(0.49 0.2 25)` | red fill, pressed |
| `button-separator` | `#000000` | `#000000` | neutral grey #000000 |
| `button-disabled` | `#1a1a1a` | `#242424` | neutral grey #242424 |
| `tag-background-red` | `#4f000f` | `oklch(0.40 0.165 25)` | red container |
| `tag-color-red` | `#ff565f` | `oklch(0.92 0.05 25)` | red words |
| `tag-hover-red` | `#550614` | `oklch(0.44 0.17 25)` | red container, hover |
| `tag-background-magenta` | `#530029` | `oklch(0.40 0.168 350)` | magenta container |
| `tag-color-magenta` | `#ff4d8d` | `oklch(0.92 0.05 350)` | magenta words |
| `tag-hover-magenta` | `#59002e` | `oklch(0.44 0.17 350)` | magenta container, hover |
| `tag-background-purple` | `#3b084d` | `oklch(0.40 0.17 300)` | purple container |
| `tag-color-purple` | `#c472fb` | `oklch(0.92 0.047 300)` | purple words |
| `tag-hover-purple` | `#400f53` | `oklch(0.44 0.17 300)` | purple container, hover |
| `tag-background-blue` | `#002458` | `oklch(0.40 0.17 262)` | blue container |
| `tag-color-blue` | `#47a8ff` | `oklch(0.92 0.04 262)` | blue words |
| `tag-hover-blue` | `#00295e` | `oklch(0.44 0.17 262)` | blue container, hover |
| `tag-background-cyan` | `#002458` | `oklch(0.40 0.09 225)` | cyan container |
| `tag-color-cyan` | `#47a8ff` | `oklch(0.92 0.05 225)` | cyan words |
| `tag-hover-cyan` | `#00295e` | `oklch(0.44 0.099 225)` | cyan container, hover |
| `tag-background-teal` | `#003429` | `oklch(0.40 0.086 185)` | teal container |
| `tag-color-teal` | `#00cfb7` | `oklch(0.92 0.05 185)` | teal words |
| `tag-hover-teal` | `#003a2e` | `oklch(0.44 0.094 185)` | teal container, hover |
| `tag-background-green` | `#003400` | `oklch(0.40 0.138 150)` | green container |
| `tag-color-green` | `#00ca50` | `oklch(0.92 0.05 150)` | green words |
| `tag-hover-green` | `#003902` | `oklch(0.44 0.152 150)` | green container, hover |
| `tag-background-gray` | `#262626` | `#3f3f3f` | neutral grey #3f3f3f |
| `tag-color-gray` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `tag-hover-gray` | `#2b2b2b` | `#4a4a4a` | neutral grey #4a4a4a |
| `tag-border-red` | `#fa4d56` | `oklch(0.75 0.183 25)` | red ink |
| `tag-border-blue` | `#4589ff` | `oklch(0.75 0.132 262)` | blue ink |
| `tag-border-cyan` | `#1192e8` | `oklch(0.75 0.177 225)` | cyan ink |
| `tag-border-teal` | `#009d9a` | `oklch(0.75 0.17 185)` | teal ink |
| `tag-border-green` | `#24a148` | `oklch(0.75 0.2 150)` | green ink |
| `tag-border-magenta` | `#ee5396` | `oklch(0.75 0.2 350)` | magenta ink |
| `tag-border-purple` | `#a56eff` | `oklch(0.75 0.157 300)` | purple ink |
| `tag-border-gray` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `tag-border-cool-gray` | `#878d96` | `#878d96` | Carbon cool gray 50 |
| `tag-border-warm-gray` | `#8f8b8b` | `#8f8b8b` | Carbon warm gray 50 |
| `tag-background-cool-gray` | `#262626` | `#343a3f` | Carbon cool gray 80 |
| `tag-color-cool-gray` | `#ededed` | `#dde1e6` | Carbon cool gray 20 |
| `tag-hover-cool-gray` | `#2b2b2b` | `#4d5358` | Carbon cool gray 70 |
| `tag-background-warm-gray` | `#262626` | `#3c3838` | Carbon warm gray 80 |
| `tag-color-warm-gray` | `#ededed` | `#e5e0df` | Carbon warm gray 20 |
| `tag-hover-warm-gray` | `#2b2b2b` | `#565151` | Carbon warm gray 70 |
| `notification-background-error` | `#220b0c` | `oklch(0.216 0.038 23.6)` | red ink at 15% over the page |
| `notification-background-success` | `#0b190d` | `oklch(0.216 0.042 151)` | green ink at 15% over the page |
| `notification-background-info` | `#0c1926` | `oklch(0.217 0.027 262.7)` | blue ink at 15% over the page |
| `notification-background-warning` | `#251905` | `oklch(0.231 0.044 79.2)` | amber ink at 15% over the page |
| `notification-action-hover` | `var(--rux-layer-hover)` | `var(--rux-layer-hover)` | Carbon g100, by reference |
| `notification-action-tertiary-inverse` | `#0f62fe` | `oklch(0.575 0.2 262)` | blue fill |
| `notification-action-tertiary-inverse-active` | `#002d9c` | `oklch(0.475 0.2 262)` | blue fill, pressed |
| `notification-action-tertiary-inverse-hover` | `#0050e6` | `oklch(0.525 0.2 262)` | blue fill, hover |
| `notification-action-tertiary-inverse-text` | `#ffffff` | `#ffffff` | white |
| `notification-action-tertiary-inverse-text-on-color-disabled` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `status-red` | `#fa4d56` | `oklch(0.75 0.183 25)` | red ink |
| `status-orange` | `#ff832b` | `oklch(0.75 0.2 50)` | orange ink |
| `status-orange-outline` | `#ff832b` | `oklch(0.75 0.2 50)` | orange ink |
| `status-yellow` | `#f1c21b` | `oklch(0.82 0.185 95)` | yellow ink |
| `status-yellow-outline` | `#f1c21b` | `oklch(0.82 0.185 95)` | yellow ink |
| `status-green` | `#42be65` | `oklch(0.75 0.2 150)` | green ink |
| `status-blue` | `#4589ff` | `oklch(0.75 0.132 262)` | blue ink |
| `status-purple` | `#a56eff` | `oklch(0.75 0.157 300)` | purple ink |
| `status-gray` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `content-switcher-background` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | black, as before |
| `content-switcher-background-hover` | `rgba(141, 141, 141, 0.12)` | `rgba(141, 141, 141, 0.12)` | neutral grey #8d8d8d, as a wash |
| `content-switcher-selected` | `rgba(141, 141, 141, 0.24)` | `rgba(141, 141, 141, 0.24)` | neutral grey #8d8d8d, as a wash |
| `ai-aura-end` | `not set` | `rgba(0, 0, 0, 0)` | clear, as Carbon g100 |
| `ai-aura-hover-background` | `not set` | `#333333` | neutral grey #333333 |
| `ai-aura-hover-end` | `not set` | `rgba(0, 0, 0, 0)` | clear, as Carbon g100 |
| `ai-aura-hover-start` | `not set` | `oklch(0.75 0.132 262 / 0.4)` | blue ink at 0.4 |
| `ai-aura-start` | `not set` | `oklch(0.75 0.132 262 / 0.1)` | blue ink at 0.1 |
| `ai-aura-start-sm` | `not set` | `oklch(0.75 0.132 262 / 0.16)` | blue ink at 0.16 |
| `ai-border-end` | `not set` | `oklch(0.75 0.132 262)` | blue ink |
| `ai-border-start` | `not set` | `oklch(0.82 0.093 262 / 0.36)` | blue ink, hover, at 0.36 |
| `ai-border-strong` | `not set` | `oklch(0.82 0.093 262)` | blue ink, hover |
| `ai-drop-shadow` | `not set` | `rgba(0, 0, 0, 0.28)` | black, as Carbon g100 |
| `ai-inner-shadow` | `not set` | `oklch(0.75 0.132 262 / 0.16)` | blue ink at 0.16 |
| `ai-overlay` | `not set` | `rgba(0, 0, 0, 0.5)` | black, as Carbon g100 |
| `ai-popover-background` | `not set` | `#111111` | neutral grey #111111 |
| `ai-popover-caret-bottom` | `not set` | `oklch(0.75 0.132 262)` | blue ink |
| `ai-popover-caret-bottom-background` | `not set` | `oklch(0.40 0.17 262)` | blue container |
| `ai-popover-caret-bottom-background-actions` | `not set` | `oklch(0.37 0.17 262)` | blue container, a step darker |
| `ai-popover-caret-center` | `not set` | `oklch(0.575 0.2 262)` | blue fill |
| `ai-popover-shadow-outer-01` | `not set` | `rgba(0, 0, 0, 0.12)` | black, as Carbon g100 |
| `ai-popover-shadow-outer-02` | `not set` | `rgba(0, 0, 0, 0.08)` | black, as Carbon g100 |
| `ai-skeleton-background` | `not set` | `oklch(0.75 0.132 262 / 0.5)` | blue ink at 0.5 |
| `ai-skeleton-element-background` | `not set` | `oklch(0.75 0.132 262 / 0.3)` | blue ink at 0.3 |
