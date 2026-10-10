#!/bin/sh
set -eu
# Scoped to this new stack only. No existing INPUT/SSH or other stack policy changes.
chain=UTILIBRE-SPLIIT
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.110.10 -d 172.29.110.20 -p tcp --dport 5432 -j RETURN
iptables -w -A "$chain" -s 172.29.110.30 -d 172.29.110.10 -p tcp --dport 3000 -j RETURN
iptables -w -A "$chain" -s 172.29.110.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.111.0/24 -j DROP
iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3190 -j RETURN
iptables -w -A "$chain" -i eth0 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3190 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.110.0/24 172.29.111.0/24; do
  iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
