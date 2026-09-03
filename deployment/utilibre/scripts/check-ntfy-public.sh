#!/bin/sh

# Exercise the public ntfy API through Cloudflare without retaining the test
# message or forwarding it to Firebase. This is intentionally separate from
# healthcheck.sh: it changes public state briefly by opening subscriptions and
# publishing one ephemeral message.

set -eu

LC_ALL=C
export LC_ALL

public_base=${NTFY_PUBLIC_BASE_URL:-https://notify.utilibre.org}
connect_timeout=${NTFY_PUBLIC_CONNECT_TIMEOUT:-10}
request_timeout=${NTFY_PUBLIC_REQUEST_TIMEOUT:-20}
stream_timeout=${NTFY_PUBLIC_STREAM_TIMEOUT:-30}
ready_timeout=${NTFY_PUBLIC_READY_TIMEOUT:-12}

fail() {
  printf 'ntfy public check: FAIL: %s\n' "$*" >&2
  exit 1
}

case "$public_base" in
  https://*) ;;
  http://127.0.0.1:*|http://localhost:*) ;;
  *) fail 'NTFY_PUBLIC_BASE_URL must use HTTPS (except loopback test servers)' ;;
esac

public_base=${public_base%/}

for timeout_value in \
  "$connect_timeout" "$request_timeout" "$stream_timeout" "$ready_timeout"
do
  case "$timeout_value" in
    ''|*[!0-9]*|0) fail 'timeouts must be positive whole seconds' ;;
  esac
done

command -v curl >/dev/null 2>&1 || fail 'curl is required'

tmp_dir=$(mktemp -d "${TMPDIR:-/tmp}/utilibre-ntfy-public.XXXXXX") ||
  fail 'could not create a private temporary directory'
subscriber_pids=

cleanup() {
  for subscriber_pid in $subscriber_pids; do
    kill "$subscriber_pid" >/dev/null 2>&1 || true
    wait "$subscriber_pid" >/dev/null 2>&1 || true
  done
  subscriber_pids=
  if [ -n "${tmp_dir:-}" ] && [ -d "$tmp_dir" ]; then
    rm -rf "$tmp_dir"
  fi
}

trap cleanup 0
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

random_hex() {
  random_bytes=$1
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$random_bytes"
    return
  fi
  if [ -r /dev/urandom ] && command -v od >/dev/null 2>&1; then
    od -An -N "$random_bytes" -tx1 /dev/urandom | tr -d ' \n'
    return
  fi
  fail 'openssl, or /dev/urandom with od, is required for an unguessable topic'
}

topic_suffix=$(random_hex 24)
message_suffix=$(random_hex 16)
case "$topic_suffix" in
  *[!0123456789abcdef]*|'') fail 'secure topic generation failed' ;;
esac
case "$message_suffix" in
  *[!0123456789abcdef]*|'') fail 'secure message marker generation failed' ;;
esac
[ "${#topic_suffix}" -eq 48 ] || fail 'secure topic generation returned the wrong length'
[ "${#message_suffix}" -eq 32 ] || fail 'secure message marker generation returned the wrong length'

topic="utilibre-check-$topic_suffix"
message="utilibre-public-check-$message_suffix"

final_status() {
  awk '/^HTTP\// { status=$2 } END { print status }' "$1"
}

final_header_has() {
  wanted_header=$1
  header_file=$2
  awk -v wanted="$wanted_header" '
    /^HTTP\// {
      in_response = 1
      found = 0
      next
    }
    in_response {
      line = $0
      sub(/\r$/, "", line)
      name = line
      sub(/:.*/, "", name)
      if (tolower(name) == tolower(wanted)) {
        found = 1
      }
    }
    END { exit found ? 0 : 1 }
  ' "$header_file"
}

final_content_type_is() {
  expected_type=$1
  header_file=$2
  awk -v expected="$expected_type" '
    /^HTTP\// {
      in_response = 1
      matched = 0
      next
    }
    in_response {
      line = $0
      sub(/\r$/, "", line)
      lower = tolower(line)
      prefix = "content-type:"
      if (index(lower, prefix) == 1) {
        value = substr(lower, length(prefix) + 1)
        sub(/^[[:space:]]*/, "", value)
        sub(/[[:space:]]*;.*/, "", value)
        if (value == tolower(expected)) {
          matched = 1
        }
      }
    }
    END { exit matched ? 0 : 1 }
  ' "$header_file"
}

assert_accepted_response() {
  response_label=$1
  header_file=$2
  status=$(final_status "$header_file")

  if final_header_has cf-mitigated "$header_file"; then
    fail "$response_label was replaced by a Cloudflare managed challenge"
  fi

  case "$status" in
    2??) ;;
    '') fail "$response_label returned no HTTP status" ;;
    *) fail "$response_label returned HTTP $status (expected 2xx)" ;;
  esac

  if final_header_has NEL "$header_file"; then
    fail "$response_label returned the forbidden NEL response header"
  fi
  if final_header_has Report-To "$header_file"; then
    fail "$response_label returned the forbidden Report-To response header"
  fi
}

run_request() {
  request_label=$1
  header_file=$2
  body_file=$3
  error_file=$4
  shift 4

  if ! curl \
    --silent \
    --show-error \
    --connect-timeout "$connect_timeout" \
    --max-time "$request_timeout" \
    --dump-header "$header_file" \
    --output "$body_file" \
    "$@" \
    2>"$error_file"
  then
    fail "$request_label failed at the HTTP transport layer"
  fi
  assert_accepted_response "$request_label" "$header_file"
}

health_headers="$tmp_dir/health.headers"
health_body="$tmp_dir/health.body"
health_errors="$tmp_dir/health.errors"
run_request \
  'GET /v1/health' \
  "$health_headers" "$health_body" "$health_errors" \
  "$public_base/v1/health"

final_content_type_is application/json "$health_headers" ||
  fail 'GET /v1/health did not return application/json'
health_json=$(tr -d '[:space:]' <"$health_body")
[ "$health_json" = '{"healthy":true}' ] ||
  fail 'GET /v1/health did not return the expected healthy JSON object'
printf '%s\n' 'ntfy public check: health JSON and public response headers OK'

json_headers="$tmp_dir/json-stream.headers"
json_body="$tmp_dir/json-stream.body"
json_errors="$tmp_dir/json-stream.errors"
sse_headers="$tmp_dir/sse-stream.headers"
sse_body="$tmp_dir/sse-stream.body"
sse_errors="$tmp_dir/sse-stream.errors"

curl \
  --silent \
  --show-error \
  --no-buffer \
  --connect-timeout "$connect_timeout" \
  --max-time "$stream_timeout" \
  --dump-header "$json_headers" \
  --output "$json_body" \
  "$public_base/$topic/json" \
  2>"$json_errors" &
json_pid=$!
subscriber_pids="$json_pid"

curl \
  --silent \
  --show-error \
  --no-buffer \
  --connect-timeout "$connect_timeout" \
  --max-time "$stream_timeout" \
  --dump-header "$sse_headers" \
  --output "$sse_body" \
  "$public_base/$topic/sse" \
  2>"$sse_errors" &
sse_pid=$!
subscriber_pids="$subscriber_pids $sse_pid"

wait_for_status() {
  wait_header_file=$1
  wait_pid=$2
  wait_label=$3
  waited=0
  while [ "$waited" -lt "$ready_timeout" ]; do
    if [ -s "$wait_header_file" ] && [ -n "$(final_status "$wait_header_file")" ]; then
      return
    fi
    if ! kill -0 "$wait_pid" >/dev/null 2>&1; then
      fail "$wait_label ended before returning response headers"
    fi
    sleep 1
    waited=$((waited + 1))
  done
  fail "$wait_label did not return response headers within ${ready_timeout}s"
}

wait_for_pattern() {
  wait_body_file=$1
  wait_pattern=$2
  wait_pid=$3
  wait_label=$4
  waited=0
  while [ "$waited" -lt "$ready_timeout" ]; do
    if [ -s "$wait_body_file" ] && grep -Eq "$wait_pattern" "$wait_body_file"; then
      return
    fi
    if ! kill -0 "$wait_pid" >/dev/null 2>&1; then
      fail "$wait_label ended before becoming ready"
    fi
    sleep 1
    waited=$((waited + 1))
  done
  fail "$wait_label did not become ready within ${ready_timeout}s"
}

wait_for_status "$json_headers" "$json_pid" 'JSON subscription'
assert_accepted_response 'JSON subscription' "$json_headers"
final_content_type_is application/x-ndjson "$json_headers" ||
  fail 'JSON subscription did not return application/x-ndjson'

wait_for_status "$sse_headers" "$sse_pid" 'SSE subscription'
assert_accepted_response 'SSE subscription' "$sse_headers"
final_content_type_is text/event-stream "$sse_headers" ||
  fail 'SSE subscription did not return text/event-stream'

wait_for_pattern \
  "$json_body" '"event"[[:space:]]*:[[:space:]]*"open"' \
  "$json_pid" 'JSON subscription'
wait_for_pattern \
  "$sse_body" '^event:[[:space:]]*open' \
  "$sse_pid" 'SSE subscription'
printf '%s\n' 'ntfy public check: live JSON and SSE subscriptions OK'

publish_headers="$tmp_dir/publish.headers"
publish_body="$tmp_dir/publish.body"
publish_errors="$tmp_dir/publish.errors"
run_request \
  'no-cache publish' \
  "$publish_headers" "$publish_body" "$publish_errors" \
  --request POST \
  --header 'Content-Type: text/plain; charset=utf-8' \
  --header 'Cache: no' \
  --header 'Firebase: no' \
  --data-binary "$message" \
  "$public_base/$topic"

final_content_type_is application/json "$publish_headers" ||
  fail 'publish did not return application/json'
grep -Eq '"event"[[:space:]]*:[[:space:]]*"message"' "$publish_body" ||
  fail 'publish response did not contain a message event'
grep -Fq "\"topic\":\"$topic\"" "$publish_body" ||
  fail 'publish response did not identify the ephemeral topic'
grep -Fq "\"message\":\"$message\"" "$publish_body" ||
  fail 'publish response did not identify the ephemeral message'
if grep -Eq '"expires"[[:space:]]*:' "$publish_body"; then
  fail 'publish response contained expires despite Cache: no'
fi

wait_for_pattern "$json_body" "$message" "$json_pid" 'JSON subscription'
wait_for_pattern "$sse_body" "$message" "$sse_pid" 'SSE subscription'
grep -Eq '"event"[[:space:]]*:[[:space:]]*"message"' "$json_body" ||
  fail 'JSON subscription did not receive a message event'
grep -Fq "\"message\":\"$message\"" "$json_body" ||
  fail 'JSON subscription did not receive the exact ephemeral message'
grep -Fq "\"message\":\"$message\"" "$sse_body" ||
  fail 'SSE subscription did not receive the exact ephemeral message'

for subscriber_pid in $subscriber_pids; do
  kill "$subscriber_pid" >/dev/null 2>&1 || true
  wait "$subscriber_pid" >/dev/null 2>&1 || true
done
subscriber_pids=
printf '%s\n' 'ntfy public check: no-cache/no-Firebase live delivery OK'

replay_headers="$tmp_dir/replay.headers"
replay_body="$tmp_dir/replay.body"
replay_errors="$tmp_dir/replay.errors"
run_request \
  'cache replay check' \
  "$replay_headers" "$replay_body" "$replay_errors" \
  "$public_base/$topic/json?poll=1&since=all"
final_content_type_is application/x-ndjson "$replay_headers" ||
  fail 'cache replay check did not return application/x-ndjson'
if grep -Fq "$message" "$replay_body" ||
  grep -Eq '"event"[[:space:]]*:[[:space:]]*"message"' "$replay_body"
then
  fail 'Cache: no regression: the ephemeral message was replayed from cache'
fi

printf '%s\n' 'ntfy public check: PASS (no cached test content remains)'
