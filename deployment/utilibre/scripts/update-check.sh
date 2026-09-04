#!/bin/sh
set -eu

echo "Utilibre update review — $(date -u --iso-8601=seconds)"
echo "Read-only check against official GitHub repositories. Review release notes before changing a pin."
echo

latest_release() {
  repository=$1
  curl -fsSL --connect-timeout 5 --max-time 20 \
    "https://api.github.com/repos/${repository}/releases/latest" 2>/dev/null \
    | sed -n 's/^[[:space:]]*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' \
    | head -1
}

release_row() {
  service=$1 pinned=$2 repository=$3
  latest=$(latest_release "$repository" || true)
  [ -n "$latest" ] || latest="unavailable (check manually)"
  printf '%-16s %-18s %-28s %s\n' "$service" "$pinned" "$latest" "https://github.com/${repository}/releases"
}

head_row() {
  service=$1 pinned=$2 repository=$3 branch=$4
  latest=$(git ls-remote "https://github.com/${repository}.git" "refs/heads/${branch}" 2>/dev/null | awk 'NR==1 {print $1}' || true)
  [ -n "$latest" ] || latest="unavailable"
  printf '%-16s %-18s %-28s %s\n' "$service" "$pinned" "$latest" "https://github.com/${repository}/commits/${branch}"
}

printf '%-16s %-18s %-28s %s\n' SERVICE PINNED UPSTREAM URL
release_row freshrss 1.29.1 FreshRSS/FreshRSS
head_row rsshub 40aca954 DIYgod/RSSHub master
release_row privatebin 2.0.6 PrivateBin/PrivateBin

echo
echo "No images were pulled and no containers were changed. Resolve and review a new digest manually."
