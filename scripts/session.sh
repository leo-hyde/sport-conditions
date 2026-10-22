#!/usr/bin/env bash
# Keeps phone and desktop Claude sessions in sync through GitHub.
#
#   scripts/session.sh start   pull latest main, warn if another device is active, claim the lock
#   scripts/session.sh check   refuse to finish a turn with unsaved, unpushed or unlogged work
#   scripts/session.sh end     release the lock and push, so the other device can start
#   scripts/session.sh status  show the lock and git state
#
# The lock is the file .session/lock on main. Because GitHub only accepts a push that
# builds on the latest main, two devices can't both claim it: the second push fails.
# Claude Code runs `start` and `check` automatically (see .claude/settings.json).

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

LOCK=.session/lock
STALE_HOURS=12

# Which device is this? Cloud sessions (phone, web) set CLAUDE_CODE_REMOTE.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || [ "$(uname -s)" != "Darwin" ]; then
  DEVICE=phone/cloud
else
  DEVICE=desktop
fi

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
field() { [ -f "$LOCK" ] && sed -n "s/^$1=//p" "$LOCK" | head -1; }
branch() { git rev-parse --abbrev-ref HEAD; }

# Hours since an ISO time; works on macOS and Linux date.
hours_since() {
  local t
  t=$(date -u -j -f %Y-%m-%dT%H:%M:%SZ "$1" +%s 2>/dev/null || date -u -d "$1" +%s 2>/dev/null) || { echo 999; return; }
  echo $(( ( $(date -u +%s) - t ) / 3600 ))
}

write_lock() {  # state
  mkdir -p .session
  cat > "$LOCK" <<EOF
state=$1
device=$DEVICE
since=$(now)
branch=$(branch)
EOF
}

# Commit just the lock and push it to main. Never force.
push_lock() {  # message
  git add "$LOCK"
  git commit -q -m "$1" -- "$LOCK" || return 0
  if git push -q origin HEAD:main 2>/dev/null; then return 0; fi
  echo "PUSH REJECTED: main moved on GitHub while this session was working. Another device may be active."
  echo "Do not force-push. Tell Leo, then run: git pull --no-rebase origin main"
  return 1
}

unsaved() { git status --porcelain | grep -v " $LOCK\$"; }
unpushed() { git log --oneline origin/main..HEAD 2>/dev/null; }

# Commits since STATUS.md was last changed that touch anything other than the lock.
unlogged() {
  local last
  last=$(git log -1 --format=%H -- docs/STATUS.md)
  [ -z "$last" ] && return
  git log --format=%h "$last"..HEAD -- . ":(exclude)$LOCK" ":(exclude)docs/STATUS.md"
}

cmd_start() {
  echo "=== Session start ($DEVICE, branch $(branch)) ==="
  git fetch -q origin || echo "WARNING: could not reach GitHub. Work may be out of date."
  if [ -n "$(unsaved)" ]; then
    echo "WARNING: uncommitted changes already in this checkout:"; unsaved
  fi
  # Bring in the latest main whatever branch we're on.
  if ! git merge -q --no-edit origin/main 2>/dev/null; then
    git merge --abort 2>/dev/null
    echo "CONFLICT: could not merge the latest main into $(branch). Stop and tell Leo."
    exit 0
  fi

  local state device since age
  state=$(field state); device=$(field device); since=$(field since)
  if [ "$state" = "active" ]; then
    age=$(hours_since "$since")
    if [ "$device" != "$DEVICE" ] && [ "$age" -lt "$STALE_HOURS" ]; then
      echo "!!! ANOTHER DEVICE MAY STILL BE WORKING: $device has been active since $since (${age}h ago)."
      echo "!!! Before changing anything, tell Leo and ask whether that session has finished."
      echo "!!! If it has, run: scripts/session.sh start --force"
      [ "${1:-}" = "--force" ] || exit 0
    elif [ "$device" != "$DEVICE" ]; then
      echo "Note: $device never released the lock (${age}h ago). Treating it as finished."
    fi
  fi

  write_lock active
  push_lock "Session start: $DEVICE" && echo "Lock claimed for $DEVICE."
  echo
  echo "--- Handover from docs/STATUS.md ---"
  sed -n '/^## Handover/,/^## Where we are/p' docs/STATUS.md | sed '$d'
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
  git fetch -q origin 2>/dev/null
  [ -n "$(unpushed)" ] && problems="$problems
- Commits not on GitHub main. Push with: git push origin HEAD:main (or merge this branch into main and push)."

  if [ -n "$problems" ]; then
    echo "Not finished: the other device would not see this work yet.$problems" >&2
    exit 2   # tells Claude Code to keep going and fix these
  fi
  exit 0
}

cmd_end() {
  local problems
  problems=$(cmd_check </dev/null 2>&1) || { echo "$problems"; exit 1; }
  write_lock finished
  push_lock "Session end: $DEVICE" && echo "Lock released. Safe to switch device."
}

cmd_status() {
  echo "Device: $DEVICE   Branch: $(branch)"
  [ -f "$LOCK" ] && cat "$LOCK" || echo "No lock file."
  echo "Unsaved:";  unsaved
  echo "Unpushed:"; unpushed
  echo "Unlogged:"; unlogged
}

case "${1:-status}" in
  start)  cmd_start "${2:-}" ;;
  check)  cmd_check ;;
  end)    cmd_end ;;
  status) cmd_status ;;
  *) echo "Usage: $0 start [--force] | check | end | status"; exit 1 ;;
esac
