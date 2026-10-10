#!/bin/sh
set -eu
src=/opt/utilibre/community-src/addy-docker
# Docker recipe revision ec7934b4835518fe6a520dedf7ce97464cacd7cd.
# App v1.7.3 is commit150983e3331e80bb72b619984dc5e3f5390ddb93.
test "$(git -C "$src" rev-parse HEAD)" = ec7934b4835518fe6a520dedf7ce97464cacd7cd
docker build --build-arg ANONADDY_VERSION=1.7.3 -t utilibre-addy:1.7.3 "$src"
