#!/bin/sh
# Package corresponding source after an exact prepare.sh run; no live service change.
set -eu
task_root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd)
task_service=${1:?Expected wikimore, freetar or structables}
task_candidate=${2:?Expected prepared candidate directory}
task_target=${3:?Expected absolute source-archive path}
case "$task_service" in wikimore|freetar|structables) ;; *) echo 'Unsupported service' >&2; exit 1;; esac
case "$task_candidate:$task_target" in /*:/*) ;; *) echo 'Use absolute paths' >&2; exit 1;; esac
[ -d "$task_candidate/source/.git" ] || { echo 'Prepared source missing' >&2; exit 1; }
(cd "$task_root/deployment/$task_service" && sha256sum -c inputs.sha256 >/dev/null)
git -C "$task_candidate/source" apply --reverse --check "$task_root/deployment/$task_service/upstream.patch"
case "$task_service" in
    wikimore)
        [ -f "$task_candidate/leaflet/LICENSE" ] || { echo 'Leaflet license missing' >&2; exit 1; }
        set -- -C "$task_candidate" source leaflet -C "$task_root" "deployment/$task_service" deployment/reference-readers
        ;;
    *) set -- -C "$task_candidate" source -C "$task_root" "deployment/$task_service" deployment/reference-readers ;;
esac
task_temp="$task_target.tmp.$$"
trap 'rm -f "$task_temp"' EXIT HUP INT TERM
tar --sort=name --mtime='UTC 2026-11-24' --owner=0 --group=0 --numeric-owner \
    --exclude=.git --exclude='*.egg-info' --exclude=__pycache__ --exclude='*.pyc' \
    -czf "$task_temp" "$@"
tar -tzf "$task_temp" >/dev/null
mv -f "$task_temp" "$task_target"
trap - EXIT HUP INT TERM
sha256sum "$task_target"
