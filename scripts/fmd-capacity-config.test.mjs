import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync(new URL('../deployment/community/fmd-gateway.conf',import.meta.url),'utf8');
test('FMD static budget does not raise the API, connection, body or privacy limits',()=>{
  assert.match(config,/limit_req_zone \$binary_remote_addr zone=fmd_api:2m rate=5r\/s;/);
  assert.match(config,/location \/ \{\s+limit_req zone=fmd_api burst=60 nodelay;/);
  assert.match(config,/limit_conn fmd_connections 12;/);
  assert.match(config,/client_max_body_size 15m;/);
  assert.match(config,/add_header Cache-Control no-store always;/);
  assert.match(config,/set_real_ip_from 10\.10\.1\.3;/);
  assert.equal((config.match(/set_real_ip_from/g)||[]).length,1);
});
test('FMD separate static location matches only expected asset files',()=>{
  const rule=config.match(/location ~ (\S+) \{/)[1];
  const pattern=new RegExp(rule);
  assert(pattern.test('/assets/Home-example.js'));assert(pattern.test('/assets/styles.css'));
  for(const path of ['/theme-init.js','/manifest.json','/icon.svg','/favicon-32x32.png','/apple-touch-icon.png'])assert(pattern.test(path));
  for(const path of ['/api/v2/data/location','/api/v2/account/register','/assets/api/v2/data/location','/assets/file.js/extra','/version','/arbitrary.js','/api/account.js'])assert(!pattern.test(path));
  assert.match(config,/if \(\$request_method !~ \^\(GET\|HEAD\)\$\)/);
  assert.match(config,/limit_req zone=fmd_assets burst=100 nodelay;/);
});
