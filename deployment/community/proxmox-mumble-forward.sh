#!/bin/sh
set -eu

# VM 144's native Mumble listener. Keep TCP control and UDP voice on the same
# DNS-only public port; do not route this protocol through the HTTP proxy.
for mumble_proto in tcp udp; do
    if ! iptables -w -t nat -C PREROUTING -i nic0 -d 49.12.84.228 -p "$mumble_proto" --dport 64738 -j DNAT --to-destination 10.10.1.43 2>/dev/null; then
        iptables -w -t nat -A PREROUTING -i nic0 -d 49.12.84.228 -p "$mumble_proto" --dport 64738 -j DNAT --to-destination 10.10.1.43
    fi
    if ! iptables -w -C FORWARD -i nic0 -o vmbr1 -d 10.10.1.43 -p "$mumble_proto" --dport 64738 -j ACCEPT 2>/dev/null; then
        iptables -w -I FORWARD 3 -i nic0 -o vmbr1 -d 10.10.1.43 -p "$mumble_proto" --dport 64738 -j ACCEPT
    fi
done
