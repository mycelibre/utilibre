import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const config = readFileSync(new URL('../safetwitch-evaluation.conf', import.meta.url),'utf8');
test('ordinary 50-image discovery fits within bounded media admission',()=>{
  const media=config.slice(config.indexOf('location /proxy/'));
  assert.match(media,/limit_conn connections 64;/);
  assert.match(media,/limit_conn global_connections 96;/);
  assert.match(media,/limit_req zone=twitch_media burst=120 nodelay;/);
  assert.match(media,/limit_req zone=twitch_media_global burst=120;/);
  assert.match(media,/limit_rate 1m;/);
});
test('browser media stays same-origin and the proxy strips credentials',()=>{
  assert.match(config,/img-src 'self' data:; media-src 'self' blob:; connect-src 'self';/);
  assert.match(config,/proxy_set_header Authorization "";/);
  assert.match(config,/proxy_set_header Cookie "";/);
  assert.match(config,/location \^~ \/api\/chat \{ return 403; \}/);
});
