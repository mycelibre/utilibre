# Mumble's public TCP and UDP forward on Proxmox

The DNS-only `mumble.utilibre.org` A record resolves to the Proxmox host's
`49.12.84.228`. The application VM publishes Mumble on `10.10.1.43:64738`
for both TCP control/fallback and UDP voice. Caddy is an HTTP proxy and does
not carry this native protocol.

On 23 November 2026 the private listener accepted TCP, but attempts from the
outside Oracle VM and an independent GitHub runner timed out. A header-only
capture on the application VM saw no SYN from the Oracle attempt. Proxmox's
active iptables and nftables rules contained no port 64738, while its existing
TURN forwards used `nic0` to `vmbr1` and the same destination VM. The external
Kuma monitor was correctly down; do not hide it to make the status page green.

The reviewed idempotent script is `proxmox-mumble-forward.sh`. Install it on the
Proxmox host at `/usr/local/sbin/utilibre-mumble-forward` with mode 0755. Add
one `post-up /usr/local/sbin/utilibre-mumble-forward` line in the `iface nic0`
stanza of `/etc/network/interfaces`, directly after the existing
`utilibre-turn-extra-forward` line. Back up that file before editing. Do not
reload the host network to activate this change: execute the script once, then
check its four exact rules. It adds only TCP and UDP 64738 DNAT to the existing
VM and matching inbound FORWARD allowances; it does not alter TURN, mail,
Nextcloud or HTTP routes. Check the destination listener and both directions
before considering the public service restored.

Verification from a separate network: a TCP connect must succeed; the existing
`Mumble external connectivity` workflow checks the pinned server certificate
and invalid-password rejection without a real password. Its UDP packet send is
only a probe, so confirm packet arrival on the application VM before claiming
UDP transport. Wait for the outside Kuma monitor's next five-minute check.
The application VM's own connection to its public IP is subject to NAT hairpin
behavior and is not an independent external test.

Rollback: remove just the `utilibre-mumble-forward` `post-up` line and script,
then delete the script's two exact PREROUTING and two exact FORWARD rules with
`iptables -D`. Leave the existing TURN rules and the application data alone.
Do not flush chains or restart the host network for this rollback.
