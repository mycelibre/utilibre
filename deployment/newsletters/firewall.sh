#!/bin/sh
set -eu
chain=UTILIBRE-NEWSLETTERS
# Caddy alone may reach the existing web/gateway namespace. Keep the native
# worker running: Docker's loopback publication remains unchanged below.
iptables -w -C INPUT -d 10.10.1.43 -p tcp --dport 3210 ! -s 10.10.1.3 -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I INPUT 1 -d 10.10.1.43 -p tcp --dport 3210 ! -s 10.10.1.3 -j REJECT --reject-with tcp-reset
# Docker's local OUTPUT/userland-proxy paths do not traverse DOCKER-USER.
# These permanent port-specific rules also close local access during startup.
iptables -w -C INPUT -d 10.10.1.43 -p tcp --dport 2526 ! -s 10.10.1.20 -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I INPUT 1 -d 10.10.1.43 -p tcp --dport 2526 ! -s 10.10.1.20 -j REJECT --reject-with tcp-reset
for destination in 10.10.1.43:2526 127.0.0.1:2526 172.29.132.20:25 172.29.140.20:25; do
 address=${destination%:*}; port=${destination##*:}
 iptables -w -C OUTPUT -d "$address" -p tcp --dport "$port" -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I OUTPUT 1 -d "$address" -p tcp --dport "$port" -j REJECT --reject-with tcp-reset
done
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
for destination in 172.29.132.10 172.29.140.10; do
 iptables -w -A "$chain" -i eth0 -s 10.10.1.3 -d "$destination" -p tcp --dport 8080 -j RETURN
 iptables -w -A "$chain" -d "$destination" -p tcp --dport 8080 -j REJECT --reject-with tcp-reset
done
# Public/private SMTP ingress is denied until the namespace boundary is installed.
for destination in 172.29.132.20 172.29.140.20; do
 if [ "${MAIL_INGRESS_READY:-0}" = 1 ]; then
  iptables -w -A "$chain" -i eth0 -s 10.10.1.20 -d "$destination" -p tcp --dport 25 -j RETURN
 fi
 iptables -w -A "$chain" -d "$destination" -p tcp --dport 25 -j REJECT --reject-with tcp-reset
done
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.132.50 -d 172.29.132.10 -p tcp --dport 18000 -j RETURN
iptables -w -A "$chain" -s 172.29.132.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.140.0/24 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
# Scope NAT to the edge source and LAN interface; no new listening process or
# app recreation is needed. Fixed addresses are declared in compose.yaml.
iptables -w -t nat -C PREROUTING -i eth0 -s 10.10.1.3 -d 10.10.1.43 -p tcp --dport 3210 -j DNAT --to-destination 172.29.140.10:8080 2>/dev/null || iptables -w -t nat -I PREROUTING 1 -i eth0 -s 10.10.1.3 -d 10.10.1.43 -p tcp --dport 3210 -j DNAT --to-destination 172.29.140.10:8080
for subnet in 172.29.132.0/24 172.29.140.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
