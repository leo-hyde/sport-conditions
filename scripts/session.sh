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
#
# The lock is a file called `lock` on its own branch, `session-lock`, so it doesn't
# clutter main's history or republish the site. Because GitHub only accepts a push
# that builds on the latest version of a branch, two devices can't both claim it.
# Claude Code runs start, busy and check automatically (see .claude/settings.json).

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

LOCK_BRANCH=session-lock
STALE_HOURS=2  # a busy lock older than this was left behind by a crash

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

# Commits since STATUS.md was last changed.
unlogged() {
  local last
  last=$(git log -1 --format=%H -- docs/STATUS.md)
  [ -z "$last" ] && return
  git log --format=%h "$last"..HEAD -- . ":(exclude)docs/STATUS.md"
}

# Bring in the latest main, whatever branch we're on.
pull_main() {
  git fetch -q origin main || { echo "WARNING: could not reach GitHub. Work may be out of date."; return; }
  if ! git merge -q --no-edit origin/main 2>/dev/null; then
    git merge --abort 2>/dev/null
    echo "CONFLICT: could not merge the latest main into $(branch). Stop and tell Leo."
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
  echo
  echo "--- Handover from docs/STATUS.md ---"
  sed -n '/^## Handover/,/^## Where we are/p' docs/STATUS.md | sed '$d'
}

cmd_busy() {
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
- Work committed since docs/STATUS.md was last updated. Update STATUS.md (Handover block, session log) and commit."
  git fetch -q origin main 2>/dev/null
  [ -n "$(unpushed)" ] && problems="$problems
- Commits not on GitHub main. Push with: git push origin HEAD:main (or merge this branch into main and push)."

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
}

case "${1:-status}" in
  start)  cmd_start ;;
  busy)   cmd_busy "${2:-}" ;;
  check)  cmd_check ;;
  end)    cmd_end ;;
  status) cmd_status ;;
  *) echo "Usage: $0 start | busy [--force] | check | end | status"; exit 1 ;;
esac
