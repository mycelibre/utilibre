#!/bin/sh
# Ordinary native Git compatibility on entirely fictional repositories.
set -eu
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0
export GIT_AUTHOR_NAME='Fictional fixture' GIT_AUTHOR_EMAIL='fixture@example.invalid'
export GIT_COMMITTER_NAME='Fictional fixture' GIT_COMMITTER_EMAIL='fixture@example.invalid'
work=$(mktemp -d /tmp/utilibre-native-git.XXXXXX)
trap 'rm -rf "$work"' EXIT HUP INT TERM
cd "$work"
git init --quiet --initial-branch=main source
cd source
printf 'Fictional first line\n' > example.txt
git add example.txt
git commit --quiet -m 'Fictional initial commit'
git checkout --quiet -b draft
printf 'Fictional second file\n' > second.txt
git add second.txt
git commit --quiet -m 'Fictional draft'
git checkout --quiet main
git merge --quiet --no-ff draft -m 'Fictional merge'
test "$(git show HEAD:second.txt)" = 'Fictional second file'
git tag fictional-v1
git fsck --strict >/dev/null
git archive --format=tar HEAD > "$work/example.tar"
tar -tf "$work/example.tar" | grep -Fx example.txt >/dev/null
git fast-export --all > "$work/example.stream"
cd "$work"
git clone --quiet --bare source bare.git
git clone --quiet bare.git clone
cd clone
printf 'Fictional local push\n' >> example.txt
git add example.txt
git commit --quiet -m 'Fictional update'
git push --quiet origin main
cd "$work"
git clone --quiet bare.git reopened
grep -Fx 'Fictional local push' reopened/example.txt >/dev/null
git init --quiet --initial-branch=main imported
git -C imported fast-import --quiet < "$work/example.stream"
test "$(git -C imported show main:second.txt)" = 'Fictional second file'
test "$(git -C imported rev-parse main)" = "$(git -C source rev-parse main)"
git -C imported fsck --strict >/dev/null
printf 'GIT_NATIVE_COMPATIBILITY_PASSED\n'
