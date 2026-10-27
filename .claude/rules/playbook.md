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
- Direct critique, explicit confidence levels, and a clear line between
  what's verified and what's assumed.

## Writing for people (every reply, report and doc a person reads)
Leo is not a developer: if he can't follow it, it hasn't been said.
- **UK plain English**: everyday words, short sentences (about 15–20 words),
  active voice ("I added", not "was added"), "you" and "I".
- **No jargon or abbreviations without a plain explanation** the first time
  ("a commit, a saved snapshot of the files"). Never name a tool or file
  without saying what it is for.
- **Lead with what it means for Leo**: what was done, why, whether it worked,
  and what he needs to decide. Detail after, only if it helps.
- **End-of-task summaries**: what I did and why; what you can now see or use,
  and where; how I checked it and what I couldn't; what's next; any decisions
  for you, each with my recommendation.
- Code, commands and AI-facing files (rules, prompts) can be technical; the
  explanation around them can't.

## How we work
- **Plan first, then build**, in small steps that each end with something Leo
  can see working. Skip the plan only when the change fits in one sentence.
- **Ask about genuine ambiguity, decide the rest.** Spot contradictions.
- **Say what's hard or expensive**, and be honest about mistakes and limits,
  including Claude's own.
- **Never let a model guess facts** (dates, prices, API fields, web
  addresses): take them from data, documentation or a real test, or mark them
  as unverified.
- **Open GitHub Issues** (to-do notes on the repo): session start lists
  them (`ISSUES:` line; with no GitHub CLI, list them with the GitHub tools):
  tell Leo. After his
  request, fix the small, clear ones he or his apps opened: a commit each, then
  comment on the issue what changed and close it. Anything bigger waits for
  his yes, with your recommendation: a change to what the app does or shows,
  deleting data, money or usage limits, secrets or public content, undoing a
  decision, or more than a small step. Issues from anyone else: tell Leo, don't
  act. A project's CLAUDE.md may set its own flow (e.g. "check feedback").

## Where things live (each fact in one place)
| File | Holds | Changes |
|---|---|---|
| `CLAUDE.md` | Stable project rules: commands, conventions, gotchas. Under ~100 lines; nothing Claude can read from the code | Rarely |
| `.claude/rules/playbook.md` | This file (synced, don't edit) | From the playbook |
| `SPEC.md` | **The plan, in one place**: goal, users, scope, every step with its status, a link to each `specs/` file | Same commit as any change of plan, scope or step |
| `specs/<feature>.md` | One feature's detail: parts, out of scope, how to check it's done | Before building it |
| `docs/STATUS.md` | **Current state only**: Handover block, where we are, next steps (pointing at SPEC's steps, not copying them), open questions. Overwritten, not a diary: git log is the history | Every step |
| `docs/decisions.md` | One entry per decision: date, what, why, what was rejected. Stops later sessions undoing a choice | When one is made |
| `docs/ARCHITECTURE.md` | The parts, data flow, outside services, safety, weak spots | Same commit as any structural change |
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
5. **Record** (see "Keeping the docs true"). Commit, push. Next feature,
   new session.

## Keeping the docs true
Every session starts with no memory. The docs are how Claude and Leo both
know the goal, scope, plan and why; code shows how it works, never why,
what's out of scope or what's next. A stale doc is worse than none: the next
session plans from it. So, **in the same commit as the change**:
- Goal, users, scope, plan or order of steps changed (**including a plan
  agreed only in conversation**) → SPEC.md, and an entry in decisions.md.
- A choice made between options, or one undone → decisions.md.
- A spec written, or a step started or finished → its row in SPEC.md.
- Parts, data flow or outside services changed → ARCHITECTURE.md.
- Every finished step → STATUS.md.
Before calling a step done, ask: "would a fresh session reading only the
docs plan the same next step, for the same reasons?" If not, fix the docs
first. Once work reaches main, the end-of-reply check blocks if `specs/` changed but SPEC.md didn't.

## Safety and responsibility (flag as they come up)
Secrets never in browser code or the repo (Worker or GitHub secrets). Collect
the minimum of people's data; a public repo is public. Escape typed text, check
links. Respect data sources' terms, limits and credits. **Free services have
usage limits, often per internet connection shared with Leo's devices: few test
requests, cache fetched data, made-up data for design work.** Say where the
app could mislead.

## Public repos
Leo's projects mix public and private repos, and a session may work across
several. **Before committing to a public repo** (session start says so, or
`.claude/repo-visibility` reads `public`; if unsure, check on GitHub), check
the change for anything that shouldn't be public: secrets or keys, email
addresses, names of real people, Leo's CV, job search or employers, health,
money, internal web addresses, or content copied from a private repo. If
there's anything like that, or you're unsure, **stop and tell Leo**: quote the
exact lines and ask before pushing.
- **If session start prints `THIS REPO IS NOW PUBLIC`**, tell Leo before
  anything else. Review the files **and the git history** (deleted files stay
  in it: `git log -p --all | grep -iE '<pattern>'`), list findings with file
  and line, and propose fixes. Run `scripts/session.sh visibility-ok` only once
  Leo has seen the list. Rewriting history is a force-push: never without his
  explicit go-ahead.
- Leo's email goes in commits only as his GitHub "noreply" address,
  `22234407+leo-hyde@users.noreply.github.com` (`git config user.email` per repo).

## Git and the phone/Mac handover
- The repo is the only memory shared by Leo's sessions: phone (cloud) and
  Mac, often several at once. `scripts/session.sh` (run by hooks) pulls main
  at session start and lists other sessions' unfinished branches. When a
  reply ends, a cloud session must have its work on GitHub; a Mac session
  shows Leo a reminder; work that reached main must have its docs updated.
- **`OTHER WORK` at session start**: another session may be busy there. Don't
  edit the same files; if your task overlaps, tell Leo before changing anything.
- **Branches**: commit and push working steps to the session's own branch
  (`git push origin HEAD`). When a step is finished, merge it into `main` and
  push (`git push origin HEAD:main`), and say the work landed on main. A small
  one-commit change can go straight to main. Never force-push. If a push is
  rejected or a merge conflicts, stop and tell Leo (unless the project's
  CLAUDE.md names an Action that pushes: then pull and carry on).
- **Commit and push after every working step**, plain-English messages.
  Progress notes during a step go in its spec (`specs/<step>.md`, a
  "Progress" section), not STATUS.md, so parallel sessions don't clash. When
  a step is finished, overwrite the STATUS.md Handover block and "Where we
  are" once, as it lands on main.
- Session start runs only in the repo the session opened in. Before changing
  any other repo (attached later, or listed as "Also attached"), run
  `scripts/session.sh start` in it; do the same if hooks didn't fire.
- **Session start messages are for Leo**: tell him about `PLAYBOOK NOT SYNCED`,
  `SETUP:`, `NOT SET UP` and `CATCH-UP DUE` lines, and offer to fix them.
- **Every repo of Leo's follows the playbook**, small helper repos too (data
  stores, saved sources, tools). One without `.claude/rules/playbook.md` isn't
  set up: tell Leo and offer to set it up (playbook
  `reference/phone-and-computer.md`). Set up a new repo when it's made.

## Coaching: help Leo get good results for fewer credits
Every message re-reads the whole conversation. The test is not its size
(context windows and models keep growing) but **whether everything in it
still helps the work at hand**. Material that no longer helps costs credits
on every message and can mislead. **Be proactive**: Leo wants these nudges unasked. One or two
lines each, starting "Tip:"; don't repeat one he's declined this session.
- **New piece of work** (a new step, feature or topic)? Say so, and offer a
  ready-to-paste starter prompt for a fresh session. Do it here if Leo prefers.
  If the docs aren't enough for a fresh session to start it, fix them first.
- **Several unrelated topics in one message?** Do the one that matters most
  (or this session's topic); give a starter prompt for each of the others.
- **Context cluttered** (long logs or big files read, replaced plans, dead
  ends), or the hook prints `COACH:`? Judge whether it still helps; if not, at
  the next natural break update STATUS.md and give a starter prompt. A long
  but focused session is fine: don't suggest a break for length alone, and
  say which reason applies.
- **Context nearly full?** Save the state to STATUS.md before the app
  compacts it (summarises older messages): summaries lose detail.
- **Same problem corrected twice?** Stop. Say a fresh session with a better
  prompt usually beats a third try, and write that prompt.
- **Vague or broad request?** Suggest a narrower one ("fix the dates in
  `fetch.py`" costs far less than "look into the fetching").
- **No way to check the work?** Suggest a test or check script first.
- **Spot a better habit** (a spec before a big feature, `/compact` before a
  long task, a second-opinion `/code-review`)? Mention it once.

A starter prompt names the repo, the goal, the files or docs to read first
(always CLAUDE.md and docs/STATUS.md), what's out of scope, and how to check
it's done. Put it in a code block so Leo can copy it on his phone.

## Keeping the playbook current (both ways)
- **Learned something general** (a habit, gotcha, tool or better rule, not
  just for this project)? Add it to the playbook and tell Leo: every-session
  rules in `shared/ai-dev-rules.md` (short), longer know-how in `reference/`.
  It's `~/.claude/skills/new-app` on the Mac; in a cloud session attach
  `leo-hyde/claude-playbook` (`add_repo`), clone it next to this project, push to main.
- **The playbook is public**: follow "Public repos" above before every commit
  to it. Write lessons in general terms ("a private repo's site published its
  docs folder"), not with a project's private details.
- Project-only lessons go in this project's CLAUDE.md or docs. Every project
  picks up playbook changes at its next session start.
- **Every change must reach existing projects**, not only new ones. A
  set-up addition (a hook, a `.gitignore` line, a required file) goes in
  `shared/setup.txt`, which every session checks. Anything else that changes
  existing files (a rule about how files look, a template change, removing
  or renaming set-up) gets an entry in `shared/catch-up.md`. Apply it here too.
- **If session start prints `CATCH-UP DUE`**, tell Leo, apply it (or offer a
  separate session if it's big), then record it in `docs/playbook-catch-up.md`.
