#!/bin/sh
# Read-only host APT configuration: authenticated package indices are isolated.
set -eu
TASK=/var/lib/utilibre-maintenance/closure-followup-20261012
cd "$TASK/sources"
apt-get -o Dir::Etc::sourcelist=/home/ubuntu/freetools/deployment/maintenance/closure-followup/review.sources \
 -o Dir::Etc::sourceparts=- -o Dir::State::lists="$TASK/apt-lists" download \
 libpython3.13-minimal=3.13.5-2+deb13u5 libpython3.13-stdlib=3.13.5-2+deb13u5 \
 python3.13-minimal=3.13.5-2+deb13u5 python3.13=3.13.5-2+deb13u5 \
 python3.13-venv=3.13.5-2+deb13u5
