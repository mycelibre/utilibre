#!/bin/sh
set -eu
chain=UTILIBRE-SIMPLELOGIN
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.135.50 -d 172.29.135.10 -p tcp --dport 7777 -j RETURN
iptables -w -A "$chain" -s 172.29.135.0/24 -d 172.29.135.20 -p tcp --dport 5432 -j RETURN
# Only native web/SMTP/job workers may use the authorized relay.
for source in 172.29.135.10 172.29.135.11 172.29.135.12 172.29.136.10 172.29.136.11 172.29.136.12; do
 iptables -w -A "$chain" -s "$source" -d 10.10.1.20 -p tcp --dport 26 -j RETURN
done
iptables -w -A "$chain" -s 172.29.135.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.136.0/24 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.135.0/24 172.29.136.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
