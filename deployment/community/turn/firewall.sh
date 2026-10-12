#!/bin/sh
set -eu
# This option uses UID 4005 exclusively. Install before starting the relay.
# Do not flush host rules or alter Galene's chains. No packet logging.
chain=UTILIBRE-PAIRDROP-TURN
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -d 10.10.1.43 -p udp --dport 3479 -j RETURN
# Coturn-to-coturn traffic stays on this VM, only inside its allocated range.
# This exception does not permit LAN peers or access to Galene/host services.
iptables -w -A "$chain" -d 10.10.1.43 -p udp --sport 49700:49731 --dport 49700:49731 -j RETURN
# Deny metadata, internal networks, special-use addresses and the public host.
public_ip=$(/usr/bin/python3 -c 'import ipaddress,json; print(ipaddress.IPv4Address(json.load(open("/opt/utilibre/turn/settings.json"))["publicIp"]))')
for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3 "$public_ip"; do
  iptables -w -A "$chain" -d "$range" -j DROP
done
# Only UDP relay sockets may start public peer traffic. No DNS/HTTP/SMTP egress,
# privileged destination ports or TCP peer relaying. Native coturn quotas apply.
iptables -w -A "$chain" -p udp --sport 49700:49731 --dport 1024:65535 -j RETURN
iptables -w -A "$chain" -j DROP
iptables -w -C OUTPUT -m owner --uid-owner 4005 -j "$chain" 2>/dev/null || iptables -w -I OUTPUT 1 -m owner --uid-owner 4005 -j "$chain"
ip6tables -w -C OUTPUT -m owner --uid-owner 4005 -j DROP 2>/dev/null || ip6tables -w -I OUTPUT 1 -m owner --uid-owner 4005 -j DROP
