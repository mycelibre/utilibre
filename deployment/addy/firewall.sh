#!/bin/sh
set -eu
chain=UTILIBRE-ADDY
# Docker's local OUTPUT/userland-proxy paths do not traverse DOCKER-USER.
# These permanent port-specific rules also close local access during startup.
iptables -w -C INPUT -d 10.10.1.43 -p tcp --dport 2527 ! -s 10.10.1.20 -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I INPUT 1 -d 10.10.1.43 -p tcp --dport 2527 ! -s 10.10.1.20 -j REJECT --reject-with tcp-reset
iptables -w -C INPUT -d 10.10.1.43 -p tcp --dport 3211 ! -s 10.10.1.3 -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I INPUT 1 -d 10.10.1.43 -p tcp --dport 3211 ! -s 10.10.1.3 -j REJECT --reject-with tcp-reset
for destination in 10.10.1.43:2527 127.0.0.1:2527 172.29.133.10:25 172.29.134.10:25; do
 address=${destination%:*}; port=${destination##*:}
 iptables -w -C OUTPUT -d "$address" -p tcp --dport "$port" -j REJECT --reject-with tcp-reset 2>/dev/null || iptables -w -I OUTPUT 1 -d "$address" -p tcp --dport "$port" -j REJECT --reject-with tcp-reset
done
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
# Public/private SMTP ingress is denied until the namespace boundary is installed.
for destination in 172.29.133.10 172.29.134.10; do
 if [ "${MAIL_INGRESS_READY:-0}" = 1 ]; then
  iptables -w -A "$chain" -i eth0 -s 10.10.1.20 -d "$destination" -p tcp --dport 25 -j RETURN
 fi
 iptables -w -A "$chain" -d "$destination" -p tcp --dport 25 -j REJECT --reject-with tcp-reset
done
for destination in 172.29.133.50 172.29.134.50; do
 iptables -w -A "$chain" -i eth0 -s 10.10.1.3 -d "$destination" -p tcp --dport 8080 -j RETURN
 iptables -w -A "$chain" -d "$destination" -p tcp --dport 8080 -j REJECT --reject-with tcp-reset
done
iptables -w -A "$chain" -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
iptables -w -A "$chain" -s 172.29.133.50 -d 172.29.133.10 -p tcp --dport 8000 -j RETURN
iptables -w -A "$chain" -s 172.29.133.0/24 -d 172.29.133.20 -p tcp --dport 3306 -j RETURN
iptables -w -A "$chain" -s 172.29.133.10 -d 172.29.133.21 -p tcp --dport 6379 -j RETURN
# Only the app may use the authorized relay; no arbitrary SMTP egress.
for source in 172.29.133.10 172.29.134.10; do
 iptables -w -A "$chain" -s "$source" -d 10.10.1.20 -p tcp --dport 26 -j RETURN
done
iptables -w -A "$chain" -s 172.29.133.0/24 -j DROP
iptables -w -A "$chain" -s 172.29.134.0/24 -j DROP
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -j "$chain"
for subnet in 172.29.133.0/24 172.29.134.0/24; do
 iptables -w -C INPUT -s "$subnet" -m conntrack --ctstate NEW -j DROP 2>/dev/null || iptables -w -I INPUT 1 -s "$subnet" -m conntrack --ctstate NEW -j DROP
done
