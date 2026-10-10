#!/bin/sh
set -eu
# Usage: prepare.sh /path/to/upstream-git /private/new-build-directory
source_dir=$1
build_dir=$2
script_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
revision=d03b120c41d2558d3ce2a45e049ccbea8785ff7a
[ "$(git -C "$source_dir" rev-parse HEAD)" = "$revision" ]
[ ! -e "$build_dir" ]
mkdir -p "$build_dir/source"
git -C "$source_dir" archive "$revision" | tar -x -C "$build_dir/source"
(cd "$build_dir/source" && patch -p1 < "$script_dir/restricted-fixture.patch")
cp "$script_dir/Dockerfile" "$script_dir/fixture.py" "$script_dir/requirements.lock" "$build_dir/"
docker build -t utilibre-13ft-evaluation:0.5.0-fixture1 "$build_dir"
