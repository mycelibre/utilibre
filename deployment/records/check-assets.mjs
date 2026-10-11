import {request} from '../../portal/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://bookplate.utilibre.org';
const a=await request.newContext({storageState:'/opt/utilibre/records/private/bookplate-state-0.json'});
const b=await request.newContext({storageState:'/opt/utilibre/records/private/bookplate-state-1.json'});
const guest=await request.newContext();
let path;const checks=[];
try{
 const ids=JSON.parse(await readFile('/opt/utilibre/records/private/check-records.json','utf8'));
 const uploaded=await a.post(origin+'/api/notes/images',{multipart:{bookId:ids.bookplateBook,file:{name:'fictional-image.jpg',mimeType:'image/jpeg',buffer:await readFile(new URL('../../portal/public/examples/fictional-image.jpg',import.meta.url))}}});
 assert.equal(uploaded.status(),200);path=(await uploaded.json()).path;
 const own=await a.get(origin+path);assert.equal(own.status(),200);assert.match(own.headers()['content-type'],/^image\/jpeg/);
 assert.equal((await b.get(origin+path)).status(),404);
 assert.equal((await guest.get(origin+path)).status(),401);
 assert.equal((await guest.get(origin+path.replace('/api/notes/images/','/uploads/'))).status(),404);
 checks.push('Synthetic note image readable by account A; denied to B (404), guest (401), guessed public uploads route (404)');
 assert.equal((await a.delete(origin+path)).status(),200);
 assert.equal((await a.get(origin+path)).status(),404);path=undefined;
 checks.push('Native image deletion makes the asset unavailable to its owner');
}finally{
 if(path)await a.delete(origin+path);
 for(const c of[a,b,guest])await c.dispose();
 const report={date:new Date().toISOString(),checks};
 await writeFile('/opt/utilibre/reports/records-20261011/assets.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
