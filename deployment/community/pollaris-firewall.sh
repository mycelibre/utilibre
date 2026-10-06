#!/bin/sh
# Only the Pollaris worker needs egress, exclusively to the configured SMTP relay.
set -eu
chain=UTILIBRE-POLLARIS-OUT
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -d 10.10.1.20 -p tcp --dport 26 -j RETURN
iptables -w -A "$chain" -j DROP
iptables -w -C DOCKER-USER -s 172.29.84.11 -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s 172.29.84.11 -j "$chain"
iptables -w -C INPUT -s 172.29.84.11 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.84.11 -m conntrack --ctstate NEW -j DROP
