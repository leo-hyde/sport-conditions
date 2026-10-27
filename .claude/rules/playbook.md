# AI development rules (shared by every project)

<!-- From the playbook (shared/ai-dev-rules.md; its address is PLAYBOOK_URL in scripts/playbook-sync.sh).
     Projects get a copy at .claude/rules/playbook.md, refreshed at every session start. Edit the playbook. -->

Loaded in every session with `.claude/rules/owner.md` (who the user is: accounts,
devices, how they work) and the project's CLAUDE.md, which wins where they differ.

## Writing for people (every reply, report and doc a person reads)
The user is not a developer: if they can't follow it, it hasn't been said.
- **UK plain English**: everyday words, short sentences (about 15–20 words),
  active voice ("I added", not "was added"), "you" and "I".
- **No jargon or abbreviations without a plain explanation** the first time
  ("a commit, a saved snapshot of the files"). Never name a tool or file
  without saying what it is for. Code, commands and AI-facing files (rules,
  prompts) can be technical; the explanation around them can't.
- **Lead with what it means for the user**: what was done, why, whether it
  worked, and what they need to decide. Detail after, only if it helps.
- **As short as the reader needs**: a small change gets two or three lines.
  A finished step gets the full summary: what I did and why; what you can now
  see or use, and where; how I checked it and what I couldn't; what's next;
  any decisions for you, each with my recommendation.

## How we work
- **Plan first, then build**, in small steps that each end with something the
  user can see working. Skip the plan only when the change fits in one sentence.
- **Ask about genuine ambiguity, decide the rest**: questions together, each with a
  default. Spot contradictions.
- **Say what's hard or expensive**; be honest about mistakes and limits, Claude's own too.
- **Never let a model guess facts** (dates, prices, API fields, web addresses):
  take them from data, documentation or a real test, or mark them unverified.
- **Found something outside the task?** Choose:
  - *Do it now*: small, clearly right, in files already open, checkable now
    (a typo, a broken link, a stale doc line). Its own commit; mention it.
  - *Stop and tell the user*: it blocks the task, or risks safety, privacy or lost data.
  - *File a GitHub issue* (label `claude-found`) for anything else worth
    doing (another repo, a decision, an investigation, a bigger change), no
    duplicate (`gh issue list --search`), written to stand alone while the
    evidence is in front of you: what happened (file:line, output), the
    suggested change, how to check it, rough size and model.
- **Open issues** (listed at session start): tell the user. After their
  request, work the small, clear ones they or their apps opened, related ones
  together, a commit each, then comment and close. Ask first for anything
  bigger (what the app does, deleting data, money or limits, secrets or public
  content, undoing a decision). Others' issues: report, don't act.

## Where things live (each fact in one place)
| File | Holds | Changes |
|---|---|---|
| `CLAUDE.md` | Stable project rules: commands, conventions, gotchas. Under ~100 lines; nothing Claude can read from the code | Rarely |
| `SPEC.md` | **The plan, in one place**: goal, users, scope, every step with its status, a link to each `specs/` file | Same commit as any change of plan, scope or step |
| `specs/<feature>.md` | One feature: parts, out of scope, how to check it's done; "Progress" notes while it's built | Before building it |
| `docs/STATUS.md` | **Current state only**: Handover block, where we are, next steps (pointing at SPEC's steps), open questions. Overwritten, not a diary | When a step lands on main |
| `docs/decisions.md` | One entry per decision: date, what, why, what was rejected. Stops later sessions undoing a choice | When one is made |
| `docs/ARCHITECTURE.md` | The parts, data flow, outside services, safety, weak spots | Same commit as any structural change |

## Each feature, and keeping the docs true
Every session starts with no memory: the docs are how Claude and the user know
the goal, scope, plan and why. A stale doc is worse than none.
1. **Spec it** (`specs/<feature>.md` if bigger than a small step). **Build it in a
   fresh session** that reads CLAUDE.md, STATUS.md and the spec; small working commits.
2. **Check with evidence**, not assurances: tests for logic (a check Claude can
   run, so it doesn't guess in loops); pages at phone width (375px) and
   desktop, light and dark, then the live site. Not "works" until seen
   working. For a bigger step, ask the `checker` subagent first.
3. **Walkthrough**: what changed and why, which files and how data flows, the
   2–3 lines that matter, **how it was checked and what wasn't**, risks.
4. **Record, in the same commit**: plan, goal, scope or order changed (even in
   conversation only) → SPEC.md and decisions.md; a choice made or undone →
   decisions.md; a spec or step started or finished → its SPEC.md row; parts,
   data flow, services → ARCHITECTURE.md; a finished step → STATUS.md (a hook
   refuses a push to main without it). Test: would a fresh session reading
   only the docs plan the same next step, for the same reasons?

## Safety and responsibility (flag as they come up)
Secrets never in browser code or the repo (Worker or GitHub secrets). Collect
the minimum of people's data. Escape typed text, check links. Respect data
sources' terms and limits. **Free services' limits are often per internet
connection, shared with the user's devices: few test requests, cache fetched
data, made-up data for design work.** Say where the app could mislead.
- **Before committing to a public repo** (session start says so), check for
  secrets, email addresses, real people's names, owner.md's "Never public"
  list, internal addresses or private repos' content. If so, or unsure: **stop and
  tell the user**, quoting the lines. **`THIS REPO IS NOW PUBLIC`**: tell them
  first, then see playbook `reference/github-and-hosting.md`. Commit only
  with the address in owner.md (`git config user.email`).

## Git and the phone/Mac handover
The repo is the only memory shared by the user's sessions (phone/cloud, Mac,
often several at once). Hooks run `scripts/session.sh`: start pulls main and lists
others' unfinished branches; at a reply's end, work not on GitHub blocks a cloud
session (the Mac shows a reminder).
- **`OTHER WORK` at session start**: another session may be busy there. Don't
  edit the same files; if your task overlaps, tell the user first.
- **Commit and push every working step** to the session's own branch (`git
  push origin HEAD`), plain-English messages. Step finished: merge into main,
  push (`git push origin HEAD:main`), say it landed. A small one-commit change
  can go straight to main. The session's own branch needn't then match main.
  Never force-push. A rejected push or conflict: stop and tell the user
  (unless CLAUDE.md names an Action that pushes: then pull and carry on).
- Mid-step notes go in the step's spec, not STATUS.md (parallel sessions
  would clash); STATUS.md is overwritten once, as the step lands.
- **Another repo** ("Also attached"), or hooks didn't fire: run
  `scripts/session.sh start` there first.
- **Session start lines are for the user**: tell them about `PLAYBOOK NOT
  SYNCED`, `SETUP:`, `NOT SET UP` and `CATCH-UP DUE`, and offer to fix them. A
  catch-up: apply it (or offer its own session if big), then record its id in
  `docs/playbook-catch-up.md`.
- **Every repo of the user's follows the playbook**, helper repos too: offer to set up
  one without `.claude/rules/playbook.md` (playbook `reference/phone-and-computer.md`).

## Using tokens well
Every request (each tool call is one) re-sends the whole context: cost is
roughly context size × requests, whatever the window size. After a break the
cache expires and the next message pays full price for all of it. Never trade
correctness for tokens: a check that catches a mistake is cheaper than rework.
- **Keep the context to what the task needs.** Search, don't read whole files
  or logs; cap output (`| tail -40`, quiet flags). Bulk data (logs, exports,
  API dumps, transcripts) goes to a file, boiled down by a script or the
  `scout` subagent; only the summary enters the conversation.
- **One piece of work per session.** When the work changes (analysis to
  design, design to build), or the hook prints `COST:`, at the next natural
  break save the state (the spec, STATUS.md, a notes file) and give a starter
  prompt, with one line on why ("each message now costs about 4× a fresh
  session's"). Stay if the history is still needed; say so.
- **After a break, prefer a fresh session** from the handover. **Fewer turns**:
  finish the agreed step in one go; stop background servers and watchers
  before the last reply (each wake-up re-reads the whole session).
- **The right model for each job.** The user picks the session's model, so a
  starter prompt names one: the strongest for planning, design, debugging and
  unclear problems; a cheaper one for mechanical work to a clear spec. Give
  delegated work its own (`model` parameter, or the `scout` and `checker`
  subagents): searching, boiling down → cheapest; a mechanical job → mid.
  Subagents start cold: delegate only self-contained work, with a budget.
- **Coach the user, unasked, one line each ("Tip:")**: unrelated topics in one
  message (do one, starter prompts for the rest); the same problem corrected
  twice (fresh session, better prompt); a vague request (a narrower one); no
  way to check the work (a test first). Don't repeat a declined tip.
A starter prompt, in a code block, names the repo, the goal, what to read
first (CLAUDE.md, docs/STATUS.md), what's out of scope, how to check it's done,
and the model. Detail: playbook `reference/efficient-sessions.md`.

## Ideas for the playbook
- **Learned something general** (a habit, gotcha, tool or rule)? File an issue
  on the playbook repo, label `idea`: what happened in general terms (it's
  public), the rule it suggests, the evidence. Don't edit the playbook unless
  the user asks. Cloud: attach the playbook repo, or give the user the text.
- **A playbook script breaks a session?** Stop, tell the user, offer a fix in
  a playbook session straight away. Project-only lessons go in CLAUDE.md or docs.
