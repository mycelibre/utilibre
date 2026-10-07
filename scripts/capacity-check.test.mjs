import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { percentile, safeAssetPaths, request, phase, targets } from './capacity-check.mjs';
test('percentiles and empty samples are explicit',()=>{
  assert.equal(percentile([], .95),null);
  assert.equal(percentile([10,1,4,2],.5),2);
  assert.equal(percentile([10,1,4,2],.95),10);
});
test('only same-origin static assets, never arbitrary external URLs',()=>{
  const target={host:'python.utilibre.org',path:'/lab/index.html'};
  assert.deepEqual(safeAssetPaths('<script src="../build/lab/bundle.js?v=1&amp;x=2"></script><script src="https://evil.example/app.js"></script><script src="/api/write.js"></script><script src="https://user:pass@python.utilibre.org/file.js"></script>',target),['/build/lab/bundle.js?v=1&x=2']);
});
test('arbitrary load targets and unsafe rates are rejected before requests',async()=>{
  assert.throws(()=>request({host:'genius.com',port:443},'/'),/allowlisted/);
  assert.throws(()=>request(targets[0],'//other.example'),/allowlisted/);
  await assert.rejects(phase({rate:1000,seconds:20,maxInflight:80}),/Unsafe/);
  await assert.rejects(phase({rate:1,seconds:3600,maxInflight:80}),/Unsafe/);
  await assert.rejects(phase({rate:1,seconds:20,maxInflight:-1}),/Unsafe/);
  await assert.rejects(phase({rate:1,seconds:20,maxInflight:1.5}),/Unsafe/);
  await assert.rejects(phase({rate:1,seconds:20,maxInflight:80,mode:'origin',pool:[]}),/Invalid/);
});
test('quota fixture listeners and upstreams are loopback-only',()=>{
  const config=readFileSync(new URL('../deployment/community/capacity-fixtures/nginx.conf',import.meta.url),'utf8');
  const listeners=[...config.matchAll(/listen\s+([^;]+);/g)].map(m=>m[1]);
  assert.equal(listeners.length,5);
  assert(listeners.every(value=>/^127\.0\.0\.1:339[0-4]$/.test(value)));
  const proxies=[...config.matchAll(/proxy_pass\s+([^;]+);/g)].map(m=>m[1]);
  assert.equal(proxies.length,4);
  assert(proxies.every(value=>value==='http://127.0.0.1:3394'));
});
