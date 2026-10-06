#!/bin/sh
# Only these new application IPs; no unrelated host traffic is changed.
set -eu
chain=UTILIBRE-ADDITIONS-OUT
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for network in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -w -A "$chain" -d "$network" -j DROP
done
iptables -w -A "$chain" -p tcp -m multiport --dports 80,443 -j RETURN
iptables -w -A "$chain" -j DROP
for address in 172.29.74.10 172.29.75.10 172.29.76.10 172.29.77.10 172.29.78.10 172.29.79.10 172.29.80.10 172.29.81.10 172.29.82.10 172.29.85.10; do
  iptables -w -C DOCKER-USER -s "$address" -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s "$address" -j "$chain"
  iptables -w -C INPUT -s "$address" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$address" -m conntrack --ctstate NEW -j DROP
done
