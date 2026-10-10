#!/bin/sh
set -eu
cd /home/ubuntu/freetools/deployment/newsletters
./firewall.sh
boundary=/run/utilibre-newsletters-smtp
mkdir -p "$boundary"
chmod 755 "$boundary"
rm -f "$boundary/permit"
mkfifo -m 644 "$boundary/permit"
trap 'docker compose stop --timeout 10 smtp >/dev/null 2>&1 || true' EXIT
docker compose up -d --no-deps --force-recreate smtp
container=$(docker compose ps -q smtp)
pid=$(docker inspect -f '{{.State.Pid}}' "$container")
[ "$pid" -gt 0 ]
chain=UTILIBRE-SMTP-IN
nsenter -t "$pid" -n iptables -N "$chain" 2>/dev/null || true
nsenter -t "$pid" -n iptables -F "$chain"
nsenter -t "$pid" -n iptables -A "$chain" -i lo -s 127.0.0.0/8 -j ACCEPT
nsenter -t "$pid" -n iptables -A "$chain" -s 10.10.1.20/32 -j ACCEPT
nsenter -t "$pid" -n iptables -A "$chain" -p tcp -j REJECT --reject-with tcp-reset
nsenter -t "$pid" -n iptables -C INPUT -p tcp --dport 25 -j "$chain" 2>/dev/null || nsenter -t "$pid" -n iptables -I INPUT 1 -p tcp --dport 25 -j "$chain"
nsenter -t "$pid" -n ip6tables -C INPUT -p tcp --dport 25 ! -s ::1/128 -j REJECT --reject-with tcp-reset 2>/dev/null || nsenter -t "$pid" -n ip6tables -I INPUT 1 -p tcp --dport 25 ! -s ::1/128 -j REJECT --reject-with tcp-reset
MAIL_INGRESS_READY=1 ./firewall.sh
timeout 15 sh -c 'printf "ready\n" > "$1"' sh "$boundary/permit"
trap - EXIT
