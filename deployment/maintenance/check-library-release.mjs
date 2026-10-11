// Read-only live checks for this finite, staged release. Account/data workflows
// are tested separately in disposable stacks, not against visitors' documents.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const rows=[
 ['utilibre-community-rallly-1','utilibre-rallly:libraries-security-20261011-p3','bfdb030bc867d6bd94eaf7c55d59d289a63f62dc217b9494b975c57dfe2aa88c'],
 ['utilibre-community-uptime-kuma-1','utilibre-kuma:2.5.6-security-20261011','3f54318380deeb275b2127133ec0fdd59de12ebe295c58bf3f99174b3f86f475'],
 ['utilibre-expanded-resume-1','utilibre-resume:seroval-security-20261011-p3','85ea55446d742a559ba0625878dcbf3295723b889d7751a6d628f34cfae085c3'],
 ['utilibre-expanded-penpot-admin-console-1','utilibre-penpot-admin:seroval-security-20261011-p2','e907c2fd6febb2cefa046978c718e3e4e68cf3444201c574bdf2421c07123bc1'],
 ['utilibre-expanded-penpot-backend-1','utilibre-penpot-backend:2.18.3-libraries-security-20261011','4746bdafbe62fd3423c6802e8ee106b453d00be47570e7e9c37ec4e735430301'],
 ['utilibre-expanded-penpot-frontend-1','penpotapp/frontend:2.18.3@sha256:bb8abe27d53de84c95597f2c02c0e702b2779971fb0703e543f9ecf183e999f6','bb8abe27d53de84c95597f2c02c0e702b2779971fb0703e543f9ecf183e999f6'],
 ['utilibre-expanded-penpot-exporter-1','utilibre-penpot-exporter:2.18.3-vendor-security-20261011','4b6fd678f60b95698cfecbc175844bdc95c5bdb80d81d936ea010c46ad987dc1'],
];
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:30000});
const images=[];
for(const [name,ref,id] of rows){
 const x=JSON.parse(docker('inspect',name))[0];
 assert.equal(x.Image,'sha256:'+id);assert.equal(x.Config.Image,ref);assert(x.State.Running);
 if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
 images.push({name,ref,image:x.Image,health:x.State.Health?.Status||'no native healthcheck'});
}
const browser=await chromium.launch(),pages=[];
try{
 for(const url of ['https://poll.utilibre.org/login','https://status.utilibre.org/status/utilibre','https://cv.utilibre.org/','https://design.utilibre.org/']){
  const context=await browser.newContext({locale:'en-US'}),page=await context.newPage(),errors=[],origins=new Set();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',request=>{const parsed=new URL(request.url());if(['http:','https:','ws:','wss:'].includes(parsed.protocol))origins.add(parsed.origin);});
  const response=await page.goto(url,{waitUntil:'networkidle',timeout:45000});
  assert.equal(response.status(),200,url);
  const isPenpot=url==='https://design.utilibre.org/';
  if(isPenpot){
   // Native dynamic imports can initialize after networkidle. Wait for the
   // actual login screen, not an empty app shell or an arbitrary sleep.
   await page.getByRole('heading',{name:'Log into my account',exact:true}).waitFor({state:'visible',timeout:30000});
   await page.getByText('Utilibre',{exact:true}).waitFor({state:'visible',timeout:30000});
   assert.deepEqual([...origins],['https://design.utilibre.org']);
  }
  assert((await page.locator('body').innerText()).trim().length>30);
  assert.deepEqual(errors,[],url);
  const result={url,status:response.status(),pageErrors:0};
  if(isPenpot){
   // Start the supported OIDC handoff without entering credentials. Retain
   // origins only: authorization query strings contain transient state.
   await Promise.all([
    page.waitForURL(destination=>destination.origin==='https://auth.utilibre.org',{timeout:30000}),
    page.getByText('Utilibre',{exact:true}).click(),
   ]);
   await page.locator('input[autocomplete="username"]:visible').first().waitFor({state:'visible',timeout:30000});
   assert.equal(new URL(page.url()).origin,'https://auth.utilibre.org');
   assert.deepEqual([...origins].sort(),['https://auth.utilibre.org','https://design.utilibre.org']);
   assert.deepEqual(errors,[],url);
   Object.assign(result,{nativeLoginVisible:true,oidcHandoff:'https://auth.utilibre.org',requestOrigins:[...origins].sort()});
  }
  pages.push(result);await context.close();
 }
}finally{await browser.close();}
const dir='/var/lib/utilibre-maintenance/library-release-20261011';await mkdir(dir,{recursive:true,mode:0o700});
const result={date:new Date().toISOString(),status:'passed',images,pages,limits:'Chromium desktop unauthenticated entry pages and Penpot OIDC handoff only; no credentials submitted. Separate isolated native data/restore tests are required; this is not an exploit or full-application security test.'};
await writeFile(dir+'/live.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
