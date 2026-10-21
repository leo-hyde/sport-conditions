# Instructions for Claude

Claude reads this file automatically at the start of every session in this
project. It says *how* we work; [SPEC.md](SPEC.md) says *what* we're building.

## About this project
- A web page showing when conditions are good for Leo's sports at each site.
  Paragliding first. See SPEC.md.
- Leo is learning to code with AI while building it. Teaching matters as much
  as the output.

## How to work
- **Build from SPEC.md.** If something isn't in the spec, or the spec is
  unclear, ask before building it. If the spec needs to change, propose the
  edit to SPEC.md first.
- **One build step at a time.** Finish a step, show it working, explain it,
  then stop and wait for Leo before starting the next.
- **Small, readable code over clever code.** Plain HTML/CSS/JS, no frameworks
  or build tools unless the spec says so.
- **Commit to git after each working step**, with a plain-English message.

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
