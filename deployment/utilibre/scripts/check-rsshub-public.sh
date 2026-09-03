#!/bin/sh
set -eu

base_url=${RSSHUB_PUBLIC_BASE_URL:-https://feeds.utilibre.org}
feed_path=${RSSHUB_PUBLIC_TEST_PATH:-/github/issue/microsoft/vscode/open?limit=2}
connect_timeout=${RSSHUB_PUBLIC_CONNECT_TIMEOUT:-10}
request_timeout=${RSSHUB_PUBLIC_REQUEST_TIMEOUT:-60}

case "$base_url" in
  https://*) ;;
  *)
    printf '%s\n' 'FAIL: RSSHUB_PUBLIC_BASE_URL must use HTTPS' >&2
    exit 1
    ;;
esac

case "$feed_path" in
  /*) ;;
  *)
    printf '%s\n' 'FAIL: RSSHUB_PUBLIC_TEST_PATH must begin with /' >&2
    exit 1
    ;;
esac

check_dir=$(mktemp -d)
trap 'rm -rf "$check_dir"' EXIT HUP INT TERM
feed_file=$check_dir/feed.xml
expected_self=${base_url%/}${feed_path}

curl -fsS --compressed \
  --connect-timeout "$connect_timeout" \
  --max-time "$request_timeout" \
  --output "$feed_file" \
  "$expected_self"

if ! grep -Fq '<item>' "$feed_file"; then
  printf '%s\n' 'FAIL: RSSHub test route returned no feed items' >&2
  exit 1
fi

if ! grep -Fq "<atom:link href=\"$expected_self\"" "$feed_file"; then
  printf 'FAIL: RSSHub feed self-link is not the public HTTPS request URL: %s\n' "$expected_self" >&2
  exit 1
fi

printf 'RSSHub public feed and HTTPS self-link: PASS (%s)\n' "$expected_self"
