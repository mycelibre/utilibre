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
release_row markmap 0.18.12 markmap/markmap
head_row excalidraw 53973c3a423fbd75a4ce68107786b4fcb90e4968 excalidraw/excalidraw master
head_row svgedit c44f061d2f9a626d2771cc931298af5a45522d87 SVG-Edit/svgedit master
release_row cyberchef 11.5.0 gchq/CyberChef
head_row image-scrubber 390b166cfc61326476ed9d6cb376291f87e35c23 everestpipkin/image-scrubber main
head_row zip-manager 3b77a599d823691cc3b7b81e0715b4655423e578 gildas-lormeau/zip-manager main
head_row rawgraphs b7b2909111cc029ccf418dc3e7d079e0f4c50d6f rawgraphs/rawgraphs-app master
head_row audiomass 21f5ee1362a47be6f0dbe6e4969a15e43d21b044 pkalogiros/AudioMass production
head_row minipaint a79733eb803fc97084ef0ee4faa96b031e69e1c0 viliusle/miniPaint master

echo
echo "No images were pulled and no containers were changed. Resolve and review a new digest manually."
