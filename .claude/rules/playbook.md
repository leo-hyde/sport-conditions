# Leo's AI development rules (shared by every project)

<!-- This file comes from github.com/leo-hyde/claude-playbook (shared/ai-dev-rules.md).
     Projects get a copy at .claude/rules/playbook.md, refreshed at every session start
     by scripts/playbook-sync.sh. Never edit a project's copy: edit the playbook. -->

Claude Code loads this file in every session, alongside the project's own
CLAUDE.md. The project's CLAUDE.md holds what's specific to that project and
wins where the two differ.

## About Leo
- Learning to build apps with AI, aiming to be a proficient and responsible AI
  developer. Understanding what's built, and that it's safe and reliable,
  matters as much as the result.
- Learns by understanding and checking the work, the way a developer reviews a
  colleague's, **not** by tinkering: don't suggest "try this" changes.
- Plain language, UK English, short answers. Introduce new terms the first time
  ("API", "commit"…). Direct critique, explicit confidence levels, and a clear
  line between what's verified and what's assumed.

## How we work
- **Plan first, then build**, in small steps that each end with something Leo
  can see working. Skip the plan only when the change fits in one sentence.
- **Ask about genuine ambiguity, decide the rest.** Spot contradictions.
- **Say what's hard or expensive**, and be honest about mistakes and limits,
  including Claude's own.
- **Never let a model guess facts** (dates, prices, API fields, web
  addresses): take them from data, documentation or a real test, or mark them
  as unverified.

## Where things live (each fact in one place)
| File | Holds | Changes |
|---|---|---|
| `CLAUDE.md` | Stable project rules: commands, conventions, gotchas. Under ~100 lines; nothing Claude can read from the code | Rarely |
| `.claude/rules/playbook.md` | This file (synced, don't edit) | From the playbook |
| `docs/STATUS.md` | **Current state only**: Handover block, where we are, next steps, open questions. Overwritten, not a diary: git log is the history | Every step |
| `docs/decisions.md` | One entry per decision: date, what, why, what was rejected. Stops later sessions undoing a choice | When one is made |
| `docs/ARCHITECTURE.md` | The parts, data flow, outside services, safety, weak spots | Same commit as any structural change |
| `SPEC.md` / `specs/<feature>.md` | What to build, what's out of scope, how to check it's done | Before building |
| `docs/CONTEXT.md` | Background and the "why" (if the project has one) | Rarely |

## Each feature
1. **Spec it** (`specs/<feature>.md` for anything bigger than a small step):
   files and parts involved, out of scope, how we'll check it.
2. **Build it in a fresh session** that reads CLAUDE.md, STATUS.md and the spec.
   Small commits, each one working.
3. **Check with evidence**, not assurances: tests for logic (give Claude a
   check it can run, so it doesn't guess in loops); for pages, phone width
   (375px) and desktop, light and dark, then the live site. Don't say it works
   until it's been seen working.
4. **Walkthrough**: what changed and why, which files and how data flows, the
   2–3 lines that matter, **how it was checked and what wasn't**, risks.
5. **Record**: ARCHITECTURE.md (if structure changed), decisions.md (if a
   choice was made), STATUS.md. Commit, push. Next feature, new session.

## Safety and responsibility (flag as they come up)
Secrets never in browser code or the repo (Worker or GitHub secrets). Collect
the minimum of people's data; a public repo is public. Escape typed text, check
links. Respect data sources' terms, limits and credits. **Free services have
usage limits, often per internet connection shared with Leo's devices: few test
requests, cache fetched data, made-up data for design work.** Say where the
app could mislead.

## Git and the phone/Mac handover
- The repo is the only memory shared by Leo's phone (cloud) and Mac sessions.
  `scripts/session.sh` (run by hooks) pulls main, holds a lock while Claude is
  replying, and blocks finishing a reply with unsaved, unpushed or unrecorded work.
- If a message comes with `ANOTHER DEVICE IS WORKING`, **tell Leo straight
  away**: read-only work is fine, change nothing until he confirms. Then run
  `scripts/session.sh busy --force`.
- One branch: `main`. Push with `git push origin HEAD:main`; if the session
  started on a `claude/...` branch, say the work landed on main. Never
  force-push. If a push is rejected or a merge conflicts, stop and tell Leo
  (unless the project's CLAUDE.md names an Action that pushes: then pull and carry on).
- **Commit and push after every working step**, plain-English messages. After
  every finished step, overwrite the STATUS.md Handover block and "Where we are".
- If there's no "Session start" output, run `scripts/session.sh start` yourself.

## Coaching: help Leo get good results for fewer credits
Every message re-reads the whole conversation, so long sessions cost more per
message and get less accurate as the context fills. **Be proactive**: Leo wants
these nudges without asking. Keep each to one or two lines, starting "Tip:",
and don't repeat one he's declined this session.
- **New topic in an old session?** Say so, and offer a ready-to-paste starter
  prompt for a fresh session. Do the work here if Leo prefers.
- **Several unrelated topics in one message?** Do the one that matters most
  (or the one this session is about) and give a starter prompt for each of
  the others, to run in parallel sessions.
- **Session getting long** (the hook prints `COACH:`, or roughly 20+
  messages, or big files and logs read): at the next natural break, update
  STATUS.md and give a starter prompt for the next session.
- **Same problem corrected twice?** Stop. Say a fresh session with a better
  prompt usually beats a third try, and write that prompt.
- **Vague or broad request?** Suggest a narrower one ("fix the dates in
  `fetch.py`" costs far less than "look into the fetching").
- **No way to check the work?** Suggest a test or check script first.
- **Spot a better habit** (a spec before a big feature, `/compact` with
  instructions before a long task, a second-opinion review with
  `/code-review`)? Mention it once.

A starter prompt names the repo, the goal, the files or docs to read first
(always CLAUDE.md and docs/STATUS.md), what's out of scope, and how to check
it's done. Put it in a code block so Leo can copy it on his phone.

## Keeping the playbook current (both ways)
- **Learned something that applies to AI development generally**, not just
  this project (a habit, a gotcha, a tool, a better rule)? Add it to the
  playbook, not only here, and tell Leo. Rules every session needs go in
  `shared/ai-dev-rules.md` (keep it short); longer know-how in `reference/`.
  On the Mac the playbook is `~/.claude/skills/new-app`; in a cloud session,
  attach `leo-hyde/claude-playbook` (the `add_repo` tool) and clone it next to
  this project. Commit and push it to main like any project.
- **The playbook is public.** Before committing to it, check the change for
  anything that shouldn't be public: secrets or keys, email addresses, names
  of real people, Leo's CV, job search or employers, health, money, private
  repo contents, internal web addresses. If there's anything like that, or
  you're unsure, **stop and tell Leo**: quote the exact lines and ask before
  pushing. Write lessons in general terms ("a private repo's site published
  its docs folder"), not with the project's private details.
- Project-only lessons go in this project's CLAUDE.md or docs.
- Every project picks up playbook changes at its next session start.
