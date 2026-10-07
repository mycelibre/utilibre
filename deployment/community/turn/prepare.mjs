// Offline configuration renderer only; this does NOT start or expose a relay.
// Credentials are created once in an operator-only directory, never printed.
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chownSync } from 'node:fs';
import { isIP } from 'node:net';
const lab = process.argv.includes('--lab');
const dir = lab ? '/opt/utilibre/turn-lab' : '/opt/utilibre/turn';
const env = process.env;
function required(name) { if (!env[name]) throw new Error(`Missing ${name}; public TURN remains disabled`); return env[name]; }
const bind = lab ? '127.0.0.1' : required('UTILIBRE_TURN_BIND_IP');
const publicIp = lab ? bind : required('UTILIBRE_TURN_PUBLIC_IP');
if (isIP(bind) !== 4 || isIP(publicIp) !== 4 || (!lab && [bind, publicIp].some(v => v === '0.0.0.0' || v.startsWith('127.')))) throw new Error('This tested option requires explicit IPv4 addresses; use a non-loopback public deployment');
const host = lab ? 'localhost' : required('UTILIBRE_TURN_HOST');
if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.endsWith('.')) throw new Error('Invalid TURN hostname');
if (!lab && required('UTILIBRE_TURN_CAPACITY_APPROVED') !== 'yes') throw new Error('Capacity approval required');
function positive(name, fallback) { const n = Number(lab ? fallback : required(name)); if (!Number.isSafeInteger(n) || n < 1 || n > 100000000) throw new Error(`Invalid ${name}`); return n; }
const quota = positive('UTILIBRE_TURN_TOTAL_QUOTA', 4);
const bps = positive('UTILIBRE_TURN_MAX_BPS', 128000);
const total = positive('UTILIBRE_TURN_TOTAL_BPS', 256000);
if (total < bps || quota > 32) throw new Error('Global bandwidth must cover one allocation; bounded option permits at most 32 allocations');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const credentialPath = `${dir}/credential`;
if (!existsSync(credentialPath)) writeFileSync(credentialPath, randomBytes(32).toString('hex'), { mode: 0o600, flag: 'wx' });
const credential = readFileSync(credentialPath, 'utf8').trim(); if (!/^[a-f0-9]{64}$/.test(credential)) throw new Error('Invalid stored credential');
const port = lab ? 3479 : 3478;
const config = [
  `listening-ip=${bind}`, `relay-ip=${bind}`, `listening-port=${port}`,
  `external-ip=${publicIp}/${bind}`, 'realm=utilibre.org', 'server-name=Utilibre',
  'fingerprint', 'lt-cred-mech', `user=pairdrop:${credential}`, 'stale-nonce=600',
  'min-port=49160', 'max-port=49191', 'relay-threads=1',
  `total-quota=${quota}`, `user-quota=${quota}`, `max-bps=${bps}`, `bps-capacity=${total}`,
  'max-allocate-lifetime=600', 'no-cli', 'no-multicast-peers', 'no-tcp-relay',
  'no-stdout-log', 'log-file=/dev/null', 'no-software-attribute', 'pidfile=/tmp/turn.pid',
  ...(lab ? ['no-tls', 'no-dtls', 'allow-loopback-peers', 'denied-peer-ip=0.0.0.0-255.255.255.255', 'allowed-peer-ip=127.0.0.1'] : [
    'tls-listening-port=5349', 'cert=/certs/fullchain.pem', 'pkey=/certs/privkey.pem', 'no-tlsv1', 'no-tlsv1_1', 'no-dtls',
    // No public-to-private relay / metadata service access.
    'denied-peer-ip=0.0.0.0-0.255.255.255', 'denied-peer-ip=10.0.0.0-10.255.255.255',
    'denied-peer-ip=100.64.0.0-100.127.255.255', 'denied-peer-ip=127.0.0.0-127.255.255.255',
    'denied-peer-ip=169.254.0.0-169.254.255.255', 'denied-peer-ip=172.16.0.0-172.31.255.255',
    'denied-peer-ip=192.168.0.0-192.168.255.255', 'denied-peer-ip=224.0.0.0-255.255.255.255',
    'denied-peer-ip=192.0.0.0-192.0.0.255', 'denied-peer-ip=192.0.2.0-192.0.2.255',
    'denied-peer-ip=198.18.0.0-198.19.255.255', 'denied-peer-ip=198.51.100.0-198.51.100.255',
    'denied-peer-ip=203.0.113.0-203.0.113.255', `denied-peer-ip=${publicIp}`, `denied-peer-ip=${bind}`,
    // IPv4-only first option; also blocks IPv4-mapped IPv6 bypasses.
    'denied-peer-ip=::-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
  ]),
].join('\n') + '\n';
writeFileSync(`${dir}/turnserver.conf`, config, { mode: 0o600 });
chownSync(`${dir}/turnserver.conf`, 65534, 65534);
writeFileSync(`${dir}/rtc.json`, JSON.stringify({ sdpSemantics: 'unified-plan', iceServers: [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: lab ? [`turn:${bind}:${port}?transport=udp`, `turn:${bind}:${port}?transport=tcp`] : [`turn:${host}:3478?transport=udp`, `turn:${host}:3478?transport=tcp`, `turns:${host}:5349?transport=tcp`], username: 'pairdrop', credential },
] }, null, 2), { mode: 0o600 });
console.log(`Prepared ${lab ? 'loopback-only synthetic lab' : 'disabled public option'} configuration in ${dir}. No service started. Credentials not printed.`);
