#!/bin/sh
# Operator runs interactively. Never paste the Storage Box password into chat.
set -eu
umask 077
base=/opt/utilibre/storagebox/private
if [ "$(id -u)" != 0 ] || [ ! -s "$base/id_ed25519.pub" ]; then
    echo 'Run prepare.mjs first, then run this script with sudo.' >&2
    exit 1
fi
printf '%s\n' \
    'Check the SSH fingerprint in your Hetzner Storage Box overview.' \
    'Accept the SSH prompt ONLY if that fingerprint matches.' \
    'Enter the Storage Box password at the SSH prompt, not in chat.' \
    'This adds one public key without replacing existing authorized keys.'
ssh -F "$base/ssh_config" \
    -o BatchMode=no -o PasswordAuthentication=yes -o KbdInteractiveAuthentication=yes \
    -o PubkeyAuthentication=no -o StrictHostKeyChecking=ask \
    utilibre-storagebox install-ssh-key < "$base/id_ed25519.pub"
ssh -F "$base/ssh_config" utilibre-storagebox pwd
printf '%s\n' 'Key-based SSH access verified. No repository initialized or backup uploaded yet.'
