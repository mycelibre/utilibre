// Better Auth discovers the provider once during startup. If Authentik is
// still booting, it skips the provider permanently for that process. Wait for
// verified HTTPS discovery before initializing the original application.
import { pathToFileURL } from 'node:url';

export function validDiscovery(document, discoveryURL) {
  const discovery = new URL(discoveryURL);
  if (discovery.protocol !== 'https:') return false;
  const expectedIssuer = discovery.href.replace(/\/\.well-known\/openid-configuration$/, '').replace(/\/$/, '');
  if (typeof document?.issuer !== 'string' || document.issuer.replace(/\/$/, '') !== expectedIssuer) return false;
  return ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri'].every(key => {
    try {
      const endpoint = new URL(document[key]);
      return endpoint.origin === discovery.origin && endpoint.protocol === 'https:' && !endpoint.username && !endpoint.password;
    } catch { return false; }
  });
}

export async function waitForDiscovery(url, { fetcher = fetch, pause = ms => new Promise(r => setTimeout(r, ms)),
  log = console.log, maxAttempts = Infinity } = {}) {
  let consecutive = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let ready = false;
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(5000), redirect: 'error' });
      ready = response.ok && validDiscovery(await response.json(), url);
    } catch { /* Retry without printing URLs, response bodies or credentials. */ }
    consecutive = ready ? consecutive + 1 : 0;
    if (consecutive >= 2) { log('Identity discovery is ready; starting the CV application.'); return; }
    if (!ready && (attempt === 1 || attempt % 12 === 0)) log('Waiting for identity discovery before starting CV.');
    await pause(ready ? 1000 : 5000);
  }
  throw Error('Identity discovery did not become ready');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.OAUTH_DISCOVERY_URL) throw Error('CV requires an explicit identity discovery URL');
  await waitForDiscovery(process.env.OAUTH_DISCOVERY_URL);
  const { main } = await import('/app/apps/server/dist/index.mjs');
  await main();
}
