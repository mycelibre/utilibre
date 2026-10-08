module.exports = {
  public: {
    origin: 'https://pad.utilibre.org',
    sandboxOrigin: 'https://sandbox-pad.utilibre.org',
    httpHost: '0.0.0.0', httpPort: 3000, httpSafePort: 3001,
  },
  front: [{host: '127.0.0.1', port: 3010}],
  core: [{host: '127.0.0.1', port: 3020}],
  storage: [{host: '127.0.0.1', port: 3030, wsPort: 3040}],
};
