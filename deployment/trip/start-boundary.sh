#!/bin/sh
set -eu
cd /home/ubuntu/freetools/deployment/trip
mountpoint -q /opt/utilibre/trip/data
[ "$(findmnt -n -o FSTYPE --target /opt/utilibre/trip/data)" = ext4 ]
trap 'docker compose --env-file /opt/utilibre/trip/private/runtime.env stop >/dev/null 2>&1 || true' EXIT
# Stop this scoped stack first: no request can race a newly created namespace.
docker compose --env-file /opt/utilibre/trip/private/runtime.env stop
./firewall.sh
docker compose --env-file /opt/utilibre/trip/private/runtime.env up -d --no-deps proxy
namespace_pid() {
  docker inspect "$(docker compose --env-file /opt/utilibre/trip/private/runtime.env ps -q "$1")" --format '{{.State.Pid}}'
}
proxy_pid=$(namespace_pid proxy)
proxy_rule() { nsenter -t "$proxy_pid" -n iptables -w "$@"; }
app_rule() { nsenter -t "$app_pid" -n iptables -w "$@"; }
proxy_rule -N UTILIBRE-PROXY-OUT 2>/dev/null || true
proxy_rule -F UTILIBRE-PROXY-OUT
proxy_rule -A UTILIBRE-PROXY-OUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3; do
 proxy_rule -A UTILIBRE-PROXY-OUT -d "$range" -j REJECT
done
for resolver in 1.1.1.1 9.9.9.9; do
 proxy_rule -A UTILIBRE-PROXY-OUT -d "$resolver" -p udp --dport 53 -j ACCEPT
 proxy_rule -A UTILIBRE-PROXY-OUT -d "$resolver" -p tcp --dport 53 -j ACCEPT
done
proxy_rule -A UTILIBRE-PROXY-OUT -p tcp -m multiport --dports 80,443 -j ACCEPT
proxy_rule -A UTILIBRE-PROXY-OUT -j REJECT
proxy_rule -C OUTPUT -j UTILIBRE-PROXY-OUT 2>/dev/null || proxy_rule -I OUTPUT 1 -j UTILIBRE-PROXY-OUT
docker compose --env-file /opt/utilibre/trip/private/runtime.env up -d --no-deps app
app_pid=$(namespace_pid app)
app_rule -N UTILIBRE-APP-OUT 2>/dev/null || true
app_rule -F UTILIBRE-APP-OUT
app_rule -A UTILIBRE-APP-OUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
app_rule -A UTILIBRE-APP-OUT -d 127.0.0.1 -p tcp --dport 8000 -j ACCEPT
app_rule -A UTILIBRE-APP-OUT -d 172.29.152.20 -p tcp --dport 3128 -j ACCEPT
app_rule -A UTILIBRE-APP-OUT -j REJECT
app_rule -C OUTPUT -j UTILIBRE-APP-OUT 2>/dev/null || app_rule -I OUTPUT 1 -j UTILIBRE-APP-OUT
# Wait for the native upstream; avoid exposing a startup-only 502.
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
 if docker compose --env-file /opt/utilibre/trip/private/runtime.env exec -T app python -c 'import urllib.request; o=urllib.request.build_opener(urllib.request.ProxyHandler({})); assert o.open("http://127.0.0.1:8000/",timeout=1).status==200' >/dev/null 2>&1; then ready=1; break; fi
 sleep 1
done
[ "$ready" = 1 ]
# The gateway starts only after both network boundaries and a native admin exist.
docker compose --env-file /opt/utilibre/trip/private/runtime.env exec -T app python -c 'from sqlmodel import Session,select; from trip.db.core import get_engine; from trip.models.models import User; s=Session(get_engine()); assert s.exec(select(User).where(User.is_admin == True)).first()'
docker compose --env-file /opt/utilibre/trip/private/runtime.env up -d --no-deps gateway
gateway_pid=$(namespace_pid gateway)
gateway_rule() { nsenter -t "$gateway_pid" -n iptables -w "$@"; }
gateway_rule -N UTILIBRE-GATEWAY-OUT 2>/dev/null || true
gateway_rule -F UTILIBRE-GATEWAY-OUT
gateway_rule -A UTILIBRE-GATEWAY-OUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
gateway_rule -A UTILIBRE-GATEWAY-OUT -d 127.0.0.1 -p tcp --dport 8080 -j ACCEPT
gateway_rule -A UTILIBRE-GATEWAY-OUT -d 172.29.152.10 -p tcp --dport 8000 -j ACCEPT
gateway_rule -A UTILIBRE-GATEWAY-OUT -j REJECT
gateway_rule -C OUTPUT -j UTILIBRE-GATEWAY-OUT 2>/dev/null || gateway_rule -I OUTPUT 1 -j UTILIBRE-GATEWAY-OUT

# Constrain gateway ingress too; loopback published-port checks use Docker's host gateway.
gateway_rule -N UTILIBRE-GATEWAY-IN 2>/dev/null || true
gateway_rule -F UTILIBRE-GATEWAY-IN
gateway_rule -A UTILIBRE-GATEWAY-IN -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for source in 127.0.0.1 10.10.1.3 172.29.152.1 172.29.153.1; do
 gateway_rule -A UTILIBRE-GATEWAY-IN -s "$source" -p tcp --dport 8080 -j ACCEPT
done
gateway_rule -A UTILIBRE-GATEWAY-IN -j REJECT
gateway_rule -C INPUT -j UTILIBRE-GATEWAY-IN 2>/dev/null || gateway_rule -I INPUT 1 -j UTILIBRE-GATEWAY-IN
trap - EXIT
