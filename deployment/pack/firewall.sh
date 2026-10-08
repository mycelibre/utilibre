#!/bin/sh
# Only this pack's fixed static-service subnet; never change host/SSH policies.
set -eu
chain=UTILIBRE-PACK-STATIC
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.96.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.97.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.98.3 -d 172.29.98.2 -p tcp --dport 5432 -j RETURN
iptables -w -A "$chain" -s 172.29.98.3 -d 10.10.1.20 -p tcp --dport 26 -j RETURN
iptables -w -A "$chain" -s 172.29.98.4 -d 172.29.98.3 -p tcp --dport 5000 -j RETURN
iptables -w -A "$chain" -s 172.29.98.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.99.0/24 -j DROP
for port in 3172 3173 3176 3178; do
  iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j RETURN
  iptables -w -A "$chain" -i eth0 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j DROP
done
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
iptables -w -C INPUT -s 172.29.99.10 -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.99.10 -m conntrack --ctstate NEW -j DROP
# Host-network Galene stays a private pilot. Media is app-host test traffic
# only until a public UDP/NAT and bounded relay path has been verified.
pilot=UTILIBRE-PACK-MEET
iptables -w -S "$pilot" >/dev/null 2>&1 || iptables -w -N "$pilot"
iptables -w -F "$pilot"
iptables -w -A "$pilot" -s 10.10.1.3 -p tcp --dport 3178 -j ACCEPT
iptables -w -A "$pilot" -p tcp --dport 3178 -j DROP
iptables -w -A "$pilot" -p udp --dport 47800 -j DROP
iptables -w -A "$pilot" -j RETURN
iptables -w -C INPUT -i eth0 -j "$pilot" 2>/dev/null || iptables -w -I INPUT 1 -i eth0 -j "$pilot"
