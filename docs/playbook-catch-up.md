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
- **2026-10-25-spec-is-the-plan** (26 Oct 2026): SPEC.md now has a "What's
  next" step table (Leo checks Surfing; automated rating tests), an
  "updated" date, the Best times and parakiting changes, and status notes on
  the "Later" ideas already built. Three late entries in docs/decisions.md.
  STATUS.md's next steps point at SPEC.md's step numbers. No spec files
  exist in `specs/` yet.
