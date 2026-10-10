#!/bin/sh
set -eu
app=utilibre-projects-pilot-app-1
database=utilibre-projects-pilot-db-1
pid=$(docker inspect "$app" --format '{{.State.Pid}}')
db_ip=$(docker inspect "$database" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
test "$pid" -gt 0
test -n "$db_ip"
# The app can answer existing localhost connections, resolve its native Docker
# service name and reach its own database. It cannot reach host/LAN/public IPs.
nsenter -t "$pid" -n iptables -w -N UTILIBRE-PROJECTS-EVAL 2>/dev/null || true
nsenter -t "$pid" -n iptables -w -F UTILIBRE-PROJECTS-EVAL
nsenter -t "$pid" -n iptables -w -A UTILIBRE-PROJECTS-EVAL -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
nsenter -t "$pid" -n iptables -w -A UTILIBRE-PROJECTS-EVAL -o lo -j ACCEPT
nsenter -t "$pid" -n iptables -w -A UTILIBRE-PROJECTS-EVAL -d "$db_ip" -p tcp --dport 5432 -j ACCEPT
nsenter -t "$pid" -n iptables -w -A UTILIBRE-PROJECTS-EVAL -j REJECT
nsenter -t "$pid" -n iptables -w -C OUTPUT -j UTILIBRE-PROJECTS-EVAL 2>/dev/null || nsenter -t "$pid" -n iptables -w -I OUTPUT 1 -j UTILIBRE-PROJECTS-EVAL
nsenter -t "$pid" -n ip6tables -w -P OUTPUT DROP
nsenter -t "$pid" -n ip6tables -w -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
nsenter -t "$pid" -n ip6tables -w -A OUTPUT -o lo -j ACCEPT
gateway=utilibre-projects-pilot-gateway-1
if docker inspect "$gateway" --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  gateway_pid=$(docker inspect "$gateway" --format '{{.State.Pid}}')
  app_ip=$(docker inspect "$app" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
  nsenter -t "$gateway_pid" -n iptables -w -N UTILIBRE-PROJECTS-GATEWAY 2>/dev/null || true
  nsenter -t "$gateway_pid" -n iptables -w -F UTILIBRE-PROJECTS-GATEWAY
  nsenter -t "$gateway_pid" -n iptables -w -A UTILIBRE-PROJECTS-GATEWAY -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  nsenter -t "$gateway_pid" -n iptables -w -A UTILIBRE-PROJECTS-GATEWAY -o lo -j ACCEPT
  nsenter -t "$gateway_pid" -n iptables -w -A UTILIBRE-PROJECTS-GATEWAY -d "$app_ip" -p tcp --dport 1337 -j ACCEPT
  nsenter -t "$gateway_pid" -n iptables -w -A UTILIBRE-PROJECTS-GATEWAY -j REJECT
  nsenter -t "$gateway_pid" -n iptables -w -C OUTPUT -j UTILIBRE-PROJECTS-GATEWAY 2>/dev/null || nsenter -t "$gateway_pid" -n iptables -w -I OUTPUT 1 -j UTILIBRE-PROJECTS-GATEWAY
  nsenter -t "$gateway_pid" -n ip6tables -w -P OUTPUT DROP
  nsenter -t "$gateway_pid" -n ip6tables -w -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  nsenter -t "$gateway_pid" -n ip6tables -w -A OUTPUT -o lo -j ACCEPT
fi
