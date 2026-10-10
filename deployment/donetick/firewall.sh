#!/bin/sh
set -eu
chain=UTILIBRE-DONETICK
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.144.10 -d 10.10.1.3 -p tcp --dport 443 -j RETURN
iptables -w -A "$chain" -s 172.29.143.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.144.0/24 -j DROP
iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3215 -j RETURN
iptables -w -A "$chain" -i eth0 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3215 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.143.0/24 172.29.144.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
