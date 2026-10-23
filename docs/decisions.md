# Decisions

One entry per decision, newest first, so later sessions don't undo a choice
without knowing why. If one is reversed, add a new entry and mark the old one
"Replaced by <date>". (Moved here from docs/STATUS.md on 23 Oct 2026; earlier
entries record the reason but not the alternatives.)

## 23 Oct 2026: Shared rules from the playbook; STATUS.md is current state only
- **Why:** Leo's general rules now sync from claude-playbook into `.claude/rules/playbook.md`, so this CLAUDE.md holds only project rules. Following Anthropic's best-practice guide, STATUS.md holds current state only; decisions live here and history in git log.
- **Rejected:** keeping a session log in STATUS.md (every session re-read it; git log already has it).

## 23 Oct 2026: Surf ratings stay good / OK / no (not Surfline's Poor/Fair/Good scale); heights in ft with Surfline-style size words
- **Why:** Every sport works the same on the Overview and map; Surfline's ratings are its forecasters' own judgement

## 23 Oct 2026: Waves forecast from a point 2.5 km out to sea from each spot
- **Why:** A point on the beach can fall in a land grid cell, which has no waves

## 23 Oct 2026: Tide rules per site (not / only near low / high water, N hours), for every sport
- **Why:** Leo: Newquay spots don't work around low tide (except Watergate); must be easy to edit

## 23 Oct 2026: Phone map timeline: a swipeable strip under a fixed marker
- **Why:** The finger-step version lost track of the finger

## 23 Oct 2026: Explaining the work: architecture doc + walkthroughs, no "try this" suggestions
- **Why:** Leo wants to understand and check what's built, not tinker

## 23 Oct 2026: One feature per session; tools/preview.js for checks
- **Why:** Long sessions use far more AI credits

## 22 Oct 2026: Surfing: link to Surfline rather than copy its data; waves from Open-Meteo Marine
- **Why:** Surfline has no public API and its terms forbid copying; a public site can't rely on unofficial addresses

## 22 Oct 2026: Feedback Send goes straight to GitHub through the Worker when a send code is set
- **Why:** Leo wanted one tap, not several steps

## 22 Oct 2026: Feedback mode: notes spoken in the browser (speech recognition, falls back to typing), sent as a pre-filled GitHub Issue; just Leo for now
- **Why:** Leo tests on his phone; no keyboard covering the screen; no server or secrets needed

## 22 Oct 2026: No version numbers: "Beta", `CHANGELOG.md` by date, git tags for big milestones
- **Why:** Lots of small changes; git already keeps every version

## 22 Oct 2026: Lock held only while Claude is replying (claimed on each message, freed when the reply ends), on a `session-lock` branch
- **Why:** An open-but-idle session kept blocking the other device; lock commits cluttered main

## 22 Oct 2026: By hour: time strip ("8h 9h…"), speeds only on good/OK hours; page always opens on Overview → By day
- **Why:** Times and speeds looked the same; By day is the quickest answer

## 22 Oct 2026: Phone + computer handover kit (this file, `scripts/session.sh`, hooks)
- **Why:** Phone and Mac sessions can't see each other; the repo is the shared memory

## 21 Oct 2026: Forecasts kept 30 min on the device; stop asking after a "daily limit" refusal; guide sites only from zoom 9 (max 60), wind flow 8×8 from zoom 8
- **Why:** Testing used up Open-Meteo's free daily limit (10,000 calls per connection)

## 21 Oct 2026: "No" hours are calm grey; "Next good session" headline; cards show 2 days
- **Why:** UX review (DESIGN.md)

## 21 Oct 2026: Tides only for beach sites (`beach` column)
- **Why:** Leo only needs tides in case of landing on a beach

## 21 Oct 2026: Sync "my sites" via a private code, stored by the Worker in Cloudflare KV
- **Why:** Sites were saved per browser only

## 21 Oct 2026: Editing `data/sites.csv` on GitHub auto-checks and rebuilds `sites.js` (GitHub Action)
- **Why:** Leo edits from the phone

## 21 Oct 2026: Official tides from the Admiralty API through the Worker (secret key)
- **Why:** The free tide model squashed heights

## 21 Oct 2026: Repository and site are public, including the Flybubble site list
- **Why:** Leo will check with Flybubble later

## 21 Oct 2026: Speeds fetched in the chosen unit (mph/km/h/knots/m/s)
- **Why:** Every number is already right

## 21 Oct 2026: Plain HTML/CSS/JS, no build step; GitHub Pages hosting
- **Why:** Easy to learn from; opens by double-clicking
