// Native tracker configuration only. No message/archive API or persisted state.
import Server from 'bittorrent-tracker/server';
const server = new Server({
  http: false, udp: false, stats: false, trustProxy: false,
  interval: 120_000, peersCacheLength: 128, peersCacheTtl: 120_000,
  ws: {
    maxPayload: 65_536, clientTracking: true, perMessageDeflate: false,
    verifyClient: ({ origin }) => (
      ['https://chat.utilibre.org', 'http://localhost:3200', 'http://10.10.1.43:3200'].includes(origin) &&
      (server.ws?.clients?.size ?? 0) < 128
    ),
  },
  filter: (hash, _params, done) => {
    if (!server.torrents[hash] && Object.keys(server.torrents).length >= 256) {
      done(new Error('Discovery capacity reached'));
    } else done(null);
  },
});
// Drive the native cache's lazy expiry and drop empty discovery labels.
const cleanup = setInterval(() => {
  for (const [hash, swarm] of Object.entries(server.torrents)) {
    for (const peer of swarm.peers.keys) swarm.peers.peek(peer);
    if (swarm.peers.length === 0) delete server.torrents[hash];
  }
}, 30_000);
cleanup.unref();
// The native tracker emits peer identifiers in normal logs; do not retain them.
server.on('error', () => {});
server.on('warning', () => {});
server.listen(8000, '0.0.0.0');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
