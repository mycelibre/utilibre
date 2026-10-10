#!/bin/sh
# Own two small review/service subnets only; never flush the host firewall.
set -eu
chain=UTILIBRE-WALLABAG
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
# Only the established Caddy VM may use the private published listener.
iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3177 -j RETURN
iptables -w -A "$chain" -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport 3177 -j DROP
iptables -w -A "$chain" -s 172.29.155.4 -d 172.29.155.2 -p tcp --dport 8080 -j RETURN
iptables -w -A "$chain" -s 172.29.155.2 -d 172.29.155.3 -p tcp --dport 3128 -j RETURN
# Only native transactional mail may reach this one existing private relay.
for source in 172.29.155.2 172.29.154.2; do
    iptables -w -A "$chain" -s "$source" -d 10.10.1.20 -p tcp --dport 26 -j RETURN
done
# Graby's maintained SSRF validator resolves hosts before using the proxy.
# Permit that DNS, not direct article retrieval. HTTP(S) remains proxy-only.
for source in 172.29.155.2 172.29.154.2; do
    for resolver in 1.1.1.1 9.9.9.9; do
        iptables -w -A "$chain" -s "$source" -d "$resolver" -p udp --dport 53 -j RETURN
        iptables -w -A "$chain" -s "$source" -d "$resolver" -p tcp --dport 53 -j RETURN
    done
done
for source in 172.29.155.3 172.29.154.3; do
    for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3; do
        iptables -w -A "$chain" -s "$source" -d "$range" -j DROP
    done
    for resolver in 1.1.1.1 9.9.9.9; do
        iptables -w -A "$chain" -s "$source" -d "$resolver" -p udp --dport 53 -j RETURN
        iptables -w -A "$chain" -s "$source" -d "$resolver" -p tcp --dport 53 -j RETURN
    done
    iptables -w -A "$chain" -s "$source" -p tcp -m multiport --dports 80,443 -j RETURN
done
iptables -w -A "$chain" -s 172.29.155.0/28 -j DROP
iptables -w -A "$chain" -s 172.29.154.0/28 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.155.0/28 172.29.154.0/28; do
    iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
