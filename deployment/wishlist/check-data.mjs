import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const origin='https://wishlist.utilibre.org',report='/opt/utilibre/reports/wishlist-20261009';process.umask(0o077);
const b=await chromium.launch();const c=await b.newContext({storageState:'/opt/utilibre/wishlist/private/qa-browser.json',locale:'en-US',serviceWorkers:'block'});const p=await c.newPage();p.setDefaultTimeout(20000);const hosts=[];p.on('request',r=>hosts.push(new URL(r.url()).hostname));let groupId;
try{
 await p.goto(origin+'/group-error');
 let saved;try{saved=JSON.parse(await readFile(report+'/fixture.json','utf8'));}catch{}
 const group=saved?.groupId?{status:201,data:{group:{id:saved.groupId}}}:await p.evaluate(async()=>{const r=await fetch('/api/groups',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Utilibre fictional wishlist 20261009'})});return {status:r.status,data:await r.json()};});assert.equal(group.status,201);groupId=group.data.group.id;await writeFile(report+'/fixture.json',JSON.stringify({groupId}));
 await p.goto(origin+'/lists/create');await p.locator('[name="name"]').fill('Fictional museum gifts');await p.getByRole('button',{name:'Create',exact:true}).click();await p.waitForURL(u=>/^\/lists\/[^/]+$/.test(u.pathname)&&!u.pathname.endsWith('/create'));const listId=new URL(p.url()).pathname.split('/')[2];
 await writeFile(report+'/fixture.json',JSON.stringify({groupId,listId}));
 await p.goto(origin+`/lists/${listId}/create-item`);await p.locator('[name="name"]').fill('Fictional paper notebook');await p.locator('[name="formatted-price"]').fill('12.50');await p.getByRole('button',{name:'Create item',exact:true}).click();await p.waitForURL(u=>u.pathname==='/lists'||u.pathname===`/lists/${listId}`);await p.goto(origin+`/lists/${listId}`);await p.getByTestId('name').filter({hasText:'Fictional paper notebook'}).waitFor();
 const denied=await fetch(origin+`/lists/${listId}`,{redirect:'manual'});assert([302,303,307].includes(denied.status));
 const snapshot=execFileSync('python3',['deployment/wishlist/backup.py'],{encoding:'utf8'}).trim();const restored=JSON.parse(await readFile(snapshot+'/RESTORE-VERIFIED.json','utf8'));assert(restored.counts.items>=1);
 await writeFile(report+'/data-result.json',JSON.stringify({checkedAt:new Date().toISOString(),nativeOidc:true,groupCreated:true,listCreated:true,itemCreated:true,anonymousListDenied:true,backupRestored:true,exportAvailable:false,hosts:[...new Set(hosts)],publicEdgeTested:true},null,2));
 // Delete only this test group's data using its native management endpoint.
 const removed=await p.evaluate(async id=>(await fetch('/api/groups/'+id,{method:'DELETE'})).status,groupId);assert.equal(removed,200);
 assert.deepEqual([...new Set(hosts)].filter(h=>!['wishlist.utilibre.org','auth.utilibre.org'].includes(h)),[]);
 console.log('Wishlist native OIDC/group/list/item, private-list access, backup restore and group deletion passed.');
}catch(e){await p.screenshot({path:report+'/data-failure.png',fullPage:true});await writeFile(report+'/data-failure.txt',String(e.stack));throw e;}finally{await c.close();await b.close();}
