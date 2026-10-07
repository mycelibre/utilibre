#!/bin/sh
# Limit only the explicitly listed new application ports. Existing services,
# SSH, host INPUT policy, and unrelated Docker traffic are not changed.
set -eu
chain=UTILIBRE-TOOLS
iptables -w -S "$chain" >/dev/null 2>&1 || iptables -w -N "$chain"
iptables -w -F "$chain"
for port in 3101 3102 3103 3109 3110 3111 3112 3120 3121 3122 3123 3124 3125 3130 3131 3132 3133 3134 3136 3137 3138 3139 3140 3141 3142 3145 3146 3147 3148 3149 3150 3151 3152 3153 3154 3155 3156 3160 3161 3162 3163 3164 3165 3166 3167 3168; do
  iptables -w -A "$chain" -s 10.10.1.3 -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j RETURN
  iptables -w -A "$chain" -p tcp -m conntrack --ctorigdst 10.10.1.43 --ctorigdstport "$port" -j DROP
done
iptables -w -A "$chain" -j RETURN
iptables -w -C DOCKER-USER -i eth0 -j "$chain" 2>/dev/null || iptables -w -I DOCKER-USER 1 -i eth0 -j "$chain"
