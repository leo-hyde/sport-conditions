#!/usr/bin/env bash
# Keeps phone and desktop Claude sessions in sync through GitHub.
#
# The lock means "Claude is working on a reply right now", not "a session is open".
# It is claimed when Leo sends a message and released as soon as Claude finishes
# its reply, so a session left open (or closed without saying goodbye) holds no lock.
#
#   scripts/session.sh start          a session opens: pull main, show the lock and the handover
#   scripts/session.sh busy [--force] Leo sends a message: pull main, claim the lock
#   scripts/session.sh check          Claude finishes a reply: refuse if work is unsaved, else release
#   scripts/session.sh end            release the lock by hand (same as a clean check)
#   scripts/session.sh status         show the lock and git state
#   scripts/session.sh visibility-ok  after a privacy review, record the repo's visibility as reviewed
#
# The lock is a file called `lock` on its own branch, `session-lock`, so it doesn't
# clutter main's history or republish the site. Because GitHub only accepts a push
# that builds on the latest version of a branch, two devices can't both claim it.
# Claude Code runs start, busy and check automatically (see .claude/settings.json).
#
# `start` also runs scripts/playbook-sync.sh (shared rules from claude-playbook), and
# `busy` counts Leo's messages so Claude can suggest a fresh session when one gets long.
# This file comes from github.com/leo-hyde/claude-playbook (shared/session.sh): edit it there.

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

LOCK_BRANCH=session-lock
STALE_HOURS=2  # a busy lock older than this was left behind by a crash
COACH_EVERY=15 # remind Claude about session length every this many messages (a judgement call)

# Which device is this? Cloud sessions (phone, web) set CLAUDE_CODE_REMOTE.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "$(uname -s)" != "Darwin" ]; then
  DEVICE=phone/cloud
else
  DEVICE=desktop
fi

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
branch() { git rev-parse --abbrev-ref HEAD; }

# Hours since an ISO time; works on macOS and Linux date.
hours_since() {
  local t
  t=$(date -u -j -f %Y-%m-%dT%H:%M:%SZ "$1" +%s 2>/dev/null || date -u -d "$1" +%s 2>/dev/null) || { echo 999; return; }
  echo $(( ( $(date -u +%s) - t ) / 3600 ))
}

# ---------- The lock (on the session-lock branch) ----------

fetch_lock() {
  git fetch -q origin "+refs/heads/$LOCK_BRANCH:refs/remotes/origin/$LOCK_BRANCH" 2>/dev/null
}
lock_text() { git show "origin/$LOCK_BRANCH:lock" 2>/dev/null; }
field() { lock_text | sed -n "s/^$1=//p" | head -1; }

# Is another device busy right now? Prints a description if so.
other_busy() {
  local state device since age
  state=$(field state); device=$(field device); since=$(field since)
  [ "$state" = "busy" ] && [ "$device" != "$DEVICE" ] || return 1
  age=$(hours_since "$since")
  [ "$age" -lt "$STALE_HOURS" ] || return 1
  echo "$device has been working on a reply since $since"
}

# Write the lock file straight onto the session-lock branch and push it, without
# touching the files you're working on. (These are git's "plumbing" commands:
# store the file, make a folder listing, make a commit, push it.) Never forces.
write_lock() {  # state
  local blob tree parent commit
  blob=$(printf 'state=%s\ndevice=%s\nsince=%s\nbranch=%s\n' "$1" "$DEVICE" "$(now)" "$(branch)" | git hash-object -w --stdin)
  tree=$(printf '100644 blob %s\tlock\n' "$blob" | git mktree)
  parent=$(git rev-parse -q --verify "origin/$LOCK_BRANCH")
  commit=$(echo "Lock $1: $DEVICE" | git commit-tree "$tree" ${parent:+-p "$parent"})
  if git push -q origin "$commit:refs/heads/$LOCK_BRANCH" 2>/dev/null; then
    fetch_lock; return 0
  fi
  echo "LOCK NOT UPDATED: the other device changed it at the same moment, or GitHub can't be reached."
  return 1
}

# ---------- Git state ----------

unsaved() { git status --porcelain; }
unpushed() { git log --oneline origin/main..HEAD 2>/dev/null; }

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
  git fetch -q origin main || { echo "WARNING: could not reach GitHub. Work may be out of date."; return; }
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

# ---------- Commands ----------

cmd_start() {
  echo "=== Session start ($DEVICE, branch $(branch)) ==="
  [ -n "$(unsaved)" ] && { echo "WARNING: uncommitted changes already in this checkout:"; unsaved; }
  pull_main
  fetch_lock
  local busy
  if busy=$(other_busy); then
    echo "!!! ANOTHER DEVICE IS WORKING: $busy."
    echo "!!! Tell Leo straight away and change nothing until that reply has finished."
  else
    echo "No other device is working. (The lock is claimed automatically when Leo sends a message.)"
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
  echo
  echo "--- Handover from docs/STATUS.md ---"
  sed -n '/^## Handover/,/^## Where we are/p' docs/STATUS.md | sed '$d'
}

# Count Leo's messages in this session (Claude Code passes the session id on stdin)
# and every COACH_EVERY messages tell Claude, so it can suggest a fresh session.
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
  echo "COACH: at the next natural break, suggest wrapping up: update docs/STATUS.md and give Leo a starter prompt for a fresh session (see 'Coaching' in .claude/rules/playbook.md)."
}

cmd_busy() {
  local input=""; [ -t 0 ] || input=$(cat)
  coach "$input"
  pull_main
  fetch_lock
  local busy
  if busy=$(other_busy) && [ "${1:-}" != "--force" ]; then
    echo "!!! ANOTHER DEVICE IS WORKING: $busy."
    echo "!!! Tell Leo before changing anything. Read-only work is fine."
    echo "!!! If Leo says that session has finished, run: scripts/session.sh busy --force"
    exit 0
  fi
  write_lock busy >/dev/null || echo "Note: could not claim the session lock (GitHub unreachable or busy)."
}

cmd_check() {
  # Claude Code passes JSON on stdin; if it is already retrying after a block, don't loop.
  local input=""; [ -t 0 ] || input=$(cat)
  case "$input" in *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;; esac

  local problems=""
  [ -n "$(unsaved)" ] && problems="$problems
- Uncommitted changes. Commit them."
  [ -n "$(unlogged)" ] && problems="$problems
- Work committed since docs/STATUS.md was last updated. Update STATUS.md (Handover block, where we are) and commit. If the plan, scope or a choice changed, SPEC.md and docs/decisions.md too ('Keeping the docs true' in .claude/rules/playbook.md)."
  [ -n "$(unplanned)" ] && problems="$problems
- specs/ changed since SPEC.md was last updated. Make SPEC.md match (goal, scope, steps and their status, a link to each spec), log any change of plan in docs/decisions.md, and commit."
  git fetch -q origin main 2>/dev/null
  [ -n "$(unpushed)" ] && problems="$problems
- Commits not on GitHub main. Push with: git push origin HEAD:main (or merge this branch into main and push)."
  local d
  for d in $(siblings); do
    [ -n "$(git -C "$d" status --porcelain 2>/dev/null)" ] && problems="$problems
- $(basename "$d") (also attached) has uncommitted changes. Commit them."
    [ -n "$(git -C "$d" log --oneline origin/main..HEAD 2>/dev/null)" ] && problems="$problems
- $(basename "$d") (also attached) has commits not on GitHub main. Push them with: git -C $d push origin HEAD:main"
  done

  if [ -n "$problems" ]; then
    echo "Not finished: the other device would not see this work yet.$problems" >&2
    exit 2   # tells Claude Code to keep going and fix these
  fi
  release
  exit 0
}

# Free the lock, if this device holds it.
release() {
  fetch_lock
  [ "$(field state)" = "busy" ] && [ "$(field device)" = "$DEVICE" ] && write_lock free >/dev/null
  return 0
}

cmd_end() {
  local problems
  problems=$(cmd_check </dev/null 2>&1) || { echo "$problems"; exit 1; }
  echo "Lock released. Safe to switch device."
}

cmd_status() {
  fetch_lock
  echo "Device: $DEVICE   Branch: $(branch)"
  lock_text || echo "No lock yet."
  echo "Unsaved:";  unsaved
  echo "Unpushed:"; unpushed
  echo "Unlogged:"; unlogged
  echo "Spec changed, SPEC.md not:"; unplanned
}

case "${1:-status}" in
  start)  cmd_start ;;
  busy)   cmd_busy "${2:-}" ;;
  check)  cmd_check ;;
  end)    cmd_end ;;
  status) cmd_status ;;
  visibility-ok) v=$(visibility) && record_visibility "$v" && echo "Recorded: this repo is $v (reviewed)." ;;
  *) echo "Usage: $0 start | busy [--force] | check | end | status | visibility-ok"; exit 1 ;;
esac
