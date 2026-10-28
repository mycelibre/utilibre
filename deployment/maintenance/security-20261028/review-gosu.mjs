// Read-only, exact-component attribution; no runtime mutation or version waiver.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {eligible,prove,binarySha256} from './gosu-policy.mjs';
process.umask(0o077);const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/gosu';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./go-functions.json',import.meta.url)),tool=dir+'/inspect-recorded';
assert.equal(sha(tool),spec.binarySha256);assert.equal(sha(new URL('./go-functions.go',import.meta.url)),spec.sourceSha256);
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:20000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}).trim();
assert.equal(sha(dir+'/tls-control'),spec.controlSha256);assert.equal(JSON.parse(run(tool,[dir+'/tls-control'])).x509,true);
assert.throws(()=>run(tool,[new URL('./go-functions.json',import.meta.url).pathname]));
const old=read(root+'/gosu-security-20261011/dependencies/build.json'),checks=read(root+'/gosu-security-20261011/dependencies/checks.json');
assert.equal(old.binarySha256,binarySha256);assert.equal(checks.binarySha256,binarySha256);assert.equal(checks.status,'passed');assert(checks.rows.every(r=>r.privilegeDrop&&r.invalidIdentityDenied&&r.nativeExitStatus&&r.execReplacesPid1));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const proofs=[],decisions=[];
for(const item of queue.items.filter(eligible)){
 assert.equal(scan.images.find(i=>i.id===item.artifact)?.status,'checked');
 const temp=fs.mkdtempSync(dir+'/live-helper-');
 try{
  for(const name of item.containers){
   assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
   assert.equal(run('docker',['inspect','--format','{{.State.Running}}',name]),'true');
   const binary=temp+'/'+name;run('docker',['cp',name+':/usr/local/bin/gosu',binary]);
   const proof={...JSON.parse(run(tool,[binary])),sha256:sha(binary)};assert(prove(item,proof));proofs.push({name,artifact:item.artifact,...proof});
   assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
  }
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'CVE-2026-111943 / GO-2026-6809 affects crypto/x509.Certificate.Verify. This exact gosu privilege-drop executable has no linked crypto/x509 functions: the complete ELF .gopclntab contains 2176 functions including main.main, module github.com/tianon/gosu, Go 1.26.9. Every live role was copied read-only and matches SHA256 '+binarySha256+'. The pinned Go debug/gosym inspector parses the full table, detects the affected package in a real TLS-positive control, and rejects non-ELF input. Existing identity, supplementary-group, denial and exec tests are retained. This is component attribution, not an upgrade or a waiver for other Go programs/advisories. No database was restarted. Evidence: security-20261028/gosu/review.json; https://pkg.go.dev/vuln/GO-2026-6809'}));
 }finally{fs.rmSync(temp,{recursive:true});}
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,decisions,proofs,inspector:spec,productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,liveRoles:proofs.length,productionChanged:false}));
