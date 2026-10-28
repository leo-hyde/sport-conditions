# Decisions

One entry for each decision, newest first. This stops later sessions undoing
a choice without knowing why. If we reverse one, we add a new entry and mark
the old one "Replaced by <date>". (I moved these here from docs/STATUS.md on
23 Oct 2026. The earlier entries give the reason, but not the other options
we turned down.)

## 28 Oct 2026 (evening): Map clusters, a size factor for surf spots, the keyboard mic for beep-free notes
- **What:** From feedback (#9, #6, #7, #15), Leo chose Claude's recommended answers: (1) your own map pins group into one numbered circle where they'd overlap, coloured by the best rating inside, using Leaflet.markercluster 1.5.3 from unpkg; guide sites aren't grouped; (2) each surf spot has a size factor (waves there compared with the open-sea forecast; for example Towan 0.6), editable, with Claude's starting guesses in `data/surf-spots.csv`; the swell compass stays; (3) for voice notes without beeps, the app points to the phone keyboard's own 🎤 in the typing box.
- **Why:** (1) Leo's favourite sites piled up when zoomed out; colouring the circle by the best rating keeps "is anywhere good?" visible, which answers the earlier worry. (2) Sheltered beaches (Towan behind the headland) are smaller than Fistral, and the free forecast can't see that. (3) Android's beep can't be switched off by a web page; the keyboard mic is free and copes with pauses.
- **Rejected:** grouping the ~960 guide sites too (they're small dots already); dropping the swell compass (#6: kept, since the size factor answers #7); longer listening for voice notes (Android repeats words in that mode); paid transcription (money and a secret key). This replaces the 28 Oct "Rejected: grouping map pins into clusters" below.

## 28 Oct 2026: Design rules are checked by a tool before every visual push; feedback buttons dock in the tab bar
- **What:** DESIGN.md has 10 "Rules every screen must pass"; `tools/ux-check.js` checks them on every screen, and CLAUDE.md requires PASS before pushing a visual change. The feedback buttons are now a small 🎙 ✎ pill, docked in the tab bar (or a panel's button bar) on phones; 📝 shows only while notes wait; the ✎/🎙 swap is in the note bar; the note bar pushes the page down. Edit site's Delete moved out of the button bar.
- **Why:** Leo asked for good design to be built in from now on, and said the mic buttons got in the way. A rule alone relies on each session remembering; a check that fails catches what a session misses (it caught two small tap sizes the review had missed).
- **Rejected:** a hook that runs the check on every push (about 2 minutes each time, and most pushes aren't visual); keeping the › fold (the docked pill covers nothing, so there's nothing to fold away); speaking as the only one-tap option (typing with the keyboard's 🎤 avoids Android's beeps, so ✎ stays one tap away).
- **Limits:** the tool checks what can be measured (contrast, sizes, names, focus, overlaps, states). Whether a screen is clear at a glance still needs a person's eye: Leo's on the phone, or a design review.
- **Replaces** "Hide the feedback buttons" (feedback #11, 28 Oct).

## 28 Oct 2026: Green means good; design review fixes chosen by Claude
- **What:** Leo asked for every finding in docs/design-review-2026-10-28.md to be fixed without asking him. Claude chose: (1) buttons, selected pills, the card edge and the map marker are near-black (near-white in dark), so green is only "good" and links; (2) OK cells in the Overview "By day" table use a softer yellow (`--ok-soft`), with ratings and default ranges unchanged; (3) phones get 44px taps, dense rows at least 24px (WCAG 2.2's minimum), and "By hour" cells stay dense; (4) Sync, Feedback and Start again fold away in Settings; (5) map names that would overlap are hidden, the wind flow is fainter (it stays on by default), and the map switches are remembered; (6) latitude and longitude stay as boxes, with labels and a hint.
- **Why:** each is the smallest change that fixes the finding without changing how hours are rated. Details and the deeper check: specs/design-fixes-2026-10-28.md.
- **Rejected:** a different green for "good" (it's the rating everyone reads first); narrowing the default OK wave range to make the Overview less yellow (a rating rule, so Leo's call); grouping map pins into clusters (would hide the ratings); hiding latitude and longitude in a fold (the browser can't point at a missing value inside a closed fold); the decimal keyboard for latitude and longitude (iPhones' has no minus sign, and UK longitudes are negative).
- **Replaces** the Mint entry's "the accent and good are the same green" trade-off.

## 28 Oct 2026: Keep Open-Meteo's default grid square for wind
- **What:** the app keeps asking Open-Meteo for its default ("land") grid square at each site.
- **Why:** issue #12 (Met Office lower than Windy at Fistral). Same model as Windy's UKV 2 km; the app reads 1–2 knots lower at coastal sites because Windy appears to blend nearby squares. The default square is chosen at a similar height to the site, which suits hill sites. Evidence: specs/forecast-validation.md.
- **Rejected:** the square nearest the site (no change at the coast, further from Windy at Cox Tor and Woolacombe); the sea square for coastal sites, Met Office only (closed the Fistral gap, but a special case and extra requests for 1–2 knots); blending four squares like Windy (four times the daily calls).

## 28 Oct 2026: App restyled with the Mint style
- **Why:** Leo asked for the playbook's Mint style. Applied by hand: Mint isn't in the library proper (a candidate, no tokens file), and this app has extra tokens (`--good`, `--ok`, `--no`).
- **Known trade-offs:** the accent (buttons) and the "good" rating are the same green, so a green button can be mistaken for "good"; a new `--link` token holds the darker green for text (the accent is 1.9:1 on white). Mint's Figtree font was not added (Google Fonts would tell Google each visitor's address on a public app). Light `--surface-2` is #f6f6f6, not Mint's #fafafa, so the selected tab passes 4.5:1.
- **Rejected:** keeping the blue accent with Mint's neutrals.

## 28 Oct 2026: Site cards show today and tomorrow; one button opens all 7 days on every card
- **Why:** Leo tried today-only cards (earlier the same day) and preferred today and tomorrow. Opening the later days opens them on **all** sites at once, so sites stay comparable. Each site card has a blue left edge and 24px of space under it so it is clear they are different places.
- **Rejected:** today-only cards (built and replaced the same day); a per-card open/close.
- **Replaces** the "today only" decision in `specs/compact-site-cards.md`.

## 27 Oct 2026: Trial of the `opusplan` model setting for one week
- **Why:** `opusplan` uses the strongest model for planning and a cheaper one for building, which may cut credits. Leo agreed to try it in this project (the playbook's canary). Set as `"model": "opusplan"` in `.claude/settings.json`. The playbook's monthly review compares it with before; ends about 3 Nov 2026, when we keep or remove it. Rejected: switching every project at once, before we know it helps.

## 27 Oct 2026: Playbook second release applied here first (canary): no session lock; cost notes and a push-to-main docs check
- **Why:** The playbook's catch-ups `2026-10-27-no-lock` and `2026-10-27-tokens`. Sessions now work on their own branch and merge to `main` when a step finishes. Docs are checked when pushing to `main` (`session.sh push-check`), not at the end of each reply.

## 23 Oct 2026: Next steps: Leo checks Surfing, then automated tests of the rating rules
- **Why:** The surf spots' details are Claude's rough guesses, so Leo checks them first. Tests are the main weak spot in docs/ARCHITECTURE.md. (Recorded late, on 26 Oct 2026, from docs/STATUS.md and docs/BACKLOG.md.)

## 23 Oct 2026: Shared rules come from the playbook; STATUS.md holds the current state only
- **Why:** Leo's general rules now copy themselves from claude-playbook into `.claude/rules/playbook.md`, so this project's CLAUDE.md holds only its own rules. Anthropic's best-practice guide says to keep the current state separate from history. So STATUS.md holds the current state only; decisions live here, and the history is in git log (the record of every saved change).
- **Turned down:** keeping a session diary in STATUS.md (every session re-read it, and git log already has it).

## 23 Oct 2026: Surf ratings stay good / OK / no (not Surfline's Poor / Fair / Good scale); heights in ft with Surfline-style words for size
- **Why:** Every sport then works the same way on the Overview and map. Surfline's ratings are its own forecasters' judgement.

## 23 Oct 2026: Wave forecasts come from a point 2.5 km out to sea from each spot
- **Why:** The forecast covers the world in a grid of squares. A point on the beach can fall in a land square, which has no waves.

## 23 Oct 2026: Tide rules for each site (not near, or only near, low or high water, within N hours), for every sport
- **Why:** Leo says the Newquay spots don't work around low tide (except Watergate). The rules must be easy to edit.

## 23 Oct 2026: Phone map timeline: a strip you swipe under a fixed marker
- **Why:** The version that stepped with your finger lost track of the finger.

## 23 Oct 2026: Explaining the work: an architecture document and walkthroughs, no "try this" suggestions
- **Why:** Leo wants to understand and check what's built, not tinker with it.

## 23 Oct 2026: One feature per session; tools/preview.js for checks
- **Why:** Long sessions use far more AI credits.

## 22 Oct 2026: Surfing: link to Surfline rather than copy its data; waves from Open-Meteo Marine
- **Why:** Surfline has no public API (no official way for apps to fetch its data), and its terms forbid copying. A public site can't rely on unofficial addresses.

## 22 Oct 2026: Feedback Send goes straight to GitHub through the Worker when a send code is set
- **Why:** Leo wanted one tap, not several steps.

## 22 Oct 2026: Feedback mode: notes spoken in the browser (speech recognition, or typing if that fails), sent as a filled-in GitHub Issue; just Leo for now
- **Why:** Leo tests on his phone, and the keyboard shouldn't cover the screen. It needs no server or secrets.

## 22 Oct 2026: No version numbers: "Beta", `CHANGELOG.md` by date, git tags (named bookmarks) for big milestones
- **Why:** There are lots of small changes, and git already keeps every version.

## 22 Oct 2026: (Replaced by 27 Oct 2026: no lock any more) The lock is held only while Claude is replying (claimed on each message, freed when the reply ends), on a `session-lock` branch
- **Why:** A session left open but idle kept blocking the other device. Saving the lock on main cluttered its history.

## 22 Oct 2026: By hour: a time strip ("8h 9h…"), speeds only on good and OK hours; the page always opens on Overview → By day
- **Why:** Times and speeds looked the same. By day is the quickest answer.

## 22 Oct 2026: Phone + computer handover kit (this file, `scripts/session.sh`, hooks)
- **Why:** Phone and Mac sessions can't see each other, so the project's files are the shared memory. (Hooks are commands that run by themselves at set moments, such as the start of a session.)

## 21 Oct 2026: Forecasts kept 30 min on the device; stop asking after a "daily limit" refusal; guide sites only from zoom level 9 (60 at most); wind flow 8×8 from zoom level 8
- **Why:** Testing used up Open-Meteo's free daily limit (10,000 calls per internet connection).

## 21 Oct 2026: Overview keeps By day and By hour; Best times removed
- **Why:** Leo tried all three layouts, as SPEC.md step 7 planned, and the first two answered "where works, and when?" best. (Recorded late, on 26 Oct 2026, from git log: "remove Best times".)

## 21 Oct 2026: Parakiting is the first sport, not paragliding
- **Why:** It's the sport Leo does at these sites. Paragliding stays in the sport menu as "coming soon". (Recorded late, on 26 Oct 2026, from git log: "Parakiting sport picker".)

## 21 Oct 2026: "No" hours are calm grey; a "Next good session" headline; cards show 2 days
- **Why:** The design review (DESIGN.md).

## 21 Oct 2026: Tides only for beach sites (`beach` column)
- **Why:** Leo only needs tides in case he lands on a beach.

## 21 Oct 2026: Sync "my sites" with a private code, stored by the Worker in Cloudflare KV
- **Why:** Sites were saved in each browser only.

## 21 Oct 2026: Editing `data/sites.csv` on GitHub checks it and rebuilds `sites.js` by itself (a GitHub Action)
- **Why:** Leo edits from his phone.

## 21 Oct 2026: Official tides from the Admiralty's API through the Worker (secret key)
- **Why:** The free tide model flattened the heights. (An API is a way for apps to fetch a service's data.)

## 21 Oct 2026: The project and the site are public, including the Flybubble site list
- **Why:** Leo will check with Flybubble later.

## 21 Oct 2026: Speeds fetched in the chosen unit (mph, km/h, knots or m/s)
- **Why:** Every number is then already right.

## 21 Oct 2026: Plain HTML, CSS and JavaScript (the basic languages of web pages), no build step; GitHub Pages hosting
- **Why:** It's easy to learn from, and it opens by double-clicking.
