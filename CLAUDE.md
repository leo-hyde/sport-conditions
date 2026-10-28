# Instructions for Claude

Claude reads this file automatically at the start of every session in this
project. It says *how* we work; [SPEC.md](SPEC.md) says *what* we're building;
[DESIGN.md](DESIGN.md) says how it looks; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
says how it's built.

Leo's general rules (how we work, explaining and checking the work, the
phone/Mac handover, cost notes on sessions and credits) are in
`.claude/rules/playbook.md`, synced from github.com/leo-hyde/claude-playbook at
each session start: don't repeat them here, and don't edit that copy. This
file holds only what's specific to this project. Where we are:
[docs/STATUS.md](docs/STATUS.md). Why things are the way they are:
[docs/decisions.md](docs/decisions.md).

## About this project
- A web page showing when conditions are good for Leo's sports at each site:
  parakiting and surfing so far. See SPEC.md.
- **Pushing to `main` publishes the live site**
  (https://leo-hyde.github.io/sport-conditions/), so only push working,
  tested steps. In a cloud session, check the live site after pushing.
- The "Build site guide" GitHub Action pushes `sites.js` when
  `data/sites.csv` changes, so a push rejected after editing the CSV is
  expected: pull, merge and carry on, and say so.
- On Leo's Mac this repo's git uses the GitHub CLI login
  (`git config credential.helper` is set for this project only).

## How to work
- **Build from SPEC.md.** If something isn't in the spec, or the spec is
  unclear, ask before building it. If the spec needs to change, propose the
  edit to SPEC.md first. Bigger features also get `specs/<feature>.md`.
- **Follow DESIGN.md** for anything visual, above all its "Rules every screen
  must pass". New components get added to it. **Before pushing any visual
  change, run `node tools/ux-check.js` and get PASS** (fix the problems, or
  add a reasoned exception to DESIGN.md and the tool). Say so in the reply.
- **Keep it opening by double-click:** plain `<script>` tags (no ES modules),
  and libraries loaded from a CDN. No frameworks or build tools unless the
  spec says so.
- **Keep docs/ARCHITECTURE.md current** in the same commit as any change to
  the app's structure, data flow, outside services or weak spots.
- **Check with `node tools/preview.js`** (made-up data, screenshots) instead
  of writing new test scripts; check numbers with `--eval` before looking at
  screenshots, and look at as few screenshots as needed.
- **Don't read big files whole:** `sites.js` and `data/sites.csv` (~960
  sites) are huge; search them instead.
- User-facing changes go in `CHANGELOG.md` (by date, plain English).

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
