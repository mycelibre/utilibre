// Offline prepare only. Authenticated source, completed release and current bytes.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {root,json,sha} from './proofs.mjs';import {completed} from './review-proof.mjs';
import {eligible,id,commit,patchSha256,sourceSha256,functionBlock} from './passive-policy.mjs';
import {applyVendorSeries,strictReverse} from '../xserver-followup/source-proof.mjs';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);const [out]=process.argv.slice(2);assert(process.argv.length===3&&path.isAbsolute(out));
fs.mkdirSync(out,{mode:0o700});
const run=(cmd,args,timeout=30000)=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const scan=json('/var/lib/utilibre-maintenance/security.json'),queue=json('/var/lib/utilibre-maintenance/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const patch='/var/lib/utilibre-maintenance/xserver-followup-20261012/dhi/source/debian/patches/dhi-cve-2026-93516-xorg-server.patch';assert.equal(sha(patch),patchSha256);
const rows=[],roles={};
for(const row of json(root+'/source.json').rows){
 for(const a of row.archives)assert.equal(sha(row.dir+'/'+a.file),a.sha256);
 const tree=out+'/source-'+row.role;run('dpkg-source',['-x',row.dir+'/'+row.dsc,tree]);
 const series=applyVendorSeries(tree);strictReverse(tree,patch);
 assert.equal(sha(tree+'/dix/devices.c'),sourceSha256);assert.equal(sha(root+'/work/source-'+row.role+'/dix/devices.c'),sourceSha256);
 const block=functionBlock(fs.readFileSync(tree+'/dix/devices.c','utf8'));
 const fixture=fs.readFileSync(new URL('./passive-fixture.c',import.meta.url),'utf8').replace('/* VERIFIED_UPSTREAM_FUNCTIONS */',block);
 fs.writeFileSync(out+'/fixture-'+row.role+'.c',fixture);
 roles[row.role]=completed(row.role,scan);rows.push({role:row.role,archives:row.archives,series,sourceSha256,compiledSourceFixture:sha(out+'/fixture-'+row.role+'.c')});
 fs.rmSync(tree,{recursive:true}); // Only this run's disposable extracted source.
}
// Reuse the pinned, already-local native compiler image. No downloads/mounts of
// host libraries, production paths, credentials or container-management socket.
const image='sha256:f45539e1b2380da919ac34c184cb1a19b0c7a1037f993fd30ae37a1a1f8b8604';
for(const row of rows){
 const file=out+'/fixture-'+row.role+'.c';fs.chmodSync(file,0o644);
 const cid=out+'/'+row.role+'.cid';
 try {row.unitOutput=run('docker',['run','--rm','--cidfile',cid,'--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user','65534:65534','--cpus=0.5','--memory=128m','--memory-swap=128m','--pids-limit=32','--ulimit','core=0','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=16m,mode=1777','--mount',`type=bind,src=${file},dst=/fixture.c,readonly`,'--entrypoint','sh',image,'-ec','cc -Wall -Wextra -Werror -Wno-error=unused-parameter -O2 /fixture.c -o /tmp/check && /tmp/check']);}
 finally {if(fs.existsSync(cid)){const own=fs.readFileSync(cid,'utf8').trim();assert(/^[a-f0-9]{64}$/.test(own));try{run('docker',['rm','-f',own]);}catch(e){assert(String(e.stderr).includes('No such container'));}}}
}
const decisions=queue.items.filter(eligible).map(i=>{const p=roles[i.scope==='host-os'?'host':'dhi'];if(p.image)assert.equal(i.artifact,p.image);return validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Installed native Xserver fix, not a version-only waiver. Authenticated host 21.1.25 and complete DHI quilt source contain upstream ${commit}; dix/devices.c SHA256 ${sourceSha256}. Exact installed payloads match completed single-screen release ${p.receiptSha256}. Compiled real-function fixture verifies removal of direct AND modifier-device passive grabs across clients, unrelated grabs retained, repeat safe. Native pixel/one-screen/export checks retained in the release evidence. No live exploit or full native UAF reproduction is claimed. https://gitlab.freedesktop.org/xorg/xserver/-/commit/${commit} . Raw scanner unchanged.`})});
assert.equal(json('/var/lib/utilibre-maintenance/security.json').completedAt,scan.completedAt);
const evidence={date:new Date().toISOString(),scanDate:scan.completedAt,id,commit,patchSha256,roles,rows,productionChanged:false};
fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(out+'/review.json',JSON.stringify({date:evidence.date,scanDate:scan.completedAt,applied:false,decisions,evidenceSha256:sha(out+'/evidence.json')},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,sourceAndLivePayloadsVerified:true,compiledUnitChecks:rows.length,applied:false}));
