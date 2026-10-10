#!/bin/sh
set -eu
# Host-network relay UID is unique. Reply traffic goes to its clients; new peer
# traffic may reach only Galene's dedicated UDP sockets, never other services.
chain=UTILIBRE-GALENE-TURN
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -d 10.10.1.43 -p udp --dport 3478 -j RETURN
iptables -w -A "$chain" -d 172.29.99.10 -p udp --sport 49160:49671 --dport 47800:48311 -j RETURN
iptables -w -A "$chain" -j DROP
iptables -w -C OUTPUT -m owner --uid-owner 4004 -j "$chain" 2>/dev/null || iptables -w -I OUTPUT 1 -m owner --uid-owner 4004 -j "$chain"
# Galene and coturn share a public NAT address. Route Galene's packets for the
# advertised relay range locally instead of depending on router hairpin support.
public_ip=$(python3 -c 'import ipaddress,json; print(ipaddress.IPv4Address(json.load(open("/opt/utilibre/pack-data/galene-turn/settings.json"))["publicIp"]))')
loop=UTILIBRE-GALENE-LOOP
iptables -w -t nat -S "$loop" >/dev/null 2>&1 || iptables -w -t nat -N "$loop"
iptables -w -t nat -F "$loop"
iptables -w -t nat -A "$loop" -s 172.29.99.10 -d "$public_ip" -p udp --sport 47800:48311 --dport 49160:49671 -j DNAT --to-destination 10.10.1.43
iptables -w -t nat -C PREROUTING -j "$loop" 2>/dev/null || iptables -w -t nat -I PREROUTING 1 -j "$loop"
# Present the same public relay address in both ICE directions. Otherwise a
# private-source relay packet and a public-destination SFU packet create competing
# conntrack tuples, remap ports, and repeatedly break consent checks.
source=UTILIBRE-GALENE-SNAT
iptables -w -t nat -S "$source" >/dev/null 2>&1 || iptables -w -t nat -N "$source"
iptables -w -t nat -F "$source"
iptables -w -t nat -A "$source" -s 10.10.1.43 -d 172.29.99.10 -p udp --sport 49160:49671 --dport 47800:48311 -j SNAT --to-source "$public_ip"
iptables -w -t nat -C POSTROUTING -j "$source" 2>/dev/null || iptables -w -t nat -I POSTROUTING 1 -j "$source"
iptables -w -C INPUT -s 172.29.99.10 -d 10.10.1.43 -p udp --sport 47800:48311 --dport 49160:49671 -j ACCEPT 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.99.10 -d 10.10.1.43 -p udp --sport 47800:48311 --dport 49160:49671 -j ACCEPT
# Native server-side ICE also contacts the authenticated TURN listeners. Resolve
# the relay locally in compose.galene.yaml and admit only these two endpoints.
# Keep other host/LAN access blocked and leave TURN's allowed-peer list intact.
iptables -w -C INPUT -s 172.29.99.10 -d 10.10.1.43 -p udp --dport 3478 -j ACCEPT 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.99.10 -d 10.10.1.43 -p udp --dport 3478 -j ACCEPT
iptables -w -C INPUT -s 172.29.99.10 -d 10.10.1.43 -p tcp --dport 5349 -j ACCEPT 2>/dev/null || iptables -w -I INPUT 1 -s 172.29.99.10 -d 10.10.1.43 -p tcp --dport 5349 -j ACCEPT
# Extra allocation capacity is private: only the local SFU is an allowed peer.
iptables -w -C INPUT -i eth0 -p udp --dport 49192:49671 -j DROP 2>/dev/null || iptables -w -I INPUT 1 -i eth0 -p udp --dport 49192:49671 -j DROP
