# Live status

The current state, shared between Leo's phone and computer sessions. **Every Claude session reads this first and updates it after every finished step**, then commits and pushes. Current state only: overwrite, don't append. History is in `git log`; decisions are in `docs/decisions.md`.

## Handover (overwrite this block every session)

| | |
|---|---|
| Last session | Phone/cloud, 23 Oct 2026 |
| Ended cleanly? | Yes, all pushed to `main` |
| Mid-flight work | None |
| Next step | Leo tries Surfing on the live site (sport menu → Surfing) and checks the Newquay spots; then automated tests of the rating rules (BACKLOG) |
| Check first | New this session: shared rules from the playbook in `.claude/rules/playbook.md` (synced at each session start); decisions moved to `docs/decisions.md` |
| Note | Read docs/ARCHITECTURE.md to understand how the app is built |

## Where we are

**Surfing** (version 1.3): the 12 Newquay spots, rated on waves, period, swell direction, wind and tide, linked to Surfline. Live at https://leo-hyde.github.io/sport-conditions/. Parakiting forecasts for Leo's sites (7 days, 5 models, rated good/OK/no), an Overview with a "next good session" headline, site cards, a map with rated guide sites, live airport wind (METARs), animated wind flow, and official UK tides for beach sites. **Feedback mode** (version 1.2): speak or type notes while using the app, sent to GitHub Issues. Not yet working: **sync between devices** (the Worker's KV storage isn't connected yet), and real forecasts haven't been re-tested since the usage-limit fixes.

## Next steps

1. Leo tries Surfing on the live site and checks the Newquay spots.
2. Automated tests of the rating rules (docs/BACKLOG.md): write a short spec in `specs/rating-tests.md` first, then build it in a fresh session.

## Open questions

- **Surf spots:** locations, swell and offshore directions are Claude's approximations: check them. Little Fistral is often called a low-tide spot, and Lusty Glaze's beach covers at high tide, yet both have "not near low water".
- **Direct feedback sending:** skipped for now (Leo, 23 Oct). When wanted: add `GITHUB_TOKEN` and `FEEDBACK_CODE` secrets to the Worker and redeploy.
- **Phone landscape:** works but the header fills the short screen. Compact header in landscape? (In docs/BACKLOG.md.)

- **Sync storage:** Leo to create a KV namespace, bind it to the Worker as `SYNC`, and deploy the latest `worker/weather-proxy.js`.
- **Flybubble:** permission to publish their site list (it's public now).
- **Beach sites:** ticked for Fistral, Perranporth, Hale Towans and Chapel Porth. Right?
- **Unfinished message:** Leo wrote "on the overview…" and stopped. What was it about?
- **Praa Sands:** added on the live site in one browser; it reaches other devices once sync works.
