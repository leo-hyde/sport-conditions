# Playbook catch-ups applied here

The playbook (Leo's shared rules) sometimes changes how files a project
already has should look. Each such change has an id in the playbook's
`shared/catch-up.md`. Once it's applied here, it gets a line below: id, date,
what changed. Session start stops asking about an id once it's listed here.

- **2026-10-24-plain-english** (25 Oct 2026): rewrote SPEC.md, DESIGN.md,
  docs/ARCHITECTURE.md, docs/STATUS.md, docs/decisions.md, docs/BACKLOG.md,
  CHANGELOG.md and the longer help text in index.html in UK plain English:
  shorter sentences, and technical terms explained the first time. Wording
  only: every fact, figure, date, link and decision kept. CLAUDE.md and the
  code left technical. Checked with `node tools/preview.js` (both sports,
  phone and desktop, light and dark: no page errors) and
  `python3 tools/build_sites.py`.
