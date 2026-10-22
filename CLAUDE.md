# Instructions for Claude

Claude reads this file automatically at the start of every session in this
project. It says *how* we work; [SPEC.md](SPEC.md) says *what* we're building;
[DESIGN.md](DESIGN.md) says how it looks.

## About this project
- A web page showing when conditions are good for Leo's sports at each site.
  Paragliding first. See SPEC.md.
- Leo is learning to code with AI while building it. Teaching matters as much
  as the output.

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

## How to teach
- After each step, explain in plain language what was added and why. Point to
  the 2–3 most important lines of code.
- Suggest one small change Leo can try (e.g. change a colour, add a
  site) to build confidence.
- Explain new terms the first time they come up (e.g. "API", "JSON",
  "function").
- Keep explanations short; Leo will ask for more if needed.

## Conventions
- Wind speeds are in **mph**. Directions use the 16-point compass
  (N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW).
- Speed rules belong to the **sport**; direction rules belong to the **site**.
- Weather data comes from Open-Meteo (free, no API key). **It has a daily
  limit per internet connection (10,000 calls; each place counts as one), and
  Leo's devices share it.** When testing, avoid repeated full reloads with the
  map open (guide sites and wind flow cost ~100+ calls each); use made-up
  forecasts in the preview for design work.
- **Two kinds of site list:** "my sites" (per person, in the browser, synced
  via the Worker's `/sync`) and the shared site guide (`data/sites.csv`, rebuilt
  by the GitHub Action on every change).
- **Site data lives in `data/sites.csv`.** Never edit `sites.js` by hand: edit
  the CSV, then run `python3 tools/build_sites.py`, which validates it.
- **Previewing on Leo's Mac:** macOS blocks the preview server from the Documents
  folder, so copy the site files to the scratchpad `site/` folder before
  checking the browser preview. (In a cloud session, check the live site after
  pushing instead.)
- **Sports:** the current sport is Parakiting (see sports.js). Speed rules and
  settings belong to the sport; sites are tagged with their sport.
