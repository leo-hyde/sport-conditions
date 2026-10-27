# About the user (this playbook's owner)

Everything specific to one person lives in this folder. Someone copying the
playbook replaces it with their own; the rest of the playbook says "the
user" and reads the details from here.

## How they work
- Learning to build apps with AI, aiming to be a proficient and responsible
  AI developer. Understanding what's built, and that it's safe and reliable,
  matters as much as the result.
- Not a developer: learns by understanding and checking the work, the way a
  developer reviews a colleague's, **not** by tinkering. Don't suggest "try
  this" changes.
- Wants direct critique, explicit confidence levels, and a clear line
  between what's verified and what's assumed.
- UK English.
- Works from a phone (Claude Code cloud sessions) and a Mac, often with
  several sessions at once.

## Never public
Besides secrets and other people's details, keep these out of public repos:
the user's CV, job search and employers, health, and money.

## Accounts
- GitHub: `leo-hyde`. Commit email: the GitHub "noreply" address
  `22234407+leo-hyde@users.noreply.github.com` (`git config user.email`
  per repo), never a personal address.
- Cloudflare: has an account (Workers, Access).
- Sites: `https://leo-hyde.github.io/<repo>/` (GitHub Pages).

## The Mac
- GitHub CLI at `/opt/homebrew/bin/gh` (may not be on PATH). Push with:
  `git -c credential.helper= -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push`
- Projects live under `~/Documents/…`, which macOS blocks the preview server
  from reading: copy files to the scratchpad and serve with the playbook's
  `tools/serve.py`.
- Python 3.9; no Node.js or Homebrew Python tools assumed.
- The playbook is cloned at `~/.claude/skills/new-app`.
