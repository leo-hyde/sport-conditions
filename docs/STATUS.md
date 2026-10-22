# Live status

The shared memory between Leo's phone and computer sessions. **Every Claude session reads this first and updates it before finishing**, then commits and pushes. Newest information at the top of each section.

## Handover (overwrite this block every session)

| | |
|---|---|
| Last session | Phone/cloud, 22 Oct 2026, late morning |
| Ended cleanly? | Yes, all pushed to `main` |
| Mid-flight work | Version 1.2 (feedback mode) written into SPEC.md as a proposal; nothing built yet |
| Next step | Leo OKs (or changes) the 1.2 plan in SPEC.md and says which phone browser he uses; then build steps 1–5 |
| Check first | SPEC.md "Version 1.2" section |
| Note | Speech-to-text in the browser must be tested on Leo's actual phone; it can't be tested from a cloud session |

## Where we are

Live at https://leo-hyde.github.io/sport-conditions/. Parakiting forecasts for Leo's sites (7 days, 5 models, rated good/OK/no), an Overview with a "next good session" headline, site cards, a map with rated guide sites, live airport wind (METARs), animated wind flow, and official UK tides for beach sites. Not yet working: **sync between devices** (the Worker's KV storage isn't connected yet), and real forecasts haven't been re-tested since the usage-limit fixes.

## Decisions made

| Date | Decision | Why |
|---|---|---|
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

- **Feedback mode (version 1.2 in SPEC.md):** Leo chose to start with just himself, speaking notes on his phone while using the app. Waiting for OK on the plan, and which browser he uses (Safari or Chrome).
- **Phone landscape:** works but the header fills the short screen. Compact header in landscape?

- **Sync storage:** Leo to create a KV namespace, bind it to the Worker as `SYNC`, and deploy the latest `worker/weather-proxy.js`.
- **Flybubble:** permission to publish their site list (it's public now).
- **Beach sites:** ticked for Fistral, Perranporth, Hale Towans and Chapel Porth. Right?
- **Unfinished message:** Leo wrote "on the overview…" and stopped. What was it about?
- **Praa Sands:** added on the live site in one browser; it reaches other devices once sync works.

## Session log

- **22 Oct, phone/cloud (2)**: wrote the feedback-mode plan (version 1.2) into SPEC.md for Leo to approve.

- **22 Oct, phone/cloud**: lock now per reply on its own branch; clearer By hour view; page opens on By day; proposed a feedback + versioning plan.

- **22 Oct, desktop**: set up the phone + computer handover kit from the playbook (STATUS.md, session lock, hooks).
- **21 Oct, desktop**: built version 1 and 1.1 in one long session: forecasts, ratings, site editing, map, units, tides, live wind, sync (pending storage), UX review; created the `/new-app` playbook. Hit Open-Meteo's daily limit while testing.
