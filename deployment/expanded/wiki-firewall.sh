#!/bin/sh
# Apply only to the pinned BreezeWiki container IP; redirects and DNS
# rebinding must not open a route into the host or private network.
set -eu
chain=UTILIBRE-WIKI-OUT
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for network in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -w -A "$chain" -d "$network" -j DROP
done
iptables -w -A "$chain" -p tcp -m multiport --dports 80,443 -j RETURN
iptables -w -A "$chain" -j DROP
iptables -w -C DOCKER-USER -s 172.29.71.10 -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s 172.29.71.10 -j "$chain"
iptables -w -C INPUT -s 172.29.71.10 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.71.10 -m conntrack --ctstate NEW -j DROP
