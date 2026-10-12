// Read-only, expiring findings review for the exact Hono deployment, not a
// global exemption for Next.js or all applications using Better Auth.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
const dir='/var/lib/utilibre-maintenance/next-leaves-final-20261012';
const name='utilibre-expanded-resume-1';
const docker=args=>{try{return execFileSync('docker',args,{encoding:'utf8',maxBuffer:1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']});}catch{throw Error('Resume evidence check failed; child details suppressed');}};
// Bind to the current artifact only after repeating the complete app-payload
// checks. A native gzip/ncurses overlay must not make an old ID the evidence.
const image=docker(['inspect','--format','{{.Image}}',name]).trim();
assert.match(image,/^sha256:[a-f0-9]{64}$/);
assert.deepEqual(JSON.parse(docker(['inspect','--format','{{json .Config.Cmd}}',name])),['node','/usr/local/bin/utilibre-resume-start.mjs']);
const entry=docker(['exec',name,'cat','/app/apps/server/dist/index.mjs']);
assert.equal(createHash('sha256').update(entry).digest('hex'),'14a3398db0193e3fc05a4ba01be90ccc3a2a5185b00257ddc0acff678619bf66');
assert(entry.includes('import { serve } from "@hono/node-server";'));
assert(entry.includes('const server = serve({')&&entry.includes('fetch: app.fetch'));
const start=docker(['exec',name,'cat','/usr/local/bin/utilibre-resume-start.mjs']);
assert.equal(start,readFileSync(new URL('../../expanded/resume-start.mjs',import.meta.url),'utf8'));
assert(start.includes("await import('/app/apps/server/dist/index.mjs')"));
const code=String.raw`
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root='/app/node_modules/.pnpm',dir='/app/apps/server/dist';
const files=fs.readdirSync(dir).filter(x=>/\.mjs$/.test(x));
const bad=[],hash=crypto.createHash('sha256');
for(const f of files.sort()){
 const b=fs.readFileSync(path.join(dir,f)),t=b.toString();hash.update(f+'\0').update(b);
 if(/(?:from\s*|import\s*\(|require\s*\()\s*["'](?:next(?:[\/"'])|better-auth\/next-js)/.test(t))bad.push(f);
}
const consumers=[];
for(const d of fs.readdirSync(root)){
 const p=root+'/'+d+'/node_modules/next';
 if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())consumers.push(d.split('@')[0]);
}
const better=fs.readdirSync(root).filter(x=>x.startsWith('better-auth@'));
if(better.length!==1)throw Error('ambiguous auth package');
const bdir=root+'/'+better[0]+'/node_modules/better-auth',bp=JSON.parse(fs.readFileSync(bdir+'/package.json'));
const bpRoot=fs.readFileSync(bdir+'/dist/index.mjs','utf8');
const nextDir=fs.readdirSync(root).filter(x=>x.startsWith('next@'));
if(nextDir.length!==1)throw Error('ambiguous Next package');
console.log(JSON.stringify({compiledModules:files.length,compiledSha256:hash.digest('hex'),nextImports:bad,consumers,
 next:JSON.parse(fs.readFileSync(root+'/'+nextDir[0]+'/node_modules/next/package.json')).version,
 betterAuth:bp.version,nextOptional:bp.peerDependenciesMeta.next.optional,
 rootExport:bp.exports['.'].default,nextExport:bp.exports['./next-js'].default,
 rootImportsNext:bpRoot.includes('next-js')||bpRoot.includes('"next/'),
 production:process.env.NODE_ENV==='production',
 pidOneIsExpected:fs.readFileSync('/proc/1/cmdline').toString().split('\0').includes('/usr/local/bin/utilibre-resume-start.mjs')}));`;
const evidence=JSON.parse(docker(['exec',name,'node','-e',code]));
assert.equal(evidence.compiledModules,56);assert.deepEqual(evidence.nextImports,[]);
assert.equal(evidence.compiledSha256,'6b8977822827a30ef580efe51e678e9839d34655f0ff65d00745f666f9c6f44a','Re-review any application code change');
assert.deepEqual(evidence.consumers,['better-auth']);assert.equal(evidence.next,'16.3.6');
assert.equal(evidence.betterAuth,'1.7.7');assert.equal(evidence.nextOptional,true);
assert.equal(evidence.rootExport,'./dist/index.mjs');assert.equal(evidence.nextExport,'./dist/integrations/next-js.mjs');
assert.equal(evidence.rootImportsNext,false);assert.equal(evidence.production,true);assert.equal(evidence.pidOneIsExpected,true);
const advisories={
 'CVE-2026-94483':['GHSA-cjq9-62q9-8jv4','Next Image Optimization remote-host SSRF'],
 'CVE-2026-94484':['GHSA-mcj8-r9mp-w47p','Next SSG/ISR catch-all response cache poisoning'],
 'CVE-2026-94485':['GHSA-f87g-xv8r-7p7x','Next webpack App Router metadata image routing'],
 'CVE-2026-94543':['GHSA-4jqv-mc3x-m676','Next Pages Router SSG/ISR cache poisoning'],
 'CVE-2026-94544':['GHSA-3w37-wq28-93x7','Next use-cache Draft Mode response sharing'],
 'CVE-2026-94486':['GHSA-39w2-rjm5-chcv','Next development-server MCP endpoint']
};
const queue=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/security-queue.json'));
const scan=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/security.json'));
assert.equal(scan.status,'checked');assert.equal(queue.scanDate,scan.completedAt);
assert(Date.now()-Date.parse(scan.completedAt)<86400000);
assert.equal(scan.images.find(x=>x.id===image)?.status,'checked');
const items=queue.items.filter(i=>i.artifact===image&&i.package==='next'&&i.installed==='16.3.6'&&advisories[i.id]);
assert.equal(items.length,6,'Expected exact six findings, otherwise re-review');
const reviews=items.map(i=>validateDecision({key:i.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:
 `${i.id} requires ${advisories[i.id][1]}. Exact Resume image ${image.slice(7,19)} is a production Hono server, not a Next server: its hash-bound index imports @hono/node-server and serves app.fetch; PID1 invokes that entry through the checked discovery wrapper. All 56 compiled server modules lack Next/BetterAuth Next integration imports. Next 16.3.6 is only Better Auth 1.7.7's optional peer; its next-js integration is a separate unreferenced export. No Next optimizer/router/cache/dev endpoint is served. https://github.com/vercel/next.js/security/advisories/${advisories[i.id][0]} . Package remains installed; this expires and does not cover another image, source-only finding, or another CVE.`}));
mkdirSync(dir,{recursive:true,mode:0o700});
writeFileSync(dir+'/resume-evidence.json',JSON.stringify({date:new Date().toISOString(),imageId:image,passed:true,entrySha256:createHash('sha256').update(entry).digest('hex'),wrapperSha256:createHash('sha256').update(start).digest('hex'),...evidence},null,2)+'\n',{mode:0o600});
writeFileSync(dir+'/resume-reviews.json',JSON.stringify(reviews,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({passed:true,imageId:image,reviewCount:reviews.length,applied:false}));
