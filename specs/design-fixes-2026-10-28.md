# Design fixes from the 28 Oct review

Fixes every finding in [docs/design-review-2026-10-28.md](../docs/design-review-2026-10-28.md),
plus what a deeper second check found. Leo asked for all of them to be fixed
without further input (28 Oct), so Claude made the product choices below and
recorded them in docs/decisions.md.

## The deeper check (28 Oct, cloud session)
A script opened every screen with made-up forecasts (Surfing and Parakiting,
375px, light and dark), ran axe-core (an accessibility checker), measured
every button and link, tabbed through the page with the keyboard, and also
opened the feedback screens, an empty site list and failed forecasts. It
confirmed all 11 findings and found these too:

- **A. Failed forecasts look like bad weather.** If no forecast loads, the
  Overview says "Nothing flyable in the next 7 days" and shows empty rows.
  That could mislead. (Most important new finding.)
- **B. The keyboard focus ring is too faint:** pale green (`--accent`) on
  white is about 1.9:1; a focus ring needs 3:1.
- **C. Map credits link** ("Leaflet") is 3.3:1 in dark mode.
- **D. More small targets:** the feedback bar's ✕ and Send (34px), the map
  timeline's day names (17px), the map key's "Key" (18px).
- **E. Empty site list:** the colour key and "Over = already past" still
  show with nothing to explain.
- **F. Hour details opens with the "next hour" button focused**, not Close.
- Not reproduced: "Tide rising (6.4 m)" twice in hour details (the made-up
  data shows it once). The tide line is reworded anyway (item 7).

## The plan, in the order built
1. **Contrast** (findings 1, 2, B, C): no faded hour times; the sunrise line
   and other 10px text become 12px at full `--muted`; the focus ring uses
   `--link`; map credits use `--link`.
2. **Green means good** (finding 10): buttons, selected pills, the site-card
   edge and the map time marker become near-black (near-white in dark mode).
   Green is kept for ratings and green text (links).
3. **Calmer OK** (finding 9): on the Overview "By day" table, OK cells are a
   soft yellow; good cells stay full green. Ratings and settings don't change.
4. **Dialogs** (findings 3, F, part of 4): every dialog's buttons stay
   visible at the bottom; hour details gets a ✕ at the top, focused on open.
5. **Tap targets** (findings 6, D, part of 5): everything you tap is at least
   44px tall on phones, except dense rows, which are at least 24px (the
   WCAG 2.2 minimum): the tide line, the Surfline tag, the map timeline's day
   names, and the Overview "By hour" cells (kept dense by design: tap the
   site name for bigger blocks).
6. **Site form** (finding 4): the two compass pickers get names and work with
   the keyboard (Tab to the ring, arrows to move round it, Enter or Space to
   change a direction); the place search gets a name; Latitude/Longitude get
   plain labels and a hint.
7. **Words** (finding 7): plain words for period, glassy, overhead, swell
   and the tide line.
8. **Settings** (finding 8): Sync, Feedback and Start again fold away
   (tap to open); number boxes ask for the number or decimal keyboard.
9. **Map** (finding 5): site names that would overlap are hidden (tap a pin
   for its details); good pins sit on top of OK and No; the wind flow is
   fainter and thinner; the three map switches remember your choice;
   zoom and ◎ buttons 44px; switch rows 44px tall.
10. **Small fixes** (findings 11, A, E): a hidden "Site" heading in the
    table; the Sport and Forecast menus get a named area; failed forecasts
    say so; the empty site list hides the colour key.

## Out of scope
Changing the rating rules or default ranges (a product decision for Leo);
a screen reader walk-through; the playbook's `page-check.js` (not in this
repo; the script above covers the same checks).

## How to check it's done
- The audit script reports no axe violations (other than "By hour" target
  sizes, by design) on every screen, light and dark, both sports.
- Nothing under 44px tall on phones except the listed dense rows (≥ 24px).
- `node tools/preview.js` screenshots at 375px light and dark, and desktop.
- The live site after pushing.

## Progress
- 28 Oct: deep check done, plan written.
- 28 Oct: all 10 plan steps built. Checked with the audit script (axe-core,
  tap sizes, Tab order and focus rings, the compass by keyboard) on every
  screen: Surfing and Parakiting, 375px light and dark, and 1100px desktop;
  also failed forecasts (500 and 429), an empty site list and feedback mode.
  No axe violations left. Small targets left on purpose: checkboxes (the 44px
  row around them is the target), the map credits' links (Leaflet's own), and
  the dense rows listed in step 5.
- Not checked: a real screen reader; a real phone (Leo); real forecasts (the
  checks used made-up data, to save the daily limit).
