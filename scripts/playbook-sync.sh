#!/usr/bin/env bash
# Brings this project's copies of the shared playbook files up to date from
# github.com/leo-hyde/claude-playbook, so a change made once in the playbook
# reaches every project. session.sh runs this at every session start.
#
# Where it looks for the playbook, in order:
#   1. $PLAYBOOK_DIR, ~/.claude/skills/new-app (Leo's Mac), or ../claude-playbook
#      (a cloud session with the playbook attached): any clone, refreshed with fetch
#   2. A small copy downloaded from GitHub into .session/playbook (not committed)
# It always reads a branch of the playbook on GitHub, never a clone's unsaved edits:
# `stable` (moved on by each release), or `main` for a canary project, whose
# committed .claude/playbook-channel reads "main". If `stable` doesn't exist yet,
# it reads `main` (the change-over from before releases).
# If the playbook can't be reached, the copies already committed here are used.
#
# This file comes from the playbook (shared/playbook-sync.sh): edit it there.

set -u
cd "$(git rev-parse --show-toplevel)" || exit 0

URL=${PLAYBOOK_URL:-https://github.com/leo-hyde/claude-playbook.git}   # tests point it elsewhere
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

# Which playbook branch: .claude/playbook-channel holds one word, main or stable.
channel=$( [ -f .claude/playbook-channel ] && tr -d ' \t\r\n' <.claude/playbook-channel)
case "$channel" in
  main|stable) ;;
  "") channel=stable ;;
  *) echo "SETUP: .claude/playbook-channel should read main or stable, not '$channel'. Using stable. Tell Leo."
     channel=stable ;;
esac
# Explicit refspecs, so a single-branch clone still records origin/stable.
fetch_branch() {  # dir branch [depth]
  "${G[@]}" -C "$1" fetch -q ${3:+--depth "$3"} origin "+refs/heads/$2:refs/remotes/origin/$2" 2>/dev/null &&
    "${G[@]}" -C "$1" rev-parse -q --verify "origin/$2" >/dev/null
}

# Second run after this script updated itself (see below): the playbook's main is already
# fetched. Fetch stable too: an older script that ran first didn't know about it.
src="${PLAYBOOK_SYNC_SRC:-}"
if [ -n "$src" ] && [ "$channel" = stable ]; then
  depth=""; [ "$src" = .session/playbook ] && depth=1
  fetch_branch "$src" stable $depth || true
fi
[ -n "$src" ] || for d in "${PLAYBOOK_DIR:-}" "$HOME/.claude/skills/new-app" "../claude-playbook" ".session/playbook"; do
  [ -n "$d" ] && [ -d "$d/.git" ] || continue
  depth=""; [ "$d" = .session/playbook ] && depth=1   # keep Leo's own clones whole
  fetch_branch "$d" main $depth || continue
  # No stable yet is fine (main is used). If fetching it fails, the last one fetched is
  # kept: an older release is safe, and stable is never deleted or rewound.
  [ "$channel" = stable ] && { fetch_branch "$d" stable $depth || true; }
  src=$d; break
done
if [ -z "$src" ]; then
  rm -rf .session/playbook
  mkdir -p .session
  "${G[@]}" clone -q --depth 1 --branch main "$URL" .session/playbook 2>/dev/null && src=.session/playbook &&
    { [ "$channel" = main ] || fetch_branch "$src" stable 1 || true; }
fi
if [ -z "$src" ]; then
  last=$(git log -1 --format=%cs --grep='^Playbook: update' 2>/dev/null)
  echo "PLAYBOOK NOT SYNCED: couldn't reach github.com/leo-hyde/claude-playbook, so this session uses the copy"
  echo "already in .claude/rules/playbook.md (last updated ${last:-never}). Tell Leo; retry later with: bash scripts/playbook-sync.sh"
  exit 0
fi

# The branch to read: the channel's, or main while there's no stable yet.
ref=origin/main
[ "$channel" = stable ] && git -C "$src" rev-parse -q --verify origin/stable >/dev/null && ref=origin/stable

changed=""
while IFS=: read -r from to; do
  new=$(mktemp) || exit 0
  git -C "$src" show "$ref:$from" >"$new" 2>/dev/null || { rm -f "$new"; continue; }
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
  if [ "$ref" = origin/stable ]; then
    # The newest release note: its heading (the tag) and first line. Claude passes it on.
    note=$(git -C "$src" show "$ref:RELEASES.md" 2>/dev/null | awk '
      /^## release-/ { if (tag) exit; tag = $2; next }
      tag && NF { print tag ": " $0; exit }')
    [ -n "$note" ] && echo "Playbook: updated to $note"
  else
    echo "Playbook: read from the playbook's main ($( [ "$channel" = main ] && echo "canary" || echo "no stable branch yet")), not a release."
  fi
  case "$changed" in *playbook.md*)
    echo "Playbook: the shared rules changed; read .claude/rules/playbook.md again before starting." ;;
  esac
  # This script just replaced itself: run the new version now, so anything it
  # adds (a new check, like catch-ups) works this session, not only the next.
  case "$changed" in *scripts/playbook-sync.sh*)
    if [ -z "${PLAYBOOK_SYNC_SRC:-}" ]; then
      export PLAYBOOK_SYNC_SRC="$src"
      exec bash scripts/playbook-sync.sh
    fi ;;
  esac
else
  echo "Playbook: shared rules are up to date."
fi

# Set-up (shared/setup.txt): what every project needs besides the copied files.
# Missing .gitignore lines and hooks are added and committed; missing files are reported.
setup=$(git -C "$src" show "$ref:shared/setup.txt" 2>/dev/null | sed -n 's/^\([a-z]*\): *\(.*[^ ]\) *$/\1 \2/p')
fixed=""
want=$(printf '%s\n' "$setup" | sed -n 's/^gitignore //p')
if [ -n "$want" ]; then
  missing=$(printf '%s\n' "$want" | while IFS= read -r l; do grep -qxF -- "$l" .gitignore 2>/dev/null || echo "$l"; done)
  if [ -n "$missing" ]; then
    # Rewrite the whole block in order, so a "!" exception always comes after the line it excepts.
    { [ -f .gitignore ] && grep -vxF -- "$want" .gitignore; printf '%s\n' "$want"; } >.gitignore.new
    mv .gitignore.new .gitignore
    fixed="$fixed .gitignore"
  fi
fi
for f in $(printf '%s\n' "$setup" | sed -n 's/^hooks //p'); do
  tmpl=$(mktemp) || break
  git -C "$src" show "$ref:$f" >"$tmpl" 2>/dev/null || { rm -f "$tmpl"; continue; }
  if ! command -v python3 >/dev/null 2>&1; then
    echo "SETUP: can't check the hooks in .claude/settings.json (no python3). Compare it with the playbook's $f."
  else
    mkdir -p .claude
    # Adds each hook group whose commands aren't all there yet; keeps everything else.
    python3 - "$tmpl" .claude/settings.json <<'PY'
import json, sys
tmpl, path = sys.argv[1], sys.argv[2]
want = json.load(open(tmpl)).get("hooks", {})
try:
    settings = json.load(open(path))
except FileNotFoundError:
    settings = {}
except ValueError:
    print("SETUP: .claude/settings.json isn't valid JSON, so its hooks weren't checked. Fix it by hand.")
    sys.exit(1)
hooks = settings.setdefault("hooks", {})
changed = False
for event, groups in want.items():
    have = [h.get("command") for g in hooks.get(event, []) for h in g.get("hooks", [])]
    for g in groups:
        if not all(h.get("command") in have for h in g.get("hooks", [])):
            hooks.setdefault(event, []).append(g)
            changed = True
if changed:
    with open(path, "w") as out:
        json.dump(settings, out, indent=2)
        out.write("\n")
sys.exit(0 if changed else 1)
PY
    [ $? -eq 0 ] && fixed="$fixed .claude/settings.json"
  fi
  rm -f "$tmpl"
done
if [ -n "$fixed" ]; then
  git add -f -- $fixed && git commit -q -m "Playbook: complete the project set-up ($(echo $fixed))" -- $fixed
  echo "Playbook: added what the playbook's set-up needs to$fixed (committed, not yet pushed)."
  case "$fixed" in *settings.json*)
    echo "Playbook: new hooks start working from the next session. Until then, run any start step by hand." ;;
  esac
fi
for f in $(printf '%s\n' "$setup" | sed -n 's/^file //p'); do
  [ -e "$f" ] || echo "SETUP: $f is missing. Tell Leo and offer to add it (playbook reference/phone-and-computer.md)."
done

# Catch-ups (shared/catch-up.md): rule changes that this project's existing files
# need too. Each "## <id>: <title>" section is due until docs/playbook-catch-up.md
# mentions its id.
due=$(git -C "$src" show "$ref:shared/catch-up.md" 2>/dev/null | awk '
  BEGIN { while ((getline line < "docs/playbook-catch-up.md") > 0) done = done "\n" line }
  /^## / { id = $2; sub(/:$/, "", id); show = (index(done, id) == 0); started = 1 }
  started && show')
if [ -n "$due" ]; then
  echo "Playbook: CATCH-UP DUE. These rule changes also apply to files this project already has."
  echo "Tell Leo, apply them (or offer a separate session if big), then record each id in docs/playbook-catch-up.md:"
  echo "$due"
fi
