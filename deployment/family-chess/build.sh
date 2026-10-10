#!/bin/sh
set -eu
cd /home/ubuntu/freetools
# Build-time polib1.2.0 writes native gettext catalogs; it is not in the runtime.
/opt/utilibre/family-chess-build-venv/bin/python deployment/family-chess/prepare.py
DOCKER_BUILDKIT=0 docker build --memory=1g --cpuset-cpus=0,1 -t utilibre-family-chess:f6e5093-p1 -f deployment/family-chess/Dockerfile /opt/utilibre/build-family-chess
