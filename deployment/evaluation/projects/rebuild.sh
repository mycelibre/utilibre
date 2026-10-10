#!/bin/sh
set -eu
source_dir=${PROJECTS_SOURCE:-/opt/utilibre/src/planka-projects}
revision=455aa274b44e63efa42840997ea4924b43eed533
recipe_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ ! -d "$source_dir/.git" ]; then
 git clone https://github.com/suitenumerique/projects.git "$source_dir"
 git -C "$source_dir" checkout --detach "$revision"
fi
test "$(git -C "$source_dir" rev-parse HEAD)" = "$revision"
if ! git -C "$source_dir" apply --reverse --check --unidiff-zero "$recipe_dir/security-dependencies.patch" 2>/dev/null; then
 git -C "$source_dir" apply --check --unidiff-zero "$recipe_dir/security-dependencies.patch"
 git -C "$source_dir" apply --unidiff-zero "$recipe_dir/security-dependencies.patch"
fi
# This evaluation uses the legacy builder because this VM's BuildKit snapshot
# metadata failed independently of the application. No global cache is pruned.
DOCKER_BUILDKIT=0 docker build --memory=3g --cpuset-cpus=0,1 \
 -t utilibre-projects-pilot:455aa274-p1 -f "$recipe_dir/Dockerfile" "$source_dir"
