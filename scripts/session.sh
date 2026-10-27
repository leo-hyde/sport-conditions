#!/usr/bin/env bash
# Keeps Leo's Claude sessions (phone/cloud and Mac, often several at once) in step
# through GitHub. Git itself is the safety net: worktrees and cloud branches keep
# sessions' files apart, and GitHub refuses a push that would overwrite newer work.
# This script makes sure each session starts up to date, sees other unfinished
# work, and doesn't end with work that only it can see.
#
#   scripts/session.sh start          a session opens: pull main, list other unfinished work, issues, handover
#   scripts/session.sh busy           Leo sends a message: count it, for the coaching tips (nothing else)
#   scripts/session.sh check          Claude finishes a reply: cloud blocks on work not on GitHub; the Mac
#                                     shows Leo a reminder; work on main must have its docs updated
#   scripts/session.sh end            the same checks, printed, before switching device
#   scripts/session.sh status         git state, and other unfinished work
#   scripts/session.sh visibility-ok  after a privacy review, record the repo's visibility as reviewed
#
# There used to be a lock on a `session-lock` branch (Oct 2026). It tracked devices,
# not sessions, so it couldn't handle several sessions at once; git does the real job.
# Claude Code runs start, busy and check automatically (see .claude/settings.json).
# `start` also runs scripts/playbook-sync.sh (shared rules from claude-playbook).
# This file comes from github.com/leo-hyde/claude-playbook (shared/session.sh): edit it there.

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

COACH_EVERY=15  # remind Claude about session length every this many messages (a judgement call)
RECENT_DAYS=14  # other branches with no commit for longer than this are treated as abandoned

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
    echo "CONFLICT: could not merge the latest main into $(branch). Stop and tell Leo."
  fi
}

# ---------- Public or private? ----------
# GitHub's public API answers "private": false for a public repo; a private one
# answers "private": true (when logged in, e.g. in cloud sessions) or Not Found.
# The last reviewed answer is kept in .claude/repo-visibility, so Claude can warn
# Leo when a repo turns public and check what's now visible.
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
    echo "!!! THIS REPO IS NOW PUBLIC (it was $was). Tell Leo straight away, then check the files AND"
    echo "!!! the git history for anything sensitive (see 'Public repos' in .claude/rules/playbook.md)."
    echo "!!! After the review, run: scripts/session.sh visibility-ok"
  elif [ "$now" != "$was" ]; then
    record_visibility "$now"
    echo "Note: this repo is now $now (it was $was)."
  fi
}

# Open GitHub Issues, so every session sees them without being asked. Uses the GitHub
# CLI where it exists (Leo's Mac); cloud sessions have none and use their GitHub tools.
list_issues() {
  local gh out
  gh=$(command -v gh || { [ -x /opt/homebrew/bin/gh ] && echo /opt/homebrew/bin/gh; })
  if [ -z "$gh" ]; then
    echo "ISSUES: no GitHub CLI here. List open issues with the GitHub tools and tell Leo."
    return
  fi
  if ! out=$("$gh" issue list --state open --limit 20 --json number,title,author,labels \
      -q '.[] | "  #\(.number) \(.title) (from \(.author.login)\(if (.labels|length)>0 then ", "+([.labels[].name]|join(", ")) else "" end))"' 2>/dev/null); then
    echo "ISSUES: couldn't read them (offline or not signed in). Try again before telling Leo."
  elif [ -n "$out" ]; then
    echo "ISSUES: open on GitHub. Tell Leo, and follow the rules for issues:"
    echo "$out"
  else
    echo "Issues: none open."
  fi
}

# ---------- Commands ----------

cmd_start() {
  echo "=== Session start ($DEVICE, branch $(branch)) ==="
  [ -n "$(unsaved)" ] && { echo "WARNING: uncommitted changes already in this checkout:"; unsaved; }
  pull_main
  local others
  others=$(other_work)
  if [ -n "$others" ]; then
    echo "OTHER WORK not on main yet (other sessions, maybe still running). Avoid editing the same files; tell Leo if it overlaps:"
    echo "$others"
  else
    echo "No other unfinished work on other branches."
  fi
  [ -f scripts/playbook-sync.sh ] && bash scripts/playbook-sync.sh
  check_visibility
  local d
  for d in $(siblings); do
    if [ -f "$d/scripts/session.sh" ]; then
      echo "Also attached: $(basename "$d"). Before changing it, run: bash $d/scripts/session.sh start"
    elif [ ! -f "$d/shared/ai-dev-rules.md" ]; then   # the playbook itself has no session script
      echo "NOT SET UP: $(basename "$d") doesn't follow the playbook yet. Tell Leo and offer to set it up."
    fi
  done
  list_issues
  echo
  echo "--- Handover from docs/STATUS.md ---"
  sed -n '/^## Handover/,/^## Where we are/p' docs/STATUS.md | sed '$d'
}

# Count Leo's messages in this session (Claude Code passes the session id on stdin)
# and every COACH_EVERY messages ask Claude to judge whether a fresh session would help.
coach() {
  local id file count path kb
  id=$(printf '%s' "$1" | sed -n 's/.*"session_id" *: *"\([^"]*\)".*/\1/p' | head -1)
  [ -n "$id" ] || return 0
  mkdir -p .session
  find .session -name 'messages-*' -mtime +7 -delete 2>/dev/null
  file=.session/messages-$id
  count=$(( $(cat "$file" 2>/dev/null || echo 0) + 1 ))
  echo "$count" >"$file"
  [ $((count % COACH_EVERY)) -eq 0 ] || return 0
  path=$(printf '%s' "$1" | sed -n 's/.*"transcript_path" *: *"\([^"]*\)".*/\1/p' | head -1)
  kb=$( [ -f "$path" ] && echo $(( $(wc -c <"$path") / 1024 )) || echo "?")
  echo "COACH: this session has had $count of Leo's messages (transcript ${kb} KB). Each message re-reads all of it."
  echo "COACH: judge whether the conversation still helps the current work. Suggest a fresh session (STATUS.md updated, starter prompt) only if the work changed or the context is cluttered, not for length alone (see 'Coaching' in .claude/rules/playbook.md)."
}

cmd_busy() {
  local input=""; [ -t 0 ] || input=$(cat)
  coach "$input"
}

# Fills $block (must be fixed before the reply ends) and $remind (Leo is told).
# Work not on GitHub blocks in the cloud, where it's lost when the session closes;
# on the Mac it's safe in its folder, so Leo gets a reminder instead.
find_problems() {
  block=""; remind=""
  git fetch -q origin 2>/dev/null
  local lost=""
  [ -n "$(unsaved)" ] && lost="$lost
- Uncommitted changes. Commit them."
  [ -n "$(unpushed)" ] && lost="$lost
- Commits on no branch on GitHub. Push this branch (git push origin HEAD), or, if the step is finished, merge into main and push (git push origin HEAD:main)."
  if [ "$DEVICE" = phone/cloud ]; then block="$lost"; else remind="$lost"; fi
  if on_main; then
    [ -n "$(unlogged)" ] && block="$block
- Work reached main since docs/STATUS.md was last updated. Update STATUS.md (Handover block, where we are) and push. If the plan, scope or a choice changed, SPEC.md and docs/decisions.md too ('Keeping the docs true' in .claude/rules/playbook.md)."
    [ -n "$(unplanned)" ] && block="$block
- specs/ changed on main since SPEC.md was last updated. Make SPEC.md match (steps and their status, a link to each spec), log any change of plan in docs/decisions.md, and push."
  fi
  local d
  for d in $(siblings); do
    [ -n "$(git -C "$d" status --porcelain 2>/dev/null)" ] && block="$block
- $(basename "$d") (also attached) has uncommitted changes. Commit them."
    [ -n "$(git -C "$d" log --oneline HEAD --not --remotes=origin 2>/dev/null)" ] && block="$block
- $(basename "$d") (also attached) has commits on no branch on GitHub. Push them: git -C $d push origin HEAD"
  done
  return 0
}

# A JSON string, for the reminder Claude Code shows Leo.
json_str() { printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null ||
             printf '"%s"' "$(printf '%s' "$1" | tr '\n"\\' " '/")"; }

cmd_check() {
  # Claude Code passes JSON on stdin; if it is already retrying after a block, don't loop.
  local input=""; [ -t 0 ] || input=$(cat)
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

cmd_end() {
  local block remind
  find_problems
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
  check)  cmd_check ;;
  end)    cmd_end ;;
  status) cmd_status ;;
  visibility-ok) v=$(visibility) && record_visibility "$v" && echo "Recorded: this repo is $v (reviewed)." ;;
  *) echo "Usage: $0 start | busy | check | end | status | visibility-ok"; exit 1 ;;
esac
