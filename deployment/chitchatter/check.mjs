import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base=process.argv[2]||'http://localhost:3200/';
const report='/opt/utilibre/reports/chitchatter-20261009';
await mkdir(report,{recursive:true,mode:0o700});
const browser=await chromium.launch({args:['--host-resolver-rules=MAP localhost 10.10.1.43','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const outside=[],requests=[],errors=[],sockets=[];
async function profile(){
 const c=await browser.newContext({acceptDownloads:true});
 await c.route('**/*',r=>{const u=new URL(r.request().url());requests.push({url:u.href,method:r.request().method()});if(u.origin!==new URL(base).origin){outside.push(u.href);return r.abort()}return r.continue()});
 await c.addInitScript(()=>{window.__peerConfigs=[];window.__peers=[];const Native=window.RTCPeerConnection;window.RTCPeerConnection=class extends Native{constructor(config,...rest){super(config,...rest);window.__peerConfigs.push(config);window.__peers.push(this)}}});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('websocket',w=>{sockets.push(w.url());w.on('socketerror',e=>errors.push(String(e)))});return{c,p};
}
try{
 const one=await profile(),two=await profile();
 await one.p.goto(base);await one.p.getByRole('button',{name:'Join public room',exact:true}).click();
 const room=one.p.url();await two.p.goto(room);
 await one.p.getByPlaceholder('Your message').first().waitFor();await two.p.getByPlaceholder('Your message').first().waitFor();
 await one.p.getByPlaceholder('Your message').first().fill('Fictional library meeting: 24 books.');await one.p.getByPlaceholder('Your message').first().press('Enter');
 await two.p.getByText('Fictional library meeting: 24 books.',{exact:true}).waitFor({timeout:60000});
 await two.p.getByPlaceholder('Your message').first().fill('Fictional reply: agreed.');await two.p.getByPlaceholder('Your message').first().press('Enter');
 await one.p.getByText('Fictional reply: agreed.',{exact:true}).waitFor({timeout:30000});
 // A received tracking image/video link must not make a network request.
 await one.p.getByPlaceholder('Your message').first().fill('![fictional](https://example.invalid/should-not-load.png)');await one.p.getByPlaceholder('Your message').first().press('Enter');await two.p.getByRole('link',{name:'fictional',exact:true}).waitFor();
 await one.p.getByPlaceholder('Your message').first().fill('https://www.youtube.com/watch?v=fictional123');await one.p.getByPlaceholder('Your message').first().press('Enter');await two.p.getByRole('link',{name:'https://www.youtube.com/watch?v=fictional123',exact:true}).waitFor();
 const payload='Fictional transfer only. No personal data.\n';
 await one.p.locator('#file-upload').setInputFiles({name:'fictional-chat.txt',mimeType:'text/plain',buffer:Buffer.from(payload)});
 const download=two.p.waitForEvent('download',{timeout:60000});
 await two.p.getByRole('button',{name:/Download files being offered/}).click();
 await(await download).saveAs(report+'/fictional-chat.txt');assert.equal(await readFile(report+'/fictional-chat.txt','utf8'),payload);
 await one.p.getByRole('button',{name:'call',exact:true}).click();
 await one.p.waitForTimeout(1500);
 const localAudio=await one.p.evaluate(()=>window.__peers.some(pc=>pc.getSenders().some(s=>s.track?.kind==='audio')));
 assert(localAudio,'native fake microphone track attached');
 const configs=await one.p.evaluate(()=>window.__peerConfigs);
 assert(configs.length>0);for(const c of configs)assert.deepEqual(c.iceServers,[{urls:'stun:turn.utilibre.org:3478'}]);
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);assert(sockets.every(u=>new URL(u).host===new URL(base).host));
 await writeFile(report+'/result.json',JSON.stringify({date:new Date().toISOString(),base,room,textRoundtrip:true,fileRoundtrip:true,fakeMicrophoneTrack:true,externalEmbedsBlocked:true,configs,requests,sockets,outside,errors},null,2));
 await two.p.screenshot({path:report+'/two-peers.png',fullPage:true});console.log('PASS two-peer native chat/file roundtrip and fake microphone track; own discovery/STUN, no external image/video fetch');
}finally{await browser.close()}
