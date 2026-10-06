#!/bin/sh
# Only these new application IPs; no unrelated host traffic is changed.
set -eu
chain=UTILIBRE-ADDITIONS-OUT
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.91.10 -d 172.29.91.30 -p tcp --dport 6379 -j RETURN
for network in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -w -A "$chain" -d "$network" -j DROP
done
iptables -w -A "$chain" -p tcp -m multiport --dports 80,443 -j RETURN
iptables -w -A "$chain" -j DROP
for address in 172.29.74.10 172.29.75.10 172.29.76.10 172.29.77.10 172.29.78.10 172.29.79.10 172.29.80.10 172.29.81.10 172.29.82.10 172.29.85.10 172.29.86.10 172.29.88.10 172.29.89.10 172.29.90.10 172.29.91.10; do
  iptables -w -C DOCKER-USER -s "$address" -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s "$address" -j "$chain"
  iptables -w -C INPUT -s "$address" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$address" -m conntrack --ctstate NEW -j DROP
done
# Static QR hosting and the local Mumble pilot need replies only, never new outbound connections.
static_chain=UTILIBRE-STATIC-OUT
iptables -w -S "$static_chain" >/dev/null 2>&1 || iptables -w -N "$static_chain"
iptables -w -F "$static_chain"
iptables -w -A "$static_chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$static_chain" -j DROP
for address in 172.29.92.10 172.29.93.10; do
  iptables -w -C DOCKER-USER -s "$address" -j "$static_chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s "$address" -j "$static_chain"
  iptables -w -C INPUT -s "$address" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$address" -m conntrack --ctstate NEW -j DROP
done
# Tor needs public relay TCP ports beyond 443, but no host/private-network access.
# .20 is reserved for the short-lived independent verification client.
tor_chain=UTILIBRE-TOR-OUT
iptables -w -S "$tor_chain" >/dev/null 2>&1 || iptables -w -N "$tor_chain"
iptables -w -F "$tor_chain"
iptables -w -A "$tor_chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for network in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.168.0.0/16 224.0.0.0/4 240.0.0.0/4; do
  iptables -w -A "$tor_chain" -d "$network" -j DROP
done
iptables -w -A "$tor_chain" -p tcp -j RETURN
iptables -w -A "$tor_chain" -j DROP
for address in 172.29.87.10 172.29.87.20; do
  iptables -w -C DOCKER-USER -s "$address" -j "$tor_chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -s "$address" -j "$tor_chain"
  iptables -w -C INPUT -s "$address" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$address" -m conntrack --ctstate NEW -j DROP
done
