# Instructions for Claude

Claude reads this file automatically at the start of every session in this
project. It says *how* we work; [SPEC.md](SPEC.md) says *what* we're building;
[DESIGN.md](DESIGN.md) says how it looks; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
says how it's built.

## About this project
- A web page showing when conditions are good for Leo's sports at each site:
  parakiting and surfing so far. See SPEC.md.
- Leo is learning to build apps with AI, aiming to be a proficient and
  responsible AI developer. Understanding what's built, and that it's safe
  and reliable, matters as much as the output.

## Every session: start and finish with STATUS.md
Leo switches between a phone (cloud sessions) and a Mac. Neither can see
the other's conversation; the repo is the only shared memory.
`scripts/session.sh` enforces this, run automatically by hooks in `.claude/settings.json`.
- **The lock means "Claude is working on a reply right now".** It's claimed when
  Leo sends a message and released when Claude's reply finishes cleanly, so an
  idle or closed session holds no lock. It lives on its own `session-lock`
  branch, not on main.
- If a message comes with `ANOTHER DEVICE IS WORKING`, **tell Leo straight
  away**; read-only work is fine, but change nothing until Leo confirms that
  reply has finished. Then run `scripts/session.sh busy --force`.
- If a push is rejected or a merge conflicts, stop and tell Leo. Never force-push.
  (Exception: a push rejected because the project's own GitHub Action pushed
  results is expected; pull/merge and carry on, and say so. This project's
  "Build site guide" Action pushes `sites.js` when `data/sites.csv` changes.)
- One branch: `main`. Push with `git push origin HEAD:main`. (On Leo's Mac this
  repo's git uses the GitHub CLI login: `git config credential.helper` is set
  for this project only.)
- After every finished step: overwrite the Handover block in `docs/STATUS.md`,
  update "Where we are", decisions and open questions, add a session log line,
  commit, push.
- The lock frees itself at the end of each reply. `scripts/session.sh end`
  releases it by hand if a reply was cut off.
- If the hooks didn't run (no "Session start" output), run `scripts/session.sh start` yourself.

## How to work
- **Build from SPEC.md.** If something isn't in the spec, or the spec is
  unclear, ask before building it. If the spec needs to change, propose the
  edit to SPEC.md first.
- **One build step at a time**, unless Leo asks for several agreed steps in one
  go. Then build them all, commit after each stage, and stop for review at
  the end.
- **Follow DESIGN.md** for anything visual. New components get added to it.
- **Keep it opening by double-click:** plain `<script>` tags (no ES modules),
  and libraries loaded from a CDN.
- **Small, readable code over clever code.** Plain HTML/CSS/JS, no frameworks
  or build tools unless the spec says so.
- **Commit to git after each working step**, with a plain-English message.
- **Push to GitHub after every commit**, so the work is never stuck on one
  computer and Leo can carry on from a phone. Pushing to `main` publishes the
  live site (https://leo-hyde.github.io/sport-conditions/), so only commit
  working, tested steps.
- **Pull before starting work** (`git pull`), in case something changed from
  another device or a cloud session.

## Feedback from Leo's phone ("check feedback")
Leo records notes in the app's feedback mode and sends them as GitHub Issues
titled "Feedback: …" (label `feedback`). When Leo says "check feedback":
1. Read the open feedback issues (GitHub tools, or `gh issue list` on the Mac).
   Each note says where in the app Leo was.
2. Sort every note into **easy** (clear, small), **needs discussion**
   (unclear, big, or not in SPEC.md) or **later**, and tell Leo in a short list.
3. Update `docs/BACKLOG.md` with every note and its state.
4. Build the easy ones Leo agrees to, one step at a time as usual. Add each
   change to `CHANGELOG.md` (by date, plain English).
5. When everything in an issue is done or moved to the backlog, comment on
   the issue saying what changed, and close it.

## How to explain the work
Leo learns by understanding and checking what's built, the way a developer
reviews a colleague's work, **not** by tinkering. Don't suggest "try this"
changes.
- **Keep docs/ARCHITECTURE.md current** in the same commit as any change to
  the app's structure, data flow, outside services or weak spots.
- **After each feature, a short walkthrough:** what changed and why; which
  files and how data flows through them; the 2–3 lines that matter most;
  **how it was checked** (and what wasn't, plainly); risks, limits and
  anything taken on trust (e.g. data from Claude's general knowledge).
- **Record decisions with their reasons** (STATUS.md decisions table).
- **Flag safety and responsibility** as they come up: secrets, privacy,
  people's typed text and links, data sources' terms, usage limits, and
  where the app could mislead (forecasts can be wrong).
- Explain new terms the first time they come up. Keep it short; Leo will
  ask for more.

## Working efficiently (AI usage)
Every message re-reads the whole conversation, so long sessions cost more.
- **One feature or batch of feedback per session**; start a new session for
  the next (STATUS.md carries the memory). Suggest it when a session gets long.
- **Don't read big files whole:** `sites.js` and `data/sites.csv` (~960
  sites) are huge; search them instead. Read only the parts of code needed.
- **Check with `node tools/preview.js`** (made-up data, screenshots) instead
  of writing new test scripts; check numbers with `--eval` before looking at
  screenshots, and look at as few screenshots as needed.
- Keep replies short and to the point.

## Conventions
- Wind speeds are in **mph**. Directions use the 16-point compass
  (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW).
- Speed rules belong to the **sport**; direction rules belong to the **site**.
- Weather (and wave) data comes from Open-Meteo (free, no API key). **It has a daily
  limit per internet connection (10,000 calls; each place counts as one), and
  Leo's devices share it.** When testing, avoid repeated full reloads with the
  map open (guide sites and wind flow cost ~100+ calls each); use made-up
  forecasts in the preview for design work.
- **Two kinds of site list:** "my sites" (per person, in the browser, synced
  via the Worker's `/sync`) and the shared site guide (`data/sites.csv`, rebuilt
  by the GitHub Action on every change).
- **Site data lives in `data/sites.csv` and `data/surf-spots.csv`.** Never edit
  `sites.js` or `surfSpots.js` by hand: edit the CSV, then run
  `python3 tools/build_sites.py`, which validates both.
- **Previewing on Leo's Mac:** macOS blocks the preview server from the Documents
  folder, so copy the site files to the scratchpad `site/` folder before
  checking the browser preview. (In a cloud session, check the live site after
  pushing instead.)
- **Sports:** Parakiting and Surfing (sports.js). Each sport has its own
  settings (storage.js); sites are tagged with their sport, and each view
  shows only the chosen sport's sites (`sportSites()`).
- **Surfing:** waves from Open-Meteo Marine, wave heights in **feet**.
  Surfline is linked, never copied (no public API; its terms forbid it).
  Surf spots live in `data/surf-spots.csv` (built into `surfSpots.js`).
