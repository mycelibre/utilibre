import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const owner=JSON.parse(await readFile('/opt/utilibre/pack-secrets/galene-owner.json','utf8'));
const browser=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--disable-features=WebRtcHideLocalIpsWithMdns']});
try{
 const a=await browser.newContext({permissions:['camera','microphone']});
 const b=await browser.newContext({permissions:['camera','microphone']});
 const outside=[];for(const c of [a,b])c.on('request',r=>{if(!r.url().startsWith('https://meet.utilibre.org/')&&!r.url().startsWith('blob:'))outside.push(new URL(r.url()).origin)});
 const p=await a.newPage();p.setDefaultTimeout(12000);await p.goto('https://meet.utilibre.org/group/community/');
 await p.locator('#username').fill(owner.username);await p.locator('#password').fill(owner.password);await p.locator('#presentboth').check();await p.locator('#connectbutton').click();
 await p.locator('#unpresentbutton').waitFor();
 console.log('Moderator connected.');
 const command=async(page,text)=>{await page.locator('#input').fill(text);await page.locator('#inputbutton').click()};
 await command(p,'/unlock');await p.waitForTimeout(200);await command(p,'/invite FictionalGuest 10min');
 const link=p.locator('#box a[href*="token="]').last();await link.waitFor();const url=await link.getAttribute('href');
 console.log('Native invitation created.');
 const q=await b.newPage();q.setDefaultTimeout(12000);await q.goto(url);await q.locator('#password').waitFor({state:'hidden'});await q.locator('#presentboth').check();await q.locator('#connectbutton').click();
 await q.locator('#unpresentbutton').waitFor();
 console.log('Invited guest connected.');
 await q.waitForFunction(()=>Object.values(serverConnection.down).some(s=>s.pc.iceConnectionState==='connected'),null,{timeout:20000});
 await q.waitForFunction(()=>Object.values(serverConnection.up).some(s=>s.pc.remoteDescription?.sdp.includes(' typ srflx')),null,{timeout:15000});
 const localPorts=await q.evaluate(()=>Object.values(serverConnection.up).flatMap(s=>(s.pc.remoteDescription?.sdp||'').split('\n').filter(line=>line.startsWith('a=candidate:')&&line.includes(' typ host')).map(line=>Number(line.split(' ')[5]))));
 assert(localPorts.length>0&&localPorts.every(port=>port>=47800&&port<=48311));
 console.log('Server address discovery passed; local ICE ports stay within the configured range.');
 const perms=await q.evaluate(()=>serverConnection.permissions);assert(!perms.includes('op'));assert(!perms.includes('token'));assert(!perms.includes('record'));
 await command(q,'Fictional meeting check');await p.getByText('Fictional meeting check',{exact:true}).waitFor();
 let media=[];
 for(let attempt=0;attempt<12;attempt++) {
  media=await q.evaluate(async()=>{
   const results=[];
   for(const s of Object.values(serverConnection.down)) {
    const stats=await s.pc.getStats();
    stats.forEach(r=>{if(r.type==='inbound-rtp')results.push({kind:r.kind,bytesReceived:r.bytesReceived,framesDecoded:r.framesDecoded})});
   }
   return results;
  });
  if(media.some(r=>r.kind==='video'&&r.framesDecoded>=3))break;
  await q.waitForTimeout(1000);
 }
 console.log('connections',await q.evaluate(()=>({up:Object.values(serverConnection.up).map(s=>({state:s.pc.iceConnectionState,tracks:s.stream?.getTracks().map(t=>t.kind)})),down:Object.values(serverConnection.down).map(s=>({state:s.pc.iceConnectionState}))})));
 console.log('inbound media',media);assert(media.some(x=>x.kind==='video'&&x.framesDecoded>=3));assert(media.some(x=>x.kind==='audio'&&x.bytesReceived>0));assert.deepEqual(outside,[]);
 console.log('Native invitation, independent guest, chat and media passed; no browser external requests.');
 // Verify the configured bound with receive-only guests, not a load test.
 const guests=[];
 for(const name of ['BoundedGuest2','BoundedGuest3','RejectedGuest4']){
  await command(p,`/invite ${name} 10min`);
  const link=p.locator('#box a[href*="token="]').last();
  await p.waitForTimeout(300);const url=await link.getAttribute('href');
  const ctx=await browser.newContext();guests.push(ctx);const tab=await ctx.newPage();
  await tab.goto(url);await tab.locator('#connectbutton').click();
  if(name==='RejectedGuest4'){
   await tab.getByText(/too many users/i).waitFor({timeout:10000});
   console.log('Fifth client rejected by native four-client bound.');
  }else await tab.waitForFunction(expected=>serverConnection?.username===expected&&Object.keys(serverConnection.users).length>=3,name);
 }
 await p.close();
 await q.waitForFunction(()=>!serverConnection?.group);
 console.log('Last moderator disconnect triggers native guest disconnect.');
 for(const ctx of guests)await ctx.close();
}finally{await browser.close()}
