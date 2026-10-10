#!/bin/sh
set -eu

# This single gateway owns the listener; Tor only connects to it. A host crash
# can leave the socket inode behind on the shared bind mount.
socket=/run/onion/http.sock
if [ -S "$socket" ]; then
  result=0
  curl --silent --output /dev/null --max-time 2 --unix-socket "$socket" http://localhost/ || result=$?
  if [ "$result" -ne 7 ]; then
    echo 'Onion socket may have a live listener; refusing to remove it.' >&2
    exit 1
  fi
  rm -- "$socket"
elif [ -e "$socket" ] || [ -L "$socket" ]; then
  echo 'Onion socket path is not a socket; refusing to remove it.' >&2
  exit 1
fi

exec nginx -g 'daemon off;'
