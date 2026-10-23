#!/usr/bin/env bash
# Brings this project's copies of the shared playbook files up to date from
# github.com/leo-hyde/claude-playbook, so a change made once in the playbook
# reaches every project. session.sh runs this at every session start.
#
# Where it looks for the playbook, in order:
#   1. $PLAYBOOK_DIR, ~/.claude/skills/new-app (Leo's Mac), or ../claude-playbook
#      (a cloud session with the playbook attached): any clone, refreshed with fetch
#   2. A small copy downloaded from GitHub into .session/playbook (not committed)
# It always reads the playbook's GitHub `main`, never a clone's unsaved edits.
# If the playbook can't be reached, the copies already committed here are used.
#
# This file comes from the playbook (shared/playbook-sync.sh): edit it there.

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

URL=https://github.com/leo-hyde/claude-playbook.git
# playbook file : this project's copy
FILES="shared/ai-dev-rules.md:.claude/rules/playbook.md
shared/session.sh:scripts/session.sh
shared/playbook-sync.sh:scripts/playbook-sync.sh"

# The playbook itself doesn't sync from itself.
[ -f shared/ai-dev-rules.md ] && exit 0

# Never wait for a password or a dead connection.
export GIT_TERMINAL_PROMPT=0
G=(git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15)
# On Leo's Mac, the GitHub CLI holds the login for the private repo.
GH=/opt/homebrew/bin/gh
[ -x "$GH" ] && G+=(-c credential.helper= -c "credential.helper=!$GH auth git-credential")

src=""
for d in "${PLAYBOOK_DIR:-}" "$HOME/.claude/skills/new-app" "../claude-playbook" ".session/playbook"; do
  [ -n "$d" ] && [ -d "$d/.git" ] || continue
  depth=""; [ "$d" = .session/playbook ] && depth="--depth 1"   # keep Leo's own clones whole
  "${G[@]}" -C "$d" fetch -q $depth origin main 2>/dev/null &&
    "${G[@]}" -C "$d" rev-parse -q --verify origin/main >/dev/null && { src=$d; break; }
done
if [ -z "$src" ]; then
  rm -rf .session/playbook
  mkdir -p .session
  "${G[@]}" clone -q --depth 1 --branch main "$URL" .session/playbook 2>/dev/null && src=.session/playbook
fi
if [ -z "$src" ]; then
  echo "Playbook: couldn't reach github.com/leo-hyde/claude-playbook, so this session uses the copy already in .claude/rules/playbook.md."
  exit 0
fi

changed=""
while IFS=: read -r from to; do
  new=$(mktemp) || exit 0
  git -C "$src" show "origin/main:$from" >"$new" 2>/dev/null || { rm -f "$new"; continue; }
  if ! cmp -s "$new" "$to"; then
    mkdir -p "$(dirname "$to")"
    case "$to" in *.sh) chmod +x "$new" ;; *) chmod 644 "$new" ;; esac
    mv "$new" "$to"   # a new file, not an overwrite, so a script that's running isn't disturbed
    changed="$changed $to"
  else
    rm -f "$new"
  fi
done <<EOF
$FILES
EOF

if [ -n "$changed" ]; then
  # A commit of only these files, named "Playbook: …" so session.sh doesn't ask for a STATUS update.
  git add -f -- $changed && git commit -q -m "Playbook: update shared files from claude-playbook" -- $changed
  echo "Playbook: updated$changed from claude-playbook (committed, not yet pushed)."
  case "$changed" in *playbook.md*)
    echo "Playbook: the shared rules changed; read .claude/rules/playbook.md again before starting." ;;
  esac
else
  echo "Playbook: shared rules are up to date."
fi
