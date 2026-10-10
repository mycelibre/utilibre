#!/bin/sh
set -eu
# Run after the pinned image's native 14-config-rspamd init step, before services start.
# Native config only: no source patch, secrets, provider change or signing key.
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
config_dir=${RSPAMD_CONFIG_ROOT:-/etc/rspamd}
mkdir -p "$config_dir/override.d"
# No message classifier, stock content rules or message-history database.
printf '%s\n' '-- No stock content rules.' > "$config_dir/utilibre-auth-only.lua"
# Authentication-only scanning. No DNSBL, fuzzy, URL, AI, learning or reporting modules.
for file in "$config_dir"/modules.d/*.conf; do
  name=$(basename "$file" .conf)
  case "$name" in dkim|spf|dmarc|milter_headers|force_actions) continue;; esac
  printf 'enabled = false;\n' > "$config_dir/override.d/$name.conf"
done
cp "$source_dir"/override.d/* "$config_dir/override.d/"
# Avoid loading the stock content/regexp rule suite. Retain the image's native
# account blocklist callback when init14 has created it; its target is loopback.
native_blocklist="$config_dir/lua.local.d/addy_blocklist.lua"
if [ -f "$native_blocklist" ]; then
  printf 'lua = "%s";\n' "$native_blocklist" > "$config_dir/rspamd.conf.local.override"
else
  printf 'lua = "%s/utilibre-auth-only.lua";\n' "$config_dir" > "$config_dir/rspamd.conf.local.override"
fi
printf 'classifier = {};\n' >> "$config_dir/rspamd.conf.local.override"
rspamadm configtest -c "$config_dir/rspamd.conf"
