---
type: reference
---

# Rux dark's tokens and where each comes from

Every colour `[data-theme="rux-dark"]` sets in `css/rux-theme.css`, on the page
and on Carbon's guide banner, which carries g100's tokens of its own, beside the
value geist-dark sets for the same token, and the rule rux-dark's comes from.
The rules are the ones below; the block's own comment says why.

**The ink** is the mark's `#f4f4f4`, Carbon gray 10, and there is no second
white: a hovered link and the focus ring are the ink too. A wash over a surface
is that ink at the strength geist-dark gives white. Below the ink, words take
two greys: `#b4b4b4` for secondary text and icons, `#9e9e9e` for helper and
placeholder text.

**The greys are neutral and climb one ladder,** from `#181818`, each
step 0.034 of OKLCH lightness above the last: `#202020`, `#282828`, `#303030`,
`#393939`, `#424242`, `#4b4b4b`, `#545454`. The page alone stands off it, at `#1b1b1b`, so a wide empty page under `#282828` tiles reads as the page rather than a hole. A layer's hover is two steps above
it, its press four and its selected row three. **The lines are quiet:** a rule
and a box's edge are `#424242`, and the faint rule `#393939`. **One control
grey,** `#7a7a7a`, 4.1 to 1 on the page, rings a field and an outlined button,
edges a bare button under the pointer and draws the off toggle. **A field is
filled** two steps above the layer it sits on.

**The palette** is vivid, and every hue takes the same four named steps. A
step is an OKLCH lightness, and each takes 95% of the most chroma Display P3
holds there, to 0.2 at most: **deep** at 0.34, for a big surface that stands
back, as a trip not yet confirmed does; **container** at 0.40 and 0.44 on
hover, holding 0.17 of chroma or 90% of what P3 holds there, under **words** at
0.92 that keep 0.05 of the hue; **fill**, the lightest step that still holds
white at 4.5 to 1, pressing 0.05 and 0.10 darker; and **ink** at 0.75 and 0.82
on hover (amber and yellow 0.82 and 0.88). Teal's and cyan's containers stand
at 0.46 and 0.50, where they keep their colour and their words still hold 4.5
to 1. Amber and yellow turn brown held deep, so in a container's place they
take a **light** step, 0.72 and 0.80, under black words; the scheduler's
placeholder bar is amber's light step. Every pairing is measured at full P3
strength and as an ordinary screen shows it, and holds.

| Hue | deep | container | container, hover | words | ink | ink, hover | fill |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| red | `oklch(0.34 0.148 25)` | `oklch(0.40 0.165 25)` | `oklch(0.44 0.17 25)` | `oklch(0.92 0.05 25)` | `oklch(0.75 0.183 25)` | `oklch(0.82 0.124 25)` | `oklch(0.59 0.2 25)` |
| orange | `oklch(0.34 0.097 50)` | `oklch(0.40 0.108 50)` | `oklch(0.44 0.119 50)` | `oklch(0.92 0.05 50)` | `oklch(0.75 0.2 50)` | `oklch(0.82 0.136 50)` | `oklch(0.58 0.166 50)` |
| amber | `oklch(0.34 0.078 75)` | `oklch(0.72 0.166 75)` (light) | the light step, with an inner ring | `#000000` | `oklch(0.82 0.188 75)` | `oklch(0.88 0.121 75)` | `oklch(0.57 0.131 75)` |
| yellow | `oklch(0.34 0.077 95)` | `oklch(0.80 0.18 95)` (light) | the light step, with an inner ring | `#000000` | `oklch(0.82 0.185 95)` | `oklch(0.88 0.198 95)` | `oklch(0.565 0.127 95)` |
| green | `oklch(0.34 0.124 150)` | `oklch(0.40 0.138 150)` | `oklch(0.44 0.152 150)` | `oklch(0.92 0.05 150)` | `oklch(0.75 0.2 150)` | `oklch(0.82 0.2 150)` | `oklch(0.535 0.195 150)` |
| teal | `oklch(0.34 0.077 185)` | `oklch(0.46 0.099 185)` | `oklch(0.50 0.107 185)` | `oklch(0.92 0.05 185)` | `oklch(0.75 0.17 185)` | `oklch(0.82 0.186 185)` | `oklch(0.54 0.122 185)` |
| cyan | `oklch(0.34 0.081 225)` | `oklch(0.46 0.104 225)` | `oklch(0.50 0.113 225)` | `oklch(0.92 0.05 225)` | `oklch(0.75 0.177 225)` | `oklch(0.82 0.125 225)` | `oklch(0.55 0.131 225)` |
| blue | `oklch(0.34 0.186 262)` | `oklch(0.40 0.17 262)` | `oklch(0.44 0.17 262)` | `oklch(0.92 0.04 262)` | `oklch(0.75 0.132 262)` | `oklch(0.82 0.093 262)` | `oklch(0.575 0.2 262)` |
| purple | `oklch(0.34 0.179 300)` | `oklch(0.40 0.17 300)` | `oklch(0.44 0.17 300)` | `oklch(0.92 0.047 300)` | `oklch(0.75 0.157 300)` | `oklch(0.82 0.111 300)` | `oklch(0.59 0.2 300)` |
| magenta | `oklch(0.34 0.151 350)` | `oklch(0.40 0.168 350)` | `oklch(0.44 0.17 350)` | `oklch(0.92 0.05 350)` | `oklch(0.75 0.2 350)` | `oklch(0.82 0.15 350)` | `oklch(0.59 0.2 350)` |

The hues are red 25, orange 50, amber 75, yellow 95, green 150, teal 185, cyan
225, blue 262, purple 300 and magenta 350, in OKLCH degrees. Links, the on
toggle and focus are the ink, so the palette marks only a status. Every notification's fill, high-contrast or low, is its ink at 15% over
the page, so a big surface stays calm.

| Token | geist-dark | rux-dark | From |
| :--- | :--- | :--- | :--- |
| `color-scheme` | `dark` | `dark` | kept |
| `background` | `#000000` | `#1b1b1b` | the page, a third of a step above the ladder's foot |
| `background-active` | `rgba(255, 255, 255, 0.18)` | `rgba(244, 244, 244, 0.18)` | the ink at 0.18 |
| `background-brand` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(244, 244, 244, 0.06)` | the ink at 0.06 |
| `background-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `background-inverse-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `background-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(244, 244, 244, 0.1)` | the ink at 0.1 |
| `background-selected-hover` | `rgba(255, 255, 255, 0.14)` | `rgba(244, 244, 244, 0.14)` | the ink at 0.14 |
| `layer-01` | `#0a0a0a` | `#202020` | the ladder, step 1 |
| `layer-02` | `#111111` | `#282828` | the ladder, step 2 |
| `layer-03` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `layer-accent-01` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `layer-accent-02` | `#242424` | `#393939` | the ladder, step 4 |
| `layer-accent-03` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-accent-active-01` | `#333333` | `#4b4b4b` | the ladder, step 6 |
| `layer-accent-active-02` | `#3f3f3f` | `#545454` | the ladder, step 7 |
| `layer-accent-active-03` | `#525252` | `#676767` | the ladder, step 9 |
| `layer-accent-hover-01` | `#242424` | `#393939` | the ladder, step 4 |
| `layer-accent-hover-02` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-accent-hover-03` | `#333333` | `#4b4b4b` | the ladder, step 6 |
| `layer-active-01` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-active-02` | `#333333` | `#4b4b4b` | the ladder, step 6 |
| `layer-active-03` | `#3f3f3f` | `#545454` | the ladder, step 7 |
| `layer-background-01` | `#000000` | `#1b1b1b` | the page, a third of a step above the ladder's foot |
| `layer-background-02` | `#0a0a0a` | `#202020` | the ladder, step 1 |
| `layer-background-03` | `#111111` | `#282828` | the ladder, step 2 |
| `layer-hover-01` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `layer-hover-02` | `#242424` | `#393939` | the ladder, step 4 |
| `layer-hover-03` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-selected-01` | `#242424` | `#393939` | the ladder, step 4 |
| `layer-selected-02` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-selected-03` | `#333333` | `#4b4b4b` | the ladder, step 6 |
| `layer-selected-disabled` | `#525252` | `#717171` | the ladder, step 10 |
| `layer-selected-hover-01` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `layer-selected-hover-02` | `#333333` | `#4b4b4b` | the ladder, step 6 |
| `layer-selected-hover-03` | `#3f3f3f` | `#545454` | the ladder, step 7 |
| `layer-selected-inverse` | `#ededed` | `#ededed` | neutral grey #ededed |
| `field-01` | `#0a0a0a` | `#303030` | the ladder, step 3 |
| `field-02` | `#0a0a0a` | `#393939` | the ladder, step 4 |
| `field-03` | `#111111` | `#424242` | the ladder, step 5 |
| `field-hover-01` | `#1a1a1a` | `#393939` | the ladder, step 4 |
| `field-hover-02` | `#1a1a1a` | `#424242` | the ladder, step 5 |
| `field-hover-03` | `#242424` | `#4b4b4b` | the ladder, step 6 |
| `border-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `border-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-inverse` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `border-strong-01` | `#606060` | `#7a7a7a` | the control grey, 4.14 to 1 on the page |
| `border-strong-02` | `#666666` | `#7a7a7a` | the control grey, 4.14 to 1 on the page |
| `border-strong-03` | `#888888` | `#888888` | neutral grey #888888 |
| `border-subtle-00` | `#1a1a1a` | `#393939` | the ladder, step 4 |
| `border-subtle-01` | `#262626` | `#424242` | the ladder, step 5 |
| `border-subtle-02` | `#333333` | `#424242` | the ladder, step 5 |
| `border-subtle-03` | `#3f3f3f` | `#424242` | the ladder, step 5 |
| `border-subtle-selected-01` | `#3f3f3f` | `#545454` | the ladder, step 7 |
| `border-subtle-selected-02` | `#525252` | `#676767` | the ladder, step 9 |
| `border-subtle-selected-03` | `#666666` | `#888888` | neutral grey #888888 |
| `border-tile-01` | `#333333` | `#424242` | the ladder, step 5 |
| `border-tile-02` | `#3f3f3f` | `#424242` | the ladder, step 5 |
| `border-tile-03` | `#525252` | `#424242` | the ladder, step 5 |
| `text-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `text-error` | `#ff6369` | `oklch(0.75 0.183 25)` | red ink |
| `text-helper` | `#888888` | `#9e9e9e` | helper text grey, 4.93 to 1 on layer-03 |
| `text-inverse` | `#000000` | `#000000` | neutral grey #000000 |
| `text-on-color` | `#000000` | `#000000` | neutral grey #000000 |
| `text-on-color-disabled` | `#8f8f8f` | `#9e9e9e` | helper text grey, 4.93 to 1 on layer-03 |
| `text-placeholder` | `rgba(237, 237, 237, 0.4)` | `#9e9e9e` | helper text grey, 4.93 to 1 on layer-03 |
| `text-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `text-secondary` | `#a1a1a1` | `#b4b4b4` | secondary text grey, 6.37 to 1 on layer-03 |
| `link-inverse` | `#005ff2` | `#000000` | neutral grey #000000, on the inverse surface |
| `link-inverse-active` | `#000000` | `#000000` | neutral grey #000000 |
| `link-inverse-hover` | `#002359` | `#333333` | neutral grey #333333 |
| `link-inverse-visited` | `#7c3aed` | `#525252` | neutral grey #525252 |
| `link-primary` | `#52a8ff` | `#f4f4f4` | the ink, underlined |
| `link-primary-hover` | `#8fc7ff` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `link-secondary` | `#8fc7ff` | `#d4d4d4` | neutral grey #d4d4d4 |
| `link-visited` | `#bf7af0` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-disabled` | `rgba(237, 237, 237, 0.25)` | `rgba(244, 244, 244, 0.25)` | the ink at 0.25 |
| `icon-interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-inverse` | `#000000` | `#000000` | neutral grey #000000 |
| `icon-on-color` | `#000000` | `#000000` | neutral grey #000000 |
| `icon-on-color-disabled` | `rgba(0, 0, 0, 0.4)` | `rgba(0, 0, 0, 0.4)` | black, as before |
| `icon-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `icon-secondary` | `#a1a1a1` | `#b4b4b4` | secondary text grey, 6.37 to 1 on layer-03 |
| `support-caution-major` | `#f97316` | `oklch(0.75 0.2 50)` | orange ink |
| `support-caution-minor` | `#f5a623` | `oklch(0.82 0.188 75)` | amber ink: yellow marks no status |
| `support-caution-undefined` | `#8e4ec6` | `oklch(0.75 0.157 300)` | purple ink |
| `support-error` | `#f13342` | `oklch(0.75 0.183 25)` | red ink |
| `support-error-inverse` | `#cd2b31` | `oklch(0.59 0.2 25)` | red fill |
| `support-info` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `support-info-inverse` | `#0070f3` | `oklch(0.575 0.2 262)` | blue fill |
| `support-success` | `#00ac3a` | `oklch(0.75 0.2 150)` | green ink |
| `support-success-inverse` | `#2a7e3b` | `oklch(0.535 0.195 150)` | green fill |
| `support-warning` | `#ffae00` | `oklch(0.82 0.188 75)` | amber ink |
| `support-warning-inverse` | `#d97706` | `oklch(0.57 0.131 75)` | amber fill |
| `focus` | `#ffffff` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `focus-inset` | `#000000` | `#000000` | neutral grey #000000 |
| `focus-inverse` | `#0070f3` | `#000000` | neutral grey #000000 |
| `chat-avatar-agent` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-avatar-bot` | `#888888` | `#888888` | neutral grey #888888 |
| `chat-avatar-user` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `chat-bubble-agent` | `#111111` | `#282828` | the ladder, step 2 |
| `chat-bubble-agent-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-bubble-border` | `#262626` | `#424242` | the ladder, step 5 |
| `chat-bubble-user` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `chat-bubble-user-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-button` | `#52a8ff` | `oklch(0.75 0.132 262)` | blue ink |
| `chat-button-active` | `rgba(255, 255, 255, 0.18)` | `rgba(244, 244, 244, 0.18)` | the ink at 0.18 |
| `chat-button-hover` | `rgba(255, 255, 255, 0.06)` | `rgba(244, 244, 244, 0.06)` | the ink at 0.06 |
| `chat-button-selected` | `rgba(255, 255, 255, 0.1)` | `rgba(244, 244, 244, 0.1)` | the ink at 0.1 |
| `chat-button-text-hover` | `#8fc7ff` | `oklch(0.82 0.093 262)` | blue ink, hover |
| `chat-button-text-selected` | `#a1a1a1` | `#b4b4b4` | secondary text grey, 6.37 to 1 on layer-03 |
| `chat-header-background` | `#0a0a0a` | `#202020` | the ladder, step 1 |
| `chat-header-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-prompt-background` | `#000000` | `#1b1b1b` | the page, a third of a step above the ladder's foot |
| `chat-prompt-border-end` | `rgba(26, 26, 26, 0)` | `rgba(57, 57, 57, 0)` | the faint line, clear |
| `chat-prompt-border-start` | `#1a1a1a` | `#393939` | the ladder, step 4 |
| `chat-prompt-text` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `chat-shell-background` | `#0a0a0a` | `#202020` | the ladder, step 1 |
| `interactive` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `highlight` | `#102a43` | `oklch(0.40 0.17 262)` | blue container |
| `overlay` | `rgba(0, 0, 0, 0.72)` | `rgba(0, 0, 0, 0.72)` | black, as before |
| `shadow` | `rgba(0, 0, 0, 0.8)` | `rgba(0, 0, 0, 0.8)` | black, as before |
| `skeleton-background` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `skeleton-element` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `toggle-off` | `#2e2e2e` | `#7a7a7a` | the control grey, 4.14 to 1 on the page |
| `button-primary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-primary-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `button-primary-active` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `button-tertiary` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `button-tertiary-hover` | `#d4d4d4` | `#d4d4d4` | neutral grey #d4d4d4 |
| `button-tertiary-active` | `#a1a1a1` | `#a1a1a1` | neutral grey #a1a1a1 |
| `button-secondary` | `#0a0a0a` | `#202020` | the ladder, step 1 |
| `button-secondary-hover` | `#1a1a1a` | `#303030` | the ladder, step 3 |
| `button-secondary-active` | `#2e2e2e` | `#424242` | the ladder, step 5 |
| `button-danger-primary` | `#e2162a` | `oklch(0.59 0.2 25)` | red fill |
| `button-danger-secondary` | `#ff565f` | `oklch(0.75 0.183 25)` | red ink |
| `button-danger-hover` | `#cd2b31` | `oklch(0.54 0.2 25)` | red fill, hover |
| `button-danger-active` | `#b81d26` | `oklch(0.49 0.2 25)` | red fill, pressed |
| `button-separator` | `#000000` | `#1b1b1b` | the page, a third of a step above the ladder's foot |
| `button-disabled` | `#1a1a1a` | `#303030` | the ladder, step 3 |
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
| `tag-background-cyan` | `#002458` | `oklch(0.46 0.104 225)` | cyan container, lifted to 0.46 |
| `tag-color-cyan` | `#47a8ff` | `oklch(0.92 0.05 225)` | cyan words |
| `tag-hover-cyan` | `#00295e` | `oklch(0.50 0.113 225)` | cyan container, hover, at 0.50 |
| `tag-background-teal` | `#003429` | `oklch(0.46 0.099 185)` | teal container, lifted to 0.46 |
| `tag-color-teal` | `#00cfb7` | `oklch(0.92 0.05 185)` | teal words |
| `tag-hover-teal` | `#003a2e` | `oklch(0.50 0.107 185)` | teal container, hover, at 0.50 |
| `tag-background-green` | `#003400` | `oklch(0.40 0.138 150)` | green container |
| `tag-color-green` | `#00ca50` | `oklch(0.92 0.05 150)` | green words |
| `tag-hover-green` | `#003902` | `oklch(0.44 0.152 150)` | green container, hover |
| `tag-background-gray` | `#262626` | `#4b4b4b` | the ladder, step 6 |
| `tag-color-gray` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `tag-hover-gray` | `#2b2b2b` | `#545454` | the ladder, step 7 |
| `tag-border-red` | `#fa4d56` | `oklch(0.75 0.183 25)` | red ink |
| `tag-border-blue` | `#4589ff` | `oklch(0.75 0.132 262)` | blue ink |
| `tag-border-cyan` | `#1192e8` | `oklch(0.75 0.177 225)` | cyan ink |
| `tag-border-teal` | `#009d9a` | `oklch(0.75 0.17 185)` | teal ink |
| `tag-border-green` | `#24a148` | `oklch(0.75 0.2 150)` | green ink |
| `tag-border-magenta` | `#ee5396` | `oklch(0.75 0.2 350)` | magenta ink |
| `tag-border-purple` | `#a56eff` | `oklch(0.75 0.157 300)` | purple ink |
| `tag-border-gray` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `tag-border-cool-gray` | `#878d96` | `#8d8d8d` | neutral grey #8d8d8d |
| `tag-border-warm-gray` | `#8f8b8b` | `#8d8d8d` | neutral grey #8d8d8d |
| `tag-background-cool-gray` | `#262626` | `#424242` | neutral, the ladder, step 5 |
| `tag-color-cool-gray` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `tag-hover-cool-gray` | `#2b2b2b` | `#4b4b4b` | neutral, the ladder, step 6 |
| `tag-background-warm-gray` | `#262626` | `#545454` | neutral, the ladder, step 7 |
| `tag-color-warm-gray` | `#ededed` | `#f4f4f4` | the ink, the mark's Carbon gray 10 |
| `tag-hover-warm-gray` | `#2b2b2b` | `#5e5e5e` | neutral, the ladder, step 8 |
| `notification-background-error` | `#220b0c` | `color-mix(in oklab, oklch(0.75 0.183 25) 15%, #1b1b1b)` | red ink at 15% over the page, #1b1b1b |
| `notification-background-success` | `#0b190d` | `color-mix(in oklab, oklch(0.75 0.2 150) 15%, #1b1b1b)` | green ink at 15% over the page, #1b1b1b |
| `notification-background-info` | `#0c1926` | `color-mix(in oklab, oklch(0.75 0.132 262) 15%, #1b1b1b)` | blue ink at 15% over the page, #1b1b1b |
| `notification-background-warning` | `#251905` | `color-mix(in oklab, oklch(0.82 0.188 75) 15%, #1b1b1b)` | amber ink at 15% over the page, #1b1b1b |
| `notification-action-hover` | `var(--rux-layer-hover)` | `var(--rux-layer-hover)` | Carbon g100, by reference |
| `notification-action-tertiary-inverse` | `#0f62fe` | `oklch(0.575 0.2 262)` | blue fill |
| `notification-action-tertiary-inverse-active` | `#002d9c` | `oklch(0.475 0.2 262)` | blue fill, pressed |
| `notification-action-tertiary-inverse-hover` | `#0050e6` | `oklch(0.525 0.2 262)` | blue fill, hover |
| `notification-action-tertiary-inverse-text` | `#ffffff` | `#ffffff` | white |
| `notification-action-tertiary-inverse-text-on-color-disabled` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `status-red` | `#fa4d56` | `oklch(0.75 0.183 25)` | red ink |
| `status-orange` | `#ff832b` | `oklch(0.75 0.2 50)` | orange ink |
| `status-orange-outline` | `#ff832b` | `oklch(0.75 0.2 50)` | orange ink |
| `status-yellow` | `#f1c21b` | `oklch(0.82 0.188 75)` | amber ink: yellow marks no status |
| `status-yellow-outline` | `#f1c21b` | `oklch(0.82 0.188 75)` | amber ink: yellow marks no status |
| `status-green` | `#42be65` | `oklch(0.75 0.2 150)` | green ink |
| `status-blue` | `#4589ff` | `oklch(0.75 0.132 262)` | blue ink |
| `status-purple` | `#a56eff` | `oklch(0.75 0.157 300)` | purple ink |
| `status-gray` | `#8d8d8d` | `#8d8d8d` | neutral grey #8d8d8d |
| `content-switcher-background` | `rgba(0, 0, 0, 0)` | `rgba(0, 0, 0, 0)` | black, as before |
| `content-switcher-background-hover` | `rgba(141, 141, 141, 0.12)` | `rgba(141, 141, 141, 0.12)` | neutral grey #8d8d8d, as a wash |
| `content-switcher-selected` | `rgba(141, 141, 141, 0.24)` | `rgba(141, 141, 141, 0.24)` | neutral grey #8d8d8d, as a wash |
| `ai-aura-end` | `not set` | `rgba(0, 0, 0, 0)` | clear, as Carbon g100 |
| `ai-aura-hover-background` | `not set` | `#424242` | the ladder, step 5 |
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
| `ai-popover-background` | `not set` | `#202020` | the ladder, step 1 |
| `ai-popover-caret-bottom` | `not set` | `oklch(0.75 0.132 262)` | blue ink |
| `ai-popover-caret-bottom-background` | `not set` | `oklch(0.40 0.17 262)` | blue container |
| `ai-popover-caret-bottom-background-actions` | `not set` | `oklch(0.37 0.17 262)` | blue container, a step darker |
| `ai-popover-caret-center` | `not set` | `oklch(0.575 0.2 262)` | blue fill |
| `ai-popover-shadow-outer-01` | `not set` | `rgba(0, 0, 0, 0.12)` | black, as Carbon g100 |
| `ai-popover-shadow-outer-02` | `not set` | `rgba(0, 0, 0, 0.08)` | black, as Carbon g100 |
| `ai-skeleton-background` | `not set` | `oklch(0.75 0.132 262 / 0.5)` | blue ink at 0.5 |
| `ai-skeleton-element-background` | `not set` | `oklch(0.75 0.132 262 / 0.3)` | blue ink at 0.3 |
