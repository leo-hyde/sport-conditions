# Live status

The shared memory between Leo's phone and computer sessions. **Every Claude session reads this first and updates it before finishing**, then commits and pushes. Newest information at the top of each section.

## Handover (overwrite this block every session)

| | |
|---|---|
| Last session | Phone/cloud, 23 Oct 2026 |
| Ended cleanly? | Yes, all pushed to `main` |
| Mid-flight work | None |
| Next step | Leo tries Surfing on the live site (sport menu → Surfing) and checks the Newquay spots; then automated tests of the rating rules (BACKLOG) |
| Check first | **Start a new session** for the next piece of work: this one got very long (see CLAUDE.md "Working efficiently") |
| Note | Read docs/ARCHITECTURE.md to understand how the app is built |

## Where we are

**Surfing** (version 1.3): the 12 Newquay spots, rated on waves, period, swell direction, wind and tide, linked to Surfline. Live at https://leo-hyde.github.io/sport-conditions/. Parakiting forecasts for Leo's sites (7 days, 5 models, rated good/OK/no), an Overview with a "next good session" headline, site cards, a map with rated guide sites, live airport wind (METARs), animated wind flow, and official UK tides for beach sites. **Feedback mode** (version 1.2): speak or type notes while using the app, sent to GitHub Issues. Not yet working: **sync between devices** (the Worker's KV storage isn't connected yet), and real forecasts haven't been re-tested since the usage-limit fixes.

## Decisions made

| Date | Decision | Why |
|---|---|---|
| 23 Oct | Surf ratings stay good / OK / no (not Surfline's Poor/Fair/Good scale); heights in ft with Surfline-style size words | Every sport works the same on the Overview and map; Surfline's ratings are its forecasters' own judgement |
| 23 Oct | Waves forecast from a point 2.5 km out to sea from each spot | A point on the beach can fall in a land grid cell, which has no waves |
| 23 Oct | Tide rules per site (not / only near low / high water, N hours), for every sport | Leo: Newquay spots don't work around low tide (except Watergate); must be easy to edit |
| 23 Oct | Phone map timeline: a swipeable strip under a fixed marker | The finger-step version lost track of the finger |
| 23 Oct | Explaining the work: architecture doc + walkthroughs, no "try this" suggestions | Leo wants to understand and check what's built, not tinker |
| 23 Oct | One feature per session; tools/preview.js for checks | Long sessions use far more AI credits |
| 22 Oct | Surfing: link to Surfline rather than copy its data; waves from Open-Meteo Marine | Surfline has no public API and its terms forbid copying; a public site can't rely on unofficial addresses |
| 22 Oct | Feedback Send goes straight to GitHub through the Worker when a send code is set | Leo wanted one tap, not several steps |
| 22 Oct | Feedback mode: notes spoken in the browser (speech recognition, falls back to typing), sent as a pre-filled GitHub Issue; just Leo for now | Leo tests on his phone; no keyboard covering the screen; no server or secrets needed |
| 22 Oct | No version numbers: "Beta", `CHANGELOG.md` by date, git tags for big milestones | Lots of small changes; git already keeps every version |
| 22 Oct | Lock held only while Claude is replying (claimed on each message, freed when the reply ends), on a `session-lock` branch | An open-but-idle session kept blocking the other device; lock commits cluttered main |
| 22 Oct | By hour: time strip ("8h 9h…"), speeds only on good/OK hours; page always opens on Overview → By day | Times and speeds looked the same; By day is the quickest answer |
| 22 Oct | Phone + computer handover kit (this file, `scripts/session.sh`, hooks) | Phone and Mac sessions can't see each other; the repo is the shared memory |
| 21 Oct | Forecasts kept 30 min on the device; stop asking after a "daily limit" refusal; guide sites only from zoom 9 (max 60), wind flow 8×8 from zoom 8 | Testing used up Open-Meteo's free daily limit (10,000 calls per connection) |
| 21 Oct | "No" hours are calm grey; "Next good session" headline; cards show 2 days | UX review (DESIGN.md) |
| 21 Oct | Tides only for beach sites (`beach` column) | Leo only needs tides in case of landing on a beach |
| 21 Oct | Sync "my sites" via a private code, stored by the Worker in Cloudflare KV | Sites were saved per browser only |
| 21 Oct | Editing `data/sites.csv` on GitHub auto-checks and rebuilds `sites.js` (GitHub Action) | Leo edits from the phone |
| 21 Oct | Official tides from the Admiralty API through the Worker (secret key) | The free tide model squashed heights |
| 21 Oct | Repository and site are public, including the Flybubble site list | Leo will check with Flybubble later |
| 21 Oct | Speeds fetched in the chosen unit (mph/km/h/knots/m/s) | Every number is already right |
| 21 Oct | Plain HTML/CSS/JS, no build step; GitHub Pages hosting | Easy to learn from; opens by double-clicking |

## Open questions

- **Surf spots:** locations, swell and offshore directions are Claude's approximations: check them. Little Fistral is often called a low-tide spot, and Lusty Glaze's beach covers at high tide, yet both have "not near low water".
- **Direct feedback sending:** skipped for now (Leo, 23 Oct). When wanted: add `GITHUB_TOKEN` and `FEEDBACK_CODE` secrets to the Worker and redeploy.
- **Phone landscape:** works but the header fills the short screen. Compact header in landscape? (In docs/BACKLOG.md.)

- **Sync storage:** Leo to create a KV namespace, bind it to the Worker as `SYNC`, and deploy the latest `worker/weather-proxy.js`.
- **Flybubble:** permission to publish their site list (it's public now).
- **Beach sites:** ticked for Fistral, Perranporth, Hale Towans and Chapel Porth. Right?
- **Unfinished message:** Leo wrote "on the overview…" and stopped. What was it about?
- **Praa Sands:** added on the live site in one browser; it reaches other devices once sync works.

## Session log

- **23 Oct, phone/cloud**: removed map tides; phone timeline now swipes under a marker; built Surfing (Newquay spots, tide rules, per-sport settings, Surfline links); added docs/ARCHITECTURE.md and tools/preview.js; new rules for explaining the work and working efficiently.

- **22 Oct, phone/cloud (4)**: worked through feedback #1–#3: one-tap Send + Your requests + Worker /feedback, robust voice notes, reopen on last tab, finer map timeline, map tides; wrote the surfing plan.

- **22 Oct, phone/cloud (3)**: built feedback mode (version 1.2), CHANGELOG.md, docs/BACKLOG.md and the "check feedback" routine.

- **22 Oct, phone/cloud (2)**: wrote the feedback-mode plan (version 1.2) into SPEC.md for Leo to approve.

- **22 Oct, phone/cloud**: lock now per reply on its own branch; clearer By hour view; page opens on By day; proposed a feedback + versioning plan.

- **22 Oct, desktop**: set up the phone + computer handover kit from the playbook (STATUS.md, session lock, hooks).
- **21 Oct, desktop**: built version 1 and 1.1 in one long session: forecasts, ratings, site editing, map, units, tides, live wind, sync (pending storage), UX review; created the `/new-app` playbook. Hit Open-Meteo's daily limit while testing.
