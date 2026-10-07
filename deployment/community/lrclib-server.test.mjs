import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createLyricsHandler, retrySeconds } from './lrclib-server.mjs';
async function fixture(t, options) {
  const server = createServer(createLyricsHandler(options));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  return (path, options) => fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
}
const records = [{ id: 1, duration: 100, trackName: 'Test title', artistName: 'Test artist', plainLyrics: 'Fixture, not a published song', syncedLyrics: null }];
const ok = () => Response.json(records);
test('fixed upstream, no visitor identity forwarded, cache and safe fields', async t => {
  let calls = 0;
  const get = await fixture(t, { request: async (url, opts) => {
    calls++; assert.equal(url.origin, 'https://lrclib.net'); assert.equal(url.pathname, '/api/search');
    assert.equal(opts.redirect, 'error'); assert.equal(Object.keys(opts.headers).length, 2); return ok();
  }});
  const first = await get('/api/search?q=test', {headers:{Cookie:'private=yes','X-Forwarded-For':'10.0.0.1'}});
  assert.equal(first.status, 200); assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.equal((await first.json())[0].trackName, 'Test title');
  assert.equal((await get('/api/search?q=test')).status, 200); assert.equal(calls, 1);
});
test('write APIs, arbitrary proxy targets and malformed inputs rejected', async t => {
  const get = await fixture(t, {request:()=>{throw Error('must not fetch');}});
  for (const path of ['/api/search','/api/search?q=x&q=y','/api/search?q=x&url=https://example.com','/api/search?q=%00',`/api/search?q=${'x'.repeat(201)}`]) assert.equal((await get(path)).status,400);
  assert.equal((await get('/api/publish',{method:'POST'})).status,405);
  assert.equal((await get('/api/get/1')).status,404);
  assert.equal((await get('/api/search?q=x',{method:'HEAD'})).status,405);
});
test('429 cooldown honors long Retry-After and does not repeat upstream request', async t => {
  let clock=100000,calls=0;
  const get=await fixture(t,{now:()=>clock,request:async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'900'}});}});
  assert.equal((await get('/api/search?q=one')).headers.get('retry-after'),'900'); clock+=1000;
  assert.equal((await get('/api/search?q=two')).headers.get('retry-after'),'899');assert.equal(calls,1);
});
test('sequential global throttling and expiration', async t => {
  let clock=1000,calls=0;
  const get=await fixture(t,{now:()=>clock,request:async()=>{calls++;return ok();}});
  assert.equal((await get('/api/search?q=one')).status,200);
  clock+=500;assert.equal((await get('/api/search?q=two')).status,200);
  clock+=600001;assert.equal((await get('/api/search?q=one')).status,200);assert.equal(calls,3);
});
test('upstream HTML/redirects/oversized JSON never reach users', async t => {
  for(const response of [new Response('<script>bad</script>'),new Response('',{status:302}),new Response('x'.repeat(2*1024*1024+1),{headers:{'content-type':'application/json'}})]) {
    const get=await fixture(t,{request:async()=>response}); const r=await get('/api/search?q=test');assert.equal(r.status,502);assert(!((await r.text()).includes('<script>')));
  }
});
test('parallel requests never cause parallel upstream calls', async t => {
  let release;const pending=new Promise(resolve=>release=resolve);let calls=0;
  t.after(()=>release());
  const get=await fixture(t,{request:async()=>{calls++;await pending;return ok();}});
  const first=get('/api/search?q=one');
  while(!calls) await new Promise(resolve=>setTimeout(resolve,1));
  const second=get('/api/search?q=two');
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(calls,1);release();assert.equal((await first).status,200);
  assert.equal((await second).status,200);assert.equal(calls,2);
});
test('30 identical cold requests share one upstream result', async t => {
  let calls=0;
  const get=await fixture(t,{request:async()=>{calls++;await new Promise(r=>setTimeout(r,100));return ok();}});
  const results=await Promise.all(Array.from({length:30},()=>get('/api/search?q=identical')));
  assert(results.every(r=>r.status===200));assert.equal(calls,1);
  assert.deepEqual(await results[0].json(),await results[29].json());
});
test('three distinct requests queue with at least 500ms after each completion', async t => {
  const starts=[],ends=[];let active=0,peak=0;
  const get=await fixture(t,{request:async()=>{
    starts.push(performance.now());active++;peak=Math.max(peak,active);
    await new Promise(r=>setTimeout(r,50));active--;ends.push(performance.now());return ok();
  }});
  const results=await Promise.all(['one','two','three'].map(q=>get(`/api/search?q=${q}`)));
  assert(results.every(r=>r.status===200));assert.equal(peak,1);
  for(let i=1;i<starts.length;i++) assert(starts[i]-ends[i-1]>=490,'Provider gap must remain 500ms (10ms clock tolerance)');
});
test('distinct queue is bounded and expires without fetching stale requests', async t => {
  let release,calls=0;const held=new Promise(r=>release=r);t.after(()=>release());
  const get=await fixture(t,{request:async()=>{calls++;await held;return ok();}});
  const first=get('/api/search?q=active');
  while(!calls)await new Promise(r=>setTimeout(r,1));
  const started=performance.now();
  const results=await Promise.all(Array.from({length:12},(_,i)=>get(`/api/search?q=queued-${i}`)));
  assert(results.every(r=>r.status===429 && r.headers.get('retry-after')==='2'));
  assert(performance.now()-started<2700,'Expired queue should not wait for the provider');
  assert.equal(calls,1);release();assert.equal((await first).status,200);
  await new Promise(r=>setTimeout(r,550));assert.equal(calls,1);
});
test('identical-search waiters are bounded independently of the distinct queue', async t => {
  let release,calls=0;const held=new Promise(r=>release=r);t.after(()=>release());
  const get=await fixture(t,{request:async()=>{calls++;await held;return ok();}});
  const requests=Array.from({length:48},()=>get('/api/search?q=shared'));
  while(!calls)await new Promise(r=>setTimeout(r,1));
  await new Promise(r=>setTimeout(r,100));
  assert.equal((await get('/api/search?q=shared')).status,429);
  release();assert((await Promise.all(requests)).every(r=>r.status===200));assert.equal(calls,1);
});
test('queued client cancellation removes work; cancelling one duplicate preserves the other', async t => {
  let release,calls=0;const held=new Promise(r=>release=r);t.after(()=>release());
  const get=await fixture(t,{request:async()=>{calls++;await held;return ok();}});
  const controller=new AbortController();
  const first=get('/api/search?q=active',{signal:controller.signal}).catch(()=>null);
  while(!calls)await new Promise(r=>setTimeout(r,1));
  const duplicate=get('/api/search?q=active');
  const cancelled=new AbortController();
  const queued=get('/api/search?q=cancelled',{signal:cancelled.signal}).catch(()=>null);
  await new Promise(r=>setTimeout(r,40));controller.abort();cancelled.abort();
  await Promise.all([first,queued]);await new Promise(r=>setTimeout(r,40));
  release();assert.equal((await duplicate).status,200);
  await new Promise(r=>setTimeout(r,550));assert.equal(calls,1);
});
test('provider cooldown flushes queued requests without more provider calls', async t => {
  let calls=0;
  const get=await fixture(t,{request:async()=>{calls++;await new Promise(r=>setTimeout(r,60));return new Response('',{status:429,headers:{'Retry-After':'900'}});}});
  const results=await Promise.all(['one','two','three'].map(q=>get(`/api/search?q=${q}`)));
  assert(results.every(r=>r.status===429 && Number(r.headers.get('retry-after'))>=899));assert.equal(calls,1);
});
test('last active waiter disconnect aborts provider work without a global cooldown', async t => {
  let calls=0,aborted=false;
  const get=await fixture(t,{request:async(url,opts)=>{
    calls++;
    if(calls>1)return ok();
    return new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>{aborted=true;reject(Error('cancelled'));},{once:true}));
  }});
  const controller=new AbortController();
  const cancelled=get('/api/search?q=departed',{signal:controller.signal}).catch(()=>null);
  while(!calls)await new Promise(r=>setTimeout(r,1));
  controller.abort();await cancelled;
  for(let i=0;i<100&&!aborted;i++)await new Promise(r=>setTimeout(r,5));
  assert(aborted);
  assert.equal((await get('/api/search?q=next')).status,200);assert.equal(calls,2);
});
test('Retry-After dates and bad values',()=>{
  assert.equal(retrySeconds('invalid',0),60); assert.equal(retrySeconds('Thu, 01 Jan 1970 00:20:00 GMT',0),1200);
});
