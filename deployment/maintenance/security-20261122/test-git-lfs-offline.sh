#!/usr/bin/env bash
# Synthetic, networkless Git LFS pointer/object round trip. Never use real repos.
set -euo pipefail

binary="${1:?git-lfs binary path required}"
expected="${2:?expected version required}"
[[ "$binary" = /* && -x "$binary" && "$(basename "$binary")" = git-lfs ]]
[[ "$expected" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
work="$(mktemp -d /tmp/utilibre-git-lfs-test.XXXXXXXX)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$work/home" "$work/config" "$work/repo"
export HOME="$work/home" XDG_CONFIG_HOME="$work/config"
export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null
export PATH="$(dirname "$binary"):/usr/bin:/bin"

"$binary" version | grep -F "git-lfs/$expected " >/dev/null
git -C "$work/repo" init -q
git -C "$work/repo" lfs install --local >/dev/null
git -C "$work/repo" lfs track '*.bin' >/dev/null
printf 'Utilibre synthetic LFS object\n' > "$work/repo/sample.bin"
cp "$work/repo/sample.bin" "$work/expected.bin"
git -C "$work/repo" add .gitattributes sample.bin
git -C "$work/repo" cat-file -p :sample.bin > "$work/pointer"
grep -Fx 'version https://git-lfs.github.com/spec/v1' "$work/pointer" >/dev/null
grep -Eq '^oid sha256:[a-f0-9]{64}$' "$work/pointer"
git -C "$work/repo" -c user.name=Utilibre -c user.email=synthetic@invalid.example commit -qm synthetic
git -C "$work/repo" lfs fsck >/dev/null
rm "$work/repo/sample.bin"
git -C "$work/repo" lfs checkout >/dev/null
cmp "$work/expected.bin" "$work/repo/sample.bin"
printf 'passed git-lfs/%s local pointer, checkout and fsck\n' "$expected"
