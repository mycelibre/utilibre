#!/bin/sh
# Narrow additions to the existing Docker boundary; no unrelated rules touched.
set -eu
chain=UTILIBRE-RECORDS
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
# Gateway -> native apps / authentication; authentication -> Grist.
for pair in '30 11 4180' '30 12 4258' '30 13 3000' '11 10 8484' '13 14 5432' '13 20 3128'; do
 set -- $pair
 iptables -w -A "$chain" -s "172.29.158.$1" -d "172.29.158.$2" -p tcp --dport "$3" -j RETURN
done
for addr in 11 12; do
 iptables -w -A "$chain" -s "172.29.159.$addr" -d 10.10.1.3 -p tcp --dport 443 -j RETURN
done
for addr in 12 13; do
 iptables -w -A "$chain" -s "172.29.159.$addr" -d 10.10.1.20 -p tcp --dport 26 -j RETURN
done
# Only the domain-restricted egress proxy can connect to public HTTPS.
for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3; do
 iptables -w -A "$chain" -s 172.29.159.20 -d "$range" -j DROP
done
for dns in 1.1.1.1 9.9.9.9; do
 iptables -w -A "$chain" -s 172.29.159.20 -d "$dns" -p udp --dport 53 -j RETURN
 iptables -w -A "$chain" -s 172.29.159.20 -d "$dns" -p tcp --dport 53 -j RETURN
done
iptables -w -A "$chain" -s 172.29.159.20 -p tcp --dport 443 -j RETURN
iptables -w -A "$chain" -s 172.29.158.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.159.0/24 -j DROP
for port in 3227 3228 3229; do
 iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j RETURN
 iptables -w -A "$chain" -i eth0 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j DROP
done
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.158.0/24 172.29.159.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
