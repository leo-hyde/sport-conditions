# Compact site cards (My sites)

Written 28 Oct 2026 for Leo to approve, from finding 8 of the design review
(issue #13). **Not built yet.** The build happens in a fresh session that reads
CLAUDE.md, docs/STATUS.md and this file.

## Goal
On a phone, My sites should show more than one or two sites per screen, so
Leo can scan all his sites and open the one he wants. Right now each card shows
a dial, a tide tag, today, tomorrow, a tide line each, "Show all 7 days" and a
"1h good later" badge: two cards fill the screen.

## What to build
1. **A compact card by default:** site name, the small dial, and **today's**
   strip of hours (with the tide line). Nothing else.
2. **A "Show tomorrow and later" button** (what "Show all 7 days" does now,
   renamed so it says what you get). Tapping it opens the rest of the days on
   that card, as today. The "1h good later" badge stays on the button.
3. **Remember it per card** (already how `expandedSites` works), and keep
   the tide tag ("Tide rising · high at 18:20") in the header line.
4. Update DESIGN.md's card description, CHANGELOG.md and STATUS.md in the same
   commits.

## What's on screen
- **The screen's one job:** "How are my sites looking today, and which one is
  worth a closer look?"
- **Main screen** (every time): for each site, its name, wind dial and today's
  hours. The one main action: tap a card's button to see more.
- **One tap away:** tomorrow and the later days; the tide chart (the tide
  line, as now); Edit; the star (remove).
- **Settings:** none. Opening or closing a card is remembered per card, not a
  setting.
- **Later / not building:** a one-line "best session" summary per card; sorting
  sites by how good they look.

## Parts involved
- `app.js` (`renderSites`, around lines 278–345: `SHOWN_DAYS`, `expandedSites`,
  the `show-more` button).
- `style.css` (site cards, `.show-more`, phone layout).
- DESIGN.md, CHANGELOG.md, docs/STATUS.md. ARCHITECTURE.md only if the card
  code moves.

## Out of scope
- The Overview tab, the map and the tide chart.
- Changing the ratings or what makes an hour good.

## How we'll check it's done
- Check at 375px, light and dark: more of My sites fits on the first screen
  (aim: three cards; the 44px button and dial hint made that hard, see
  Progress). Measure with `--eval`
  (card heights) before looking at screenshots.
- The button says what it opens, is at least 44px tall, and opens and closes a
  card; the choice survives a refresh of the data.
- Surfing view still works (same card).
- The live site after pushing.

## Risks and open questions
- **Replaced later on 28 Oct 2026: Leo chose today AND tomorrow instead, with one "Show all 7 days" button that opens the later days on every card (see docs/decisions.md), and a blue edge plus more space so each site reads as separate. The text below and Progress describe the first, today-only build.**
- ~~Decided (Leo, 28 Oct 2026): today only.~~ The compact card shows today
  only; tomorrow loses its place on the card, but the Overview "By day" table
  still shows tomorrow for every site. **Approved, ready to build.**
- "Show all 7 days" is the existing wording. If Leo uses it by habit, the new
  name ("Show tomorrow and later") is a small change to get used to.
- Best built in a fresh session on a stronger model, because it changes what
  the main screen shows.

## Progress
- **Built 28 Oct 2026** (today-only, button "Show tomorrow and later", dial
  hint cut to one line). Measured at 375px in the browser, parakiting: cards
  are 233 / 247 / 206px tall, so **two cards fit fully and the third shows its
  name** (before: one card plus a bit). Three full cards did not fit: the
  top of the page takes about 180px and the 44px button was kept for thumbs.
  Surfing cards are taller (270px: tags and a Surfline link). Not checked in
  light mode or at desktop width.
