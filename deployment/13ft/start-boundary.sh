#!/bin/sh
set -eu
cd /home/ubuntu/freetools/deployment/13ft
./firewall.sh
docker compose up -d proxy
proxy_id=$(docker compose ps -q proxy)
proxy_pid=$(docker inspect -f '{{.State.Pid}}' "$proxy_id")
[ "$proxy_pid" -gt 0 ]
nsenter -t "$proxy_pid" -n iptables -P OUTPUT DROP
nsenter -t "$proxy_pid" -n iptables -F OUTPUT
nsenter -t "$proxy_pid" -n iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/3; do
 nsenter -t "$proxy_pid" -n iptables -A OUTPUT -d "$range" -j REJECT
done
for resolver in 1.1.1.1 9.9.9.9; do
 nsenter -t "$proxy_pid" -n iptables -A OUTPUT -d "$resolver" -p udp --dport 53 -j ACCEPT
 nsenter -t "$proxy_pid" -n iptables -A OUTPUT -d "$resolver" -p tcp --dport 53 -j ACCEPT
done
nsenter -t "$proxy_pid" -n iptables -A OUTPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
# The app starts only after the proxy connection boundary is installed.
docker compose up -d app
app_id=$(docker compose ps -q app)
app_pid=$(docker inspect -f '{{.State.Pid}}' "$app_id")
nsenter -t "$app_pid" -n iptables -P OUTPUT DROP
nsenter -t "$app_pid" -n iptables -F OUTPUT
nsenter -t "$app_pid" -n iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
nsenter -t "$app_pid" -n iptables -A OUTPUT -d 172.29.118.20 -p tcp --dport 3128 -j ACCEPT
docker compose up -d gateway
gateway_id=$(docker compose ps -q gateway)
gateway_pid=$(docker inspect -f '{{.State.Pid}}' "$gateway_id")
nsenter -t "$gateway_pid" -n iptables -P OUTPUT DROP
nsenter -t "$gateway_pid" -n iptables -F OUTPUT
nsenter -t "$gateway_pid" -n iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
nsenter -t "$gateway_pid" -n iptables -A OUTPUT -d 172.29.118.10 -p tcp --dport 5000 -j ACCEPT
