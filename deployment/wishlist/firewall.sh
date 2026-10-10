#!/bin/sh
set -eu
chain=UTILIBRE-WISHLIST
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.130.20 -d 172.29.130.10 -p tcp --dport 3280 -j RETURN
# The only application egress is the existing identity host at the separate edge.
iptables -w -A "$chain" -s 172.29.130.10 -d 10.10.1.3 -p tcp --dport 443 -j RETURN
iptables -w -A "$chain" -s 172.29.130.0/24 -j DROP
iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3193 -j RETURN
iptables -w -A "$chain" -i eth0 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3193 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
iptables -w -C INPUT -s 172.29.130.0/24 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.130.0/24 -m conntrack --ctstate NEW -j DROP
