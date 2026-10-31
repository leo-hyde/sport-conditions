#!/usr/bin/env bash
# Keeps the user's Claude sessions (phone/cloud and Mac, often several at once) in step
# through GitHub. Git itself is the safety net: worktrees and cloud branches keep
# sessions' files apart, and GitHub refuses a push that would overwrite newer work.
# This script makes sure each session starts up to date, sees other unfinished
# work, and doesn't end with work that only it can see.
#
#   scripts/session.sh start          a session opens: pull main, list other unfinished work, issues,
#                                     people's edits and notes to Claude in the docs, handover
#   scripts/session.sh busy           the user sends a message: note when the context has grown costly
#   scripts/session.sh check          Claude finishes a reply: cloud blocks on work not on GitHub; the Mac
#                                     shows the user a reminder
#   scripts/session.sh push-check     Claude runs a command: a push to main must bring its docs with it
#   scripts/session.sh end            the checks, printed, before switching device
#   scripts/session.sh status         git state, and other unfinished work
#   scripts/session.sh visibility-ok  after a privacy review, record the repo's visibility as reviewed
#
# There used to be a lock on a `session-lock` branch (Oct 2026). It tracked devices,
# not sessions, so it couldn't handle several sessions at once; git does the real job.
# Claude Code runs start, busy, check and push-check automatically (see .claude/settings.json).
# `start` also runs scripts/playbook-sync.sh (shared rules from the playbook).
# This file comes from the playbook (shared/session.sh): edit it there.

set -u

# Claude Code passes JSON on stdin. Run by hand there may be none, or stdin may stay
# open with nothing coming, so wait at most 2 seconds.
INPUT=""; [ -t 0 ] || IFS= read -r -d '' -t 2 INPUT || true

# push-check runs before every command Claude runs: leave at once unless it's a push.
[ "${1:-}" = push-check ] && case "$INPUT" in *push*) ;; *) exit 0 ;; esac

# Which folder is the session working in? Hooks run the main checkout's copy of this
# script ($CLAUDE_PROJECT_DIR stays put), but a session in a worktree (its own copy of
# the files) works elsewhere. The hook's JSON says where, in "cwd". If that's a
# worktree of this same repo, check it, with its own copy of this script.
session_dir() {
  local cwd top
  cwd=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("cwd",""))' 2>/dev/null)
  [ -n "$cwd" ] && [ -d "$cwd" ] || return 1
  top=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null) || return 1
  # Same repo? (A worktree shares the main checkout's .git folder.)
  [ "$(cd "$top" && cd "$(git rev-parse --git-common-dir)" && pwd -P)" = \
    "$(cd "$(git rev-parse --git-common-dir)" && pwd -P)" ] || return 1
  echo "$top"
}
here=$(git rev-parse --show-toplevel) || exit 0
if [ -z "${SESSION_SH_IN_WORKTREE:-}" ] && there=$(session_dir) && [ "$(cd "$there" && pwd -P)" != "$(cd "$here" && pwd -P)" ]; then
  export SESSION_SH_IN_WORKTREE=1 SESSION_SH_LAUNCHER="$here"
  cd "$there" || exit 0
  script=scripts/session.sh; [ -f "$script" ] || script="$here/scripts/session.sh"
  printf '%s' "$INPUT" | bash "$script" "$@"
  exit $?   # its exit code, so a block (2) still blocks
fi
cd "$here" || exit 0

# The cost notes' thresholds. Each matches a row of the assumptions table in the
# playbook's reference/efficient-sessions.md: change them together.
COST_NOTE=3       # note once when each message re-reads this many times a fresh session's context
COST_FIRM=6       # and once more past this
CACHE_MINUTES=55  # a gap longer than this since the last reply: the prompt cache has likely expired
RECENT_DAYS=14    # other branches with no commit for longer than this are treated as abandoned

# Which device is this? Cloud sessions (phone, web) set CLAUDE_CODE_REMOTE.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "$(uname -s)" != "Darwin" ]; then
  DEVICE=phone/cloud
else
  DEVICE=desktop
fi

branch() { git rev-parse --abbrev-ref HEAD; }

# ---------- Git state ----------

unsaved() { git status --porcelain; }
# Commits on no branch on GitHub: only this checkout has them.
unpushed() { git log --oneline HEAD --not --remotes=origin 2>/dev/null; }
# Is this checkout's work on main? Docs are checked only then: mid-step work on a
# session's own branch keeps its notes in its spec, and STATUS.md changes at step end.
on_main() { git merge-base --is-ancestor HEAD origin/main 2>/dev/null; }

# Commits since STATUS.md was last changed. Playbook syncs don't count, nor do
# commits by GitHub Action bots (a daily data run isn't a step to record).
unlogged() {
  local last
  last=$(git log -1 --format=%H -- docs/STATUS.md)
  [ -z "$last" ] && return
  git log --format='%h %ae' --invert-grep --grep='^Playbook: ' "$last"..HEAD -- . ":(exclude)docs/STATUS.md" |
    awk '$2 !~ /\[bot\]@/ { print $1 }'
}

# Commits that changed specs/ since SPEC.md was last changed: a feature plan
# moved on but the overall plan didn't. Same exclusions as unlogged.
unplanned() {
  [ -f SPEC.md ] || return
  local last
  last=$(git log -1 --format=%H -- SPEC.md)
  [ -z "$last" ] && return
  git log --format='%h %ae' --invert-grep --grep='^Playbook: ' "$last"..HEAD -- specs |
    awk '$2 !~ /\[bot\]@/ { print $1 }'
}

# Other sessions' unfinished work: branches (on GitHub, or local ones, which Mac
# worktrees share) with commits not on main, touched in the last RECENT_DAYS days.
# One line each: "name: N commits not on main, last <when>".
other_work() {
  local me ref name n when seen=" "
  me=$(branch)
  git for-each-ref --sort=-committerdate --format='%(refname) %(committerdate:unix)' refs/heads refs/remotes/origin |
  while read -r ref t; do
    name=${ref#refs/heads/}; name=${name#refs/remotes/origin/}
    case "$name" in main|HEAD|session-lock|"$me") continue ;; esac
    case "$seen" in *" $name "*) continue ;; esac
    seen="$seen$name "
    [ $(( $(date +%s) - t )) -lt $(( RECENT_DAYS * 86400 )) ] || continue
    n=$(git rev-list --count origin/main.."$ref" 2>/dev/null) || continue
    [ "$n" -gt 0 ] || continue
    when=$(git log -1 --format=%cr "$ref")
    echo "  $name: $n commit(s) not on main, last $when"
  done
}

# Other repos attached to the same cloud session sit next to this one. Hooks only
# run in the repo the session opened in, so start and check look after the others.
siblings() {
  [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || return 0
  local here d
  here=$(pwd -P)
  for d in ../*/; do
    d=$(cd "$d" 2>/dev/null && pwd -P) || continue
    [ "$d" != "$here" ] && [ -d "$d/.git" ] && echo "$d"
  done
}

# Bring in the latest main, whatever branch we're on.
pull_main() {
  git fetch -q --prune origin || { echo "WARNING: could not reach GitHub. Work may be out of date."; return; }
  if ! git merge -q --no-edit origin/main 2>/dev/null; then
    git merge --abort 2>/dev/null
    echo "CONFLICT: could not merge the latest main into $(branch). Stop and tell the user."
  fi
}

# ---------- Public or private? ----------
# GitHub's public API answers "private": false for a public repo; a private one
# answers "private": true (when logged in, e.g. in cloud sessions) or Not Found.
# The last reviewed answer is kept in .claude/repo-visibility, so Claude can warn
# the user when a repo turns public and check what's now visible.
VIS_FILE=.claude/repo-visibility

repo_name() { git remote get-url origin 2>/dev/null | sed -E 's#\.git$##; s#.*[/:]([^/]+/[^/]+)$#\1#'; }

visibility() {
  local body
  body=$(curl -sS --max-time 8 "https://api.github.com/repos/$(repo_name)" 2>/dev/null) || return 1
  case "$body" in
    *'"private": false'*) echo public ;;
    *'"private": true'*|*'Not Found'*) echo private ;;
    *) return 1 ;;
  esac
}

record_visibility() {  # value
  mkdir -p .claude && echo "$1" >"$VIS_FILE"
  git add -f "$VIS_FILE"
  git diff --cached --quiet -- "$VIS_FILE" || git commit -q -m "Playbook: record that this repo is $1" -- "$VIS_FILE"
  return 0
}

check_visibility() {
  local now was
  now=$(visibility) || return 0   # GitHub unreachable: say nothing
  was=$(cat "$VIS_FILE" 2>/dev/null)
  if [ -z "$was" ]; then
    record_visibility "$now"
    [ "$now" = public ] && echo "Note: this repo is PUBLIC. Anything committed here can be read by anyone."
  elif [ "$now" = public ] && [ "$was" != public ]; then
    echo "!!! THIS REPO IS NOW PUBLIC (it was $was). Tell the user straight away, then check the files AND"
    echo "!!! the git history for anything sensitive (see 'Public repos' in .claude/rules/playbook.md)."
    echo "!!! After the review, run: scripts/session.sh visibility-ok"
  elif [ "$now" != "$was" ]; then
    record_visibility "$now"
    echo "Note: this repo is now $now (it was $was)."
  fi
}

# Open GitHub Issues, so every session sees them without being asked. Uses the GitHub
# CLI where it exists (the Mac); cloud sessions have none and use their GitHub tools.
list_issues() {
  local gh out
  gh=$(command -v gh || { [ -x /opt/homebrew/bin/gh ] && echo /opt/homebrew/bin/gh; })
  if [ -z "$gh" ]; then
    echo "ISSUES: no GitHub CLI here. List open issues with the GitHub tools and tell the user."
    return
  fi
  if ! out=$("$gh" issue list --state open --limit 20 --json number,title,author,labels \
      -q '.[] | "  #\(.number) \(.title) (from \(.author.login)\(if (.labels|length)>0 then ", "+([.labels[].name]|join(", ")) else "" end))"' 2>/dev/null); then
    echo "ISSUES: couldn't read them (offline or not signed in). Try again before telling the user."
  elif [ -n "$out" ]; then
    echo "ISSUES: open on GitHub. Tell the user, and follow the rules for issues:"
    echo "$out"
  else
    echo "Issues: none open."
  fi
}

# Edits a person made to the documents (for example on github.com) that Claude hasn't
# worked in yet, and "> To Claude" notes left in them. Claude's commits end with a
# "Co-Authored-By: Claude" line, so a commit without one, in the last 30 days, is a
# person's (the sync's "Playbook: " commits aren't). Claude's next commit to a file
# marks it worked in. Prints nothing when there's nothing to do.
doc_edits() {
  local ref=origin/main f c pending notes n=0
  git rev-parse -q --verify "$ref" >/dev/null || ref=HEAD
  for f in $(git log "$ref" --no-merges --since=30.days -n 60 --name-only --format= -- '*.md' \
             ':(exclude).claude/' | sort -u); do
    git cat-file -e "$ref:$f" 2>/dev/null || continue
    pending=""
    for c in $(git log "$ref" --no-merges --since=30.days --format=%H -- "$f"); do
      git log -1 --format=%B "$c" | grep -qi '^Co-Authored-By: Claude' && break
      git log -1 --format=%s "$c" | grep -q '^Playbook: ' && continue
      pending="$pending $c"
    done
    [ -z "$pending" ] && continue
    n=$((n + 1)); [ $n -gt 5 ] && { echo "  (and more)"; break; }
    [ $n = 1 ] && echo "HUMAN EDITS not yet worked in (tell the user; see each with the git diff shown):"
    set -- $pending   # newest first
    c=$(eval echo "\${$#}")
    echo "  $f: $# commit(s), last by $(git log -1 --format=%an "$1"). git diff $(git rev-parse --short "$c")~1 $ref -- $f"
  done
  notes=$(git grep -n '^> To Claude' "$ref" -- '*.md' 2>/dev/null | sed "s|^$ref:||" | head -5)
  [ -n "$notes" ] && { echo "NOTES TO CLAUDE in the documents (tell the user, then act on them):"; echo "$notes" | sed 's/^/  /'; }
  return 0
}

# ---------- Commands ----------

cmd_start() {
  echo "=== Session start ($DEVICE, branch $(branch)${SESSION_SH_IN_WORKTREE:+, in the session worktree}) ==="
  [ -n "$(unsaved)" ] && { echo "WARNING: uncommitted changes already in this checkout:"; unsaved; }
  pull_main
  local others
  others=$(other_work)
  if [ -n "$others" ]; then
    echo "OTHER WORK not on main yet (other sessions, maybe still running). Avoid editing the same files; tell the user if it overlaps:"
    echo "$others"
  else
    echo "No other unfinished work on other branches."
  fi
  [ -f scripts/playbook-sync.sh ] && bash scripts/playbook-sync.sh
  update_launcher
  check_visibility
  local d
  for d in $(siblings); do
    if [ -f "$d/scripts/session.sh" ]; then
      echo "Also attached: $(basename "$d"). Before changing it, run: bash $d/scripts/session.sh start"
    elif [ ! -f "$d/shared/ai-dev-rules.md" ]; then   # the playbook itself has no session script
      echo "NOT SET UP: $(basename "$d") doesn't follow the playbook yet. Tell the user and offer to set it up."
    fi
  done
  list_issues
  doc_edits
  echo
  echo "--- Handover from docs/STATUS.md ---"
  sed -n '/^## Handover/,/^## Where we are/p' docs/STATUS.md | sed '$d'
}

# Hooks run the main checkout's copy of this script, so keep that checkout up to date
# when this session works in a worktree: fast-forward only, and only if it's on main
# with nothing unsaved (otherwise someone is working there; leave it alone).
update_launcher() {
  local l=${SESSION_SH_LAUNCHER:-}
  [ -n "$l" ] || return 0
  [ "$(git -C "$l" rev-parse --abbrev-ref HEAD 2>/dev/null)" = main ] && [ -z "$(git -C "$l" status --porcelain 2>/dev/null)" ] || return 0
  git -C "$l" merge -q --ff-only origin/main 2>/dev/null ||
    echo "Note: the main checkout ($l) couldn't be brought up to date; hooks may run an old copy of this script."
}

# How costly is each message now? Measured, not counted: the context of the latest
# main-conversation request (input + cache read + cache write tokens) against the
# session's first, which is about a fresh session's size. Subagent requests don't count.
# Claude Code passes the transcript's path on stdin. Without python3: silent.
COST_PY='
import calendar, json, sys, time
hook = json.loads(sys.argv[1] or "{}")
first = last = when = None
with open(hook.get("transcript_path") or "") as f:
    for line in f:
        if "\"assistant\"" not in line:
            continue
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if e.get("type") != "assistant" or e.get("isSidechain"):
            continue
        u = (e.get("message") or {}).get("usage") or {}
        n = sum(u.get(k) or 0 for k in ("input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"))
        if n:
            first = first or n
            last, when = n, e.get("timestamp") or ""
if not first:
    sys.exit(1)
try:
    age = int(time.time() - calendar.timegm(time.strptime(when[:19], "%Y-%m-%dT%H:%M:%S")))
except ValueError:
    age = -1
print(hook.get("session_id") or "-", last // 1000, 10 * last // first, age)
'
cost() {
  local stats id k r10 age level file
  stats=$(python3 -c "$COST_PY" "$INPUT" 2>/dev/null) || return 0
  read -r id k r10 age <<EOF
$stats
EOF
  if [ "$age" -gt $((CACHE_MINUTES * 60)) ] && [ "$r10" -gt 20 ]; then
    echo "COST: the cache has likely expired; this message re-processes about ${k}k tokens at full price."
  fi
  level=0
  [ "$r10" -gt $((COST_NOTE * 10)) ] && level=1
  [ "$r10" -gt $((COST_FIRM * 10)) ] && level=2
  [ "$level" -gt 0 ] || return 0
  # Each level is said once per session.
  mkdir -p .session
  find .session \( -name 'cost-*' -o -name 'messages-*' \) -mtime +7 -delete 2>/dev/null
  file=.session/cost-$id
  [ "$level" -gt "$(cat "$file" 2>/dev/null || echo 0)" ] || return 0
  echo "$level" >"$file"
  echo "COST: each message now re-reads about ${k}k tokens, about $(( (r10 + 5) / 10 ))× a fresh session's."
}

cmd_busy() {
  cost
}

# Fills $block (must be fixed before the reply ends) and $remind (the user is told).
# Only lost work counts: work not on GitHub blocks in the cloud, where it's lost when
# the session closes; on the Mac it's safe in its folder, so the user gets a reminder.
# Docs are checked when work lands on main instead (push-check), mid-turn.
find_problems() {
  block=""; remind=""
  git fetch -q origin 2>/dev/null
  local lost=""
  [ -n "$(unsaved)" ] && lost="$lost
- Uncommitted changes. Commit them."
  [ -n "$(unpushed)" ] && lost="$lost
- Commits on no branch on GitHub. Push this branch (git push origin HEAD), or, if the step is finished, merge into main and push (git push origin HEAD:main)."
  if [ "$DEVICE" = phone/cloud ]; then block="$lost"; else remind="$lost"; fi
  local d
  for d in $(siblings); do
    [ -n "$(git -C "$d" status --porcelain 2>/dev/null)" ] && block="$block
- $(basename "$d") (also attached) has uncommitted changes. Commit them."
    [ -n "$(git -C "$d" log --oneline HEAD --not --remotes=origin 2>/dev/null)" ] && block="$block
- $(basename "$d") (also attached) has commits on no branch on GitHub. Push them: git -C $d push origin HEAD"
  done
  return 0
}

# A JSON string, for the reminder Claude Code shows the user.
json_str() { printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null ||
             printf '"%s"' "$(printf '%s' "$1" | tr '\n"\\' " '/")"; }

cmd_check() {
  # Claude Code passes JSON on stdin; if it is already retrying after a block, don't loop.
  local input=$INPUT
  case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac
  local block remind
  find_problems
  if [ -n "$block" ]; then
    echo "Not finished: other sessions and devices would not see this work.$block" >&2
    exit 2   # tells Claude Code to keep going and fix these
  fi
  if [ -n "$remind" ]; then
    echo "{\"systemMessage\": $(json_str "Not on GitHub yet (safe on this Mac):$remind")}"
  fi
  exit 0
}

# The command Claude is about to run (PreToolUse on Bash): which of its git pushes go
# to main? Prints "<folder><TAB><what's pushed>" for each; "?HEAD" means the current
# branch, if that's main. Handles `git -C <dir> -c <x> push [options] [remote] [refspecs]`.
PUSH_PY='
import json, shlex, sys
cmd = ((json.loads(sys.argv[1] or "{}").get("tool_input") or {}).get("command")) or ""
cmd = cmd.replace("\n", " ; ")   # each line is a command of its own
lex = shlex.shlex(cmd, posix=True, punctuation_chars=";&|()")
lex.whitespace_split = True
try:
    tokens = list(lex)
except ValueError:
    sys.exit(0)
segments, seg = [], []
for t in tokens + [";"]:
    if t and set(t) <= set(";&|()\n"):
        segments.append(seg)
        seg = []
    else:
        seg.append(t)
for s in segments:
    while s and "=" in s[0] and not s[0].startswith("-"):
        s = s[1:]   # FOO=bar git push ...
    if not s or s[0] != "git":
        continue
    i, where = 1, "."
    while i < len(s) and s[i].startswith("-"):
        if s[i] in ("-C", "-c") and i + 1 < len(s):
            if s[i] == "-C":
                where = s[i + 1]
            i += 1
        i += 1
    if i >= len(s) or s[i] != "push":
        continue
    args, j = [], i + 1
    while j < len(s):
        a = s[j]
        if a in ("-o", "--push-option", "--repo", "--receive-pack", "--exec"):
            j += 1
        elif a in ("--all", "--branches", "--mirror"):
            args.append("main")
        elif not a.startswith("-"):
            args.append(a)
        j += 1
    refspecs = args[1:]
    if not refspecs:
        print(where + "\t?HEAD")
    for r in refspecs:
        r = r.lstrip("+")
        src, colon, dst = r.partition(":")
        if not colon and src == "HEAD":
            print(where + "\t?HEAD")
            continue
        if not colon:
            dst = src
        if src and dst.replace("refs/heads/", "", 1) == "main":
            print(where + "\t" + src)
'

# What a push of <src> to main would bring without its docs. Same exclusions as unlogged.
docs_missing() {  # src
  local commits files
  commits=$(git log --format='%h %ae' --invert-grep --grep='^Playbook: ' origin/main.."$1" 2>/dev/null |
    awk '$2 !~ /\[bot\]@/ { print $1 }')
  [ -n "$commits" ] || return 0
  files=$(git log --format= --name-only origin/main.."$1")
  if [ -n "$(git log -1 --format=%H "$1" -- docs/STATUS.md)" ] && ! printf '%s\n' "$files" | grep -qx docs/STATUS.md; then
    echo "- docs/STATUS.md: update the Handover block and 'Where we are'. If the plan, scope or a choice changed, SPEC.md and docs/decisions.md too ('Keeping the docs true' in .claude/rules/playbook.md)."
  fi
  if git cat-file -e "$1:SPEC.md" 2>/dev/null && printf '%s\n' "$files" | grep -q '^specs/' &&
     ! printf '%s\n' "$files" | grep -qx SPEC.md; then
    echo "- SPEC.md: specs/ changed, so make SPEC.md match (steps and their status, a link to each spec)."
  fi
}

cmd_push_check() {
  local pushes where src missing=""
  pushes=$(python3 -c "$PUSH_PY" "$INPUT" 2>/dev/null) || exit 0
  [ -n "$pushes" ] || exit 0
  git fetch -q origin main 2>/dev/null
  while IFS="$(printf '\t')" read -r where src; do
    [ -n "$src" ] || continue
    if [ "$src" = "?HEAD" ]; then
      [ "$(git -C "$where" rev-parse --abbrev-ref HEAD 2>/dev/null)" = main ] || continue
      src=HEAD
    fi
    missing="$missing$( cd "$where" 2>/dev/null && docs_missing "$src" )"
  done <<EOF
$pushes
EOF
  [ -n "$missing" ] || exit 0
  echo "Push to main stopped by the playbook: this work lands on main without its docs. Commit these, then push again:
$missing" >&2
  exit 2   # tells Claude Code not to run the command, and why
}

cmd_end() {
  local block remind
  find_problems
  if on_main; then
    [ -n "$(unlogged)" ] && remind="$remind
- Work reached main since docs/STATUS.md was last updated."
    [ -n "$(unplanned)" ] && remind="$remind
- specs/ changed on main since SPEC.md was last updated."
  fi
  if [ -n "$block$remind" ]; then
    echo "Not ready to switch device:$block$remind"
    exit 1
  fi
  echo "All saved on GitHub. Safe to switch device."
}

cmd_status() {
  git fetch -q origin 2>/dev/null
  echo "Device: $DEVICE   Branch: $(branch)   On main: $(on_main && echo yes || echo no)"
  echo "Unsaved:";  unsaved
  echo "Not on GitHub:"; unpushed
  echo "Not in STATUS.md:"; unlogged
  echo "Spec changed, SPEC.md not:"; unplanned
  echo "Other unfinished work:"; other_work
}

case "${1:-status}" in
  start)  cmd_start ;;
  busy)   cmd_busy ;;   # an old "busy --force" from the lock days is harmless
  push-check) cmd_push_check ;;
  check)  cmd_check ;;
  end)    cmd_end ;;
  status) cmd_status ;;
  visibility-ok) v=$(visibility) && record_visibility "$v" && echo "Recorded: this repo is $v (reviewed)." ;;
  *) echo "Usage: $0 start | busy | check | push-check | end | status | visibility-ok"; exit 1 ;;
esac
