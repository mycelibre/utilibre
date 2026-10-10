#!/bin/sh
set -eu
chain=UTILIBRE-CHESS
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 10.10.1.3 -d 172.29.147.30 -p tcp --dport 8080 -j RETURN
iptables -w -A "$chain" -s 172.29.142.30 -d 172.29.142.10 -p tcp --dport 8000 -j RETURN
iptables -w -A "$chain" -d 172.29.147.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.147.0/24 -j DROP
iptables -w -A "$chain" -d 172.29.142.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.142.0/24 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
iptables -w -C INPUT -s 172.29.142.0/24 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.142.0/24 -m conntrack --ctstate NEW -j DROP
iptables -w -C INPUT -s 172.29.147.0/24 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.147.0/24 -m conntrack --ctstate NEW -j DROP
