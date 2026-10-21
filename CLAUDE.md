# Instructions for Claude

Claude reads this file automatically at the start of every session in this
project. It says *how* we work; [SPEC.md](SPEC.md) says *what* we're building;
[DESIGN.md](DESIGN.md) says how it looks.

## About this project
- A web page showing when conditions are good for Leo's sports at each site.
  Paragliding first. See SPEC.md.
- Leo is learning to code with AI while building it. Teaching matters as much
  as the output.

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
- **Pushing to `main` publishes the live site** (GitHub Pages:
  https://leo-hyde.github.io/sport-conditions/). Push once a stage is tested.
  Pull before starting work, in case Leo changed things from another device.

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
- Weather data comes from Open-Meteo (free, no API key).
- **Site data lives in `data/sites.csv`.** Never edit `sites.js` by hand: edit
  the CSV, then run `python3 tools/build_sites.py`, which validates it.
- **Previewing:** macOS blocks the preview server from the Documents folder, so
  copy the site files to the scratchpad `site/` folder before checking the
  browser preview.
