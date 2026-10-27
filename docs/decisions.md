# Decisions

One entry for each decision, newest first. This stops later sessions undoing
a choice without knowing why. If we reverse one, we add a new entry and mark
the old one "Replaced by <date>". (I moved these here from docs/STATUS.md on
23 Oct 2026. The earlier entries give the reason, but not the other options
we turned down.)

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
