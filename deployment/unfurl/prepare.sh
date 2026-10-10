#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/unfurl-review}
recipe_dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 42aecfdc2407e82faf6d7acdc611f7d697fa2524 ]
# Apply source.patch to a clean checkout before invoking this recipe.
git -C "$source_dir" apply --reverse --check "$recipe_dir/source.patch"
mkdir -p "$source_dir/unfurl/static/vendor"
vendor_dir="$source_dir/unfurl/static/vendor"
curl -fsSL https://cdn.jsdelivr.net/npm/vis-network@10.1.2/standalone/umd/vis-network.min.js -o "$vendor_dir/vis.min.js"
curl -fsSL https://cdn.jsdelivr.net/npm/vis-network@10.1.2/styles/vis-network.min.css -o "$vendor_dir/vis.min.css"
curl -fsSL https://cdn.jsdelivr.net/npm/vis-network@10.1.2/LICENSE-APACHE-2.0 -o "$vendor_dir/LICENSE-APACHE-2.0"
curl -fsSL https://cdn.jsdelivr.net/npm/vis-network@10.1.2/LICENSE-MIT -o "$vendor_dir/LICENSE-MIT"
curl -fsSL https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js -o "$vendor_dir/d3.min.js"
curl -fsSL https://cdn.jsdelivr.net/npm/d3@7.9.0/LICENSE -o "$vendor_dir/LICENSE-d3"
curl -fsSL https://cdn.jsdelivr.net/npm/dompurify@3.4.16/dist/purify.min.js -o "$vendor_dir/purify.min.js"
curl -fsSL https://cdn.jsdelivr.net/npm/dompurify@3.4.16/LICENSE -o "$vendor_dir/LICENSE-DOMPurify"
(cd "$vendor_dir" && sha256sum -c "$recipe_dir/vendor.sha256")
context_dir=$(mktemp -d /opt/utilibre/reports/unfurl-build.XXXXXX)
cp "$recipe_dir/Dockerfile" "$recipe_dir/requirements.lock" "$recipe_dir/gunicorn.conf.py" "$context_dir/"
mkdir "$context_dir/source"
tar --exclude=.git --exclude=__pycache__ --exclude='*.pyc' -C "$source_dir" -cf - . | tar -C "$context_dir/source" -xf -
docker build -t utilibre-unfurl:2026.10-p1 "$context_dir"
printf 'Disposable source build context: %s\n' "$context_dir"
