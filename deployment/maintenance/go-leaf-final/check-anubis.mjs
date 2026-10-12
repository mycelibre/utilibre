// Two independent browser challenges against a native loopback-only proxy.
import assert from 'node:assert/strict';
import http from 'node:http';
import cp from 'node:child_process';
import fs from 'node:fs/promises';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
const image='utilibre-anubis:1.27.0-go-security-20261011';
const name='maintenance-anubis-native';
const here=new URL('.',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/go-leaf-final-20261011/output';
const base='http://127.0.0.1:33145';
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<h1>Fictional native proxy result</h1>');});
await new Promise(r=>server.listen(33146,'127.0.0.1',r));
let browser;
const unexpected=[];
try{
 docker('run','-d','--name',name,'--network','host','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
  '--memory','128m','--cpus','.5','--log-driver','none','-v',here+'anubis-native-policy.yaml:/policy.yaml:ro',image,
  '-bind','127.0.0.1:33145','-metrics-bind','','-policy-fname','/policy.yaml','-target','http://127.0.0.1:33146',
  '-use-remote-address','-slog-level','ERROR');
 let ready=false;for(let n=0;n<50;n++){try{ready=(await fetch(base+'/allow')).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}assert(ready);
 assert.equal((await fetch(base+'/blocked')).status,403);
 const challenge=await fetch(base+'/fast');assert.equal(challenge.status,200);assert((await challenge.text()).includes('anubis_challenge'));
 browser=await chromium.launch({args:['--no-sandbox']});
 for(let i=0;i<2;i++){
  const context=await browser.newContext();
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){unexpected.push(u.origin);return route.abort();}return route.continue();});
  const page=await context.newPage();
  await page.goto(base+'/fast');
  await page.getByRole('heading',{name:'Fictional native proxy result'}).waitFor({timeout:45000});
  const cookies=await context.cookies();assert(cookies.some(c=>c.name.includes('anubis-auth')));
  await page.reload();await page.getByRole('heading',{name:'Fictional native proxy result'}).waitFor();
  await context.close();
 }
 assert.deepEqual(unexpected,[]);
 const receipt={imageId:docker('image','inspect',image,'--format','{{.Id}}'),passed:true,
  nativeAllowAndDeny:true,twoIndependentBrowserPowChallenges:true,authenticatedReload:true,externalBrowserCalls:0,
  environment:'Headless Chromium, isolated synthetic loopback upstream; production policies unchanged'};
 await fs.writeFile(root+'/anubis-native.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(receipt));
}finally{await browser?.close();await new Promise(r=>server.close(r));try{docker('rm','-f',name);}catch{}}
