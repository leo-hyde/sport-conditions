# Live status

The current state, shared between Leo's phone and computer sessions. **Every Claude session reads this first, and updates it after every finished step.** Then it commits (saves a snapshot) and pushes (uploads) the change. This file holds the current state only: overwrite it, don't add to the end. The history is in `git log` (the record of every saved change); decisions are in `docs/decisions.md`.

## Handover (overwrite this block every session)

| | |
|---|---|
| Last session | Mac, 26 Oct 2026 |
| Ended cleanly? | Yes, all pushed to `main` |
| Work in progress | None |
| Next step | SPEC.md "What's next", step 1: Leo tries Surfing on the live site |
| Check first | 5 open feedback issues (#4–#8) wait for "check feedback" |
| Note | Read docs/ARCHITECTURE.md to understand how the app is built |

## Where we are

- **Surfing** (version 1.3): the 12 Newquay spots, rated on waves, period, swell direction, wind and tide, with links to Surfline. Live at https://leo-hyde.github.io/sport-conditions/.
- **Parakiting:** forecasts for Leo's sites (7 days, 5 forecast models, rated good, OK or no). There's an Overview with a "next good session" headline, site cards, and a map with rated guide sites. The map also has live airport wind (from airport weather reports, called METARs), animated wind flow, and official UK tides for beach sites.
- **Feedback mode** (version 1.2): speak or type notes while using the app, and send them to GitHub Issues (to-do notes on the project).
- **Not working yet:** **sync between devices**, because the Worker's storage (Cloudflare KV) isn't connected yet. Also, nobody has tested real forecasts again since the fixes for the daily usage limit.

## Next steps

See SPEC.md "What's next": step 1 (Leo checks Surfing), then step 2
(automated rating tests, spec first).

## Open questions

- **Surf spots:** the locations, and the swell and offshore directions, are Claude's rough guesses: please check them. Little Fistral is often called a low-tide spot, and Lusty Glaze's beach is covered at high tide. Yet both have the rule "not near low water".
- **Sending feedback directly:** skipped for now (Leo, 23 Oct). When you want it: add the `GITHUB_TOKEN` and `FEEDBACK_CODE` secrets to the Worker and put it live again.
- **Phone on its side (landscape):** it works, but the header fills the short screen. A smaller header in landscape? (In docs/BACKLOG.md.)

- **Sync storage:** Leo to create a KV namespace (a storage space in Cloudflare), connect it to the Worker as `SYNC`, and put the latest `worker/weather-proxy.js` live.
- **Flybubble:** permission to publish their site list (it's public now).
- **Beach sites:** ticked for Fistral, Perranporth, Hale Towans and Chapel Porth. Is that right?
- **Unfinished message:** Leo wrote "on the overview…" and stopped. What was it about?
- **Praa Sands:** added on the live site in one browser. It will reach other devices once sync works.
