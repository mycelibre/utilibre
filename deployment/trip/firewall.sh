#!/bin/sh
set -eu
chain=UTILIBRE-TRIP
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
# Only the established Caddy edge may enter the LAN-published gateway.
iptables -w -A "$chain" -s 10.10.1.3 -d 172.29.153.30 -p tcp --dport 8080 -j RETURN
iptables -w -A "$chain" -d 172.29.153.30 -p tcp --dport 8080 -j DROP
iptables -w -A "$chain" -d 172.29.152.30 -p tcp --dport 8080 -j DROP
iptables -w -A "$chain" -s 172.29.152.30 -d 172.29.152.10 -p tcp --dport 8000 -j RETURN
iptables -w -A "$chain" -s 172.29.152.10 -d 172.29.152.20 -p tcp --dport 3128 -j RETURN
for source in 172.29.152.20 172.29.153.20; do
 for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3; do
  iptables -w -A "$chain" -s "$source" -d "$range" -j DROP
 done
 for resolver in 1.1.1.1 9.9.9.9; do
  iptables -w -A "$chain" -s "$source" -d "$resolver" -p udp --dport 53 -j RETURN
  iptables -w -A "$chain" -s "$source" -d "$resolver" -p tcp --dport 53 -j RETURN
 done
 iptables -w -A "$chain" -s "$source" -p tcp -m multiport --dports 80,443 -j RETURN
done
iptables -w -A "$chain" -s 172.29.152.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.153.0/24 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.152.0/24 172.29.153.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
