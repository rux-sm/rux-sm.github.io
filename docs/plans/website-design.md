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
- **The bar under the hero is a strip of four short facts with fine
  dividers,** with no card or circle.
- **Groups we serve is a two-column list with fine lines,** each group a
  title and a line, linking to Services, where each group gets its details.
- **The customer's words are an open quotation** with room around it and
  its source under it, not a rounded box.
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
- **Every change is made in English and Spanish together,** and checked in
  Chrome on desktop and phone before it is pushed.

## Questions

- Buttons: keep Apple's round pill, or a modest 8px corner on every button
  across the site?
- The only vehicle photographs are of coach 763, a 52-seat lift coach. Can
  rux get one of a 56-seat coach and one of the van for the Fleet page, or
  do those rows go without a photograph?
- The home page's quotation names Shands Brooks Charters, a customer, which
  the site's rules forbid. Ask them and keep the name, or keep the words
  under "a Texas charter company"?
- Should the site show safety facts, such as the USDOT number, insurance
  and driver checks? If so, what are they, so they can join the strip?
- The hero's photograph: will rux widen it with a generative-expand tool,
  sky and road added on the left with the coach untouched, or does it stay
  as it is with the softer fade?

## Tasks

- [ ] Rebuild the hero as decided, and measure its words against the
      brightest part of the fade.
- [ ] Rebuild the Fleet page around its vehicles, with the gallery below
      under Explore the coaches.
- [ ] Turn the four facts into a strip, Groups we serve into a two-column
      list, and the quotation into an open one; take the circles off the
      icons across the site.
- [ ] Alternate whole sections between black and charcoal, and drop the
      card fills the open layouts no longer need.
- [ ] Set the type scale in `theme.css`.
- [ ] Give Services its details for each group and one photograph.
- [ ] Shorten the quote page's opening, brighten its labels and drop the
      helpers that repeat them.
- [ ] Give the header's logo more room and make its phone action easier to
      see.
- [ ] Crop the empty sky from the About page's office photograph.
- [ ] Set the buttons' corners as rux answers.
