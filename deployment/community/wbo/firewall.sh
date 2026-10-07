#!/bin/sh
# Scope only this pilot's listener and fixed container addresses.
set -eu
chain=UTILIBRE-WBO
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3169 -j RETURN
iptables -w -A "$chain" -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3169 -j DROP
iptables -w -A "$chain" -s 172.29.95.20 -d 172.29.95.10 -p tcp --dport 8080 -j RETURN
for address in 172.29.94.10 172.29.95.10 172.29.95.20; do
  iptables -w -A "$chain" -s "$address" -j DROP
  iptables -w -C INPUT -s "$address" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$address" -m conntrack --ctstate NEW -j DROP
done
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
