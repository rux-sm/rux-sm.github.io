---
type: plan
---

# Plan: the company website's look

## Goal

The company website reads as a premium charter company rather than a
software screen: its photographs, type and open space carry the pages, and
cards stay only where a visitor compares one thing with another. The site
stays dark, as it is now. The launch itself is
[company-website.md](company-website.md).

## Decisions

- **The site stays near black, and whole sections take turns** between the
  page's black and a charcoal one step up, in place of a card behind each
  item, so sections part without boxes. rux chose a dark site over light
  sections.
- **It stays on Design's Apple theme and the device's own typeface,** with
  no web font, because the classes and type come from Design and the
  device's face is already a clean modern sans.
- **Cards stay only where a visitor compares:** the fleet's vehicles and the
  quote page's What happens next box. Everything else sits on the page.
- **Icons stand alone in Apple's light blue, without a circle behind,** and
  only where they help a reader find their row.
- **The home page's hero is the photograph and one action.** No small line
  above the headline; the headline at medium weight with Rio Grande Valley
  kept on one line where it fits; two lines of words under it; Request a
  quote filled and See the fleet as the quiet second action, with calling
  left to the header. The photograph's fade is softer and wider, and the
  words over it keep 4.5 to 1, measured.
- **The hero's photograph is rux's widened one,** 2400 by 1010 with the
  coach in its middle, run across the whole band at 130% from its left edge
  so the coach lands clear of the words; a phone crops it close to the coach.
- **The bar under the hero is a strip of short facts with fine dividers,**
  with no card or circle.
- **The site states the company's federal record, which a school checks:**
  USDOT 1017740 and MC-419620 in the footer, and FMCSA's Satisfactory safety
  rating in the strip, each linked to the company's SAFER page so anyone can
  check it. Crash counts and inspection rates stay off, because they change
  every month.
- **Groups we serve is a two-column list with fine lines,** each group a
  title and a line, linking to Services, where each group gets its details.
- **No customer's words are on the site until a customer agrees to be
  named,** because the site names no customer otherwise; they return as an
  open quotation with room around it, not a rounded box.
- **The type steps down and gets lighter:** the home page's headline 56 to
  64px and an inner page's title 44 to 52px, both medium weight; a section
  heading 32px; body 16 to 18px. They are token values in the site's
  `theme.css`, not new classes.
- **The Fleet page opens on its vehicles,** each a row with its own
  photograph and its facts: seats, sleeper berth, lift, what is on board.
  The gallery follows under Explore the coaches. A photograph shows a
  vehicle still in the fleet.
- **Services says what the home page does not:** for schools, purchase
  orders, bid contracts, insurance certificates and background checks; for
  teams, the luggage bays; for events, shuttles; with one photograph.
- **The quote page shows its fields sooner:** a shorter opening, brighter
  labels, and no helper line that only repeats its label. A helper that
  prevents a wrong answer stays.
- **The header keeps its links,** with more room around the logo and the
  phone action easier to see, within the header's one text button.
- **Every button takes a 6px corner,** the corner Apple's theme already
  gives a field, so every control on the site shares one shape.
- **Every change is made in English and Spanish together,** and checked in
  Chrome on desktop and phone before it is pushed.

## Questions

- Insurance and driver testing: what cover does the company carry, and are
  drivers drug and alcohol tested? Either joins the strip once it is known.

## Tasks

- [ ] Rebuild the Fleet page around its vehicles, with the gallery below
      under Explore the coaches.
- [ ] Alternate whole sections between black and charcoal, and drop the
      card fills the open layouts no longer need.
- [ ] Set the type scale in `theme.css`.
- [ ] Give Services its details for each group and one photograph.
- [ ] Shorten the quote page's opening, brighten its labels and drop the
      helpers that repeat them.
- [ ] Give the header's logo more room and make its phone action easier to
      see.
- [ ] Crop the empty sky from the About page's office photograph.
- [ ] Put the photographs of a 56-seat coach and the van on the Fleet page
      once rux has them.
