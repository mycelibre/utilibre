// Galene-only relay. Never print secrets or change the live ICE file here.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,existsSync,chownSync} from 'node:fs';
import {isIP} from 'node:net';
const publicIp=process.env.UTILIBRE_TURN_PUBLIC_IP;
assert(isIP(publicIp||'')===4,'Supply the verified public IPv4');
const tls=process.argv.includes('--tls');
const root='/opt/utilibre/pack-data/galene-turn';
const secretPath='/opt/utilibre/pack-secrets/galene-turn-secret';
mkdirSync(root,{recursive:true,mode:0o700});
mkdirSync(`${root}/certs`,{recursive:true,mode:0o700});chownSync(`${root}/certs`,4004,4004);
if(!existsSync(secretPath))writeFileSync(secretPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
const secret=readFileSync(secretPath,'utf8').trim();assert.match(secret,/^[a-f0-9]{64}$/);
if(tls)for(const file of ['fullchain.pem','privkey.pem'])assert(existsSync(`${root}/certs/${file}`),'Install the valid certificate before enabling TLS');
const config=[
 'listening-ip=10.10.1.43','relay-ip=10.10.1.43','listening-port=3478',
 // One relay address: the single-address form avoids coturn implicitly
 // whitelisting the private host, which the public/private form does.
 `external-ip=${publicIp}`,'realm=turn.utilibre.org','server-name=Utilibre Galene',
 'fingerprint','use-auth-secret',`static-auth-secret=${secret}`,'stale-nonce=600',
 'min-port=49160','max-port=49671','relay-threads=1',
 // coturn reserves max-bps for EACH allocation, including unused ICE candidates.
 // 64 MB/s admits 256 reservations at 250 kB/s, including join/leave overlap.
 // This is reservation accounting, not measured call traffic or link capacity.
 'total-quota=256','user-quota=256','max-bps=250000','bps-capacity=64000000',
 'max-allocate-lifetime=600','no-cli','no-multicast-peers','no-tcp-relay',
 'no-stdout-log','log-file=/dev/null','no-software-attribute','pidfile=/tmp/turn.pid',
 // Explicit allow wins over deny. Firewall further restricts the peer's ports.
 'denied-peer-ip=0.0.0.0-255.255.255.255','allowed-peer-ip=172.29.99.10',
 'denied-peer-ip=::-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
 'no-dtls',...(tls?['tls-listening-port=5349','cert=/certs/fullchain.pem','pkey=/certs/privkey.pem','no-tlsv1','no-tlsv1_1']:['no-tls']),
].join('\n')+'\n';
writeFileSync(`${root}/turnserver.conf`,config,{mode:0o600});chownSync(`${root}/turnserver.conf`,4004,4004);
writeFileSync(`${root}/settings.json`,JSON.stringify({publicIp,tls})+'\n',{mode:0o600});
const urls=['turn:turn.utilibre.org:3478?transport=udp',tls?'turns:turn.utilibre.org:5349?transport=tcp':'turn:turn.utilibre.org:3478?transport=tcp'];
writeFileSync(`${root}/ice-servers.ready.json`,JSON.stringify([
 {urls:['stun:stun.cloudflare.com:3478']},
 {urls,username:'galene',credential:secret,credentialType:'hmac-sha1'},
],null,2)+'\n',{mode:0o600});
console.log(`Prepared authenticated Galene-only relay (${tls?'TLS, UDP':'UDP/TCP; TLS pending'}). Live ICE configuration unchanged.`);
