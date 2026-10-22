// Read-only receipt/live-image reconciliation. Public output is allowlisted;
// never export environments, private URLs, raw scans or fixture credentials.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance', batch=root+'/security-20261022';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=['nginx/gateways-release.json','nginx/artifacts-release.json','release.json','redirects/release.json','privatebin-nginx/release.json'];
const current=new Map(), receipts=[];
for(const file of files){
 const value=read(batch+'/'+file);assert.equal(value.status,'passed');
 const rows=value.rows||value.groups;assert(rows.length);
 for(const row of rows){
  assert.equal(row.status,'passed');assert(/^sha256:[a-f0-9]{64}$/.test(row.newImage));
  const previous=current.get(row.name);
  if(previous)assert.equal(row.oldImage,previous.image,'Broken release chain');
  current.set(row.name,{container:row.name,image:row.newImage,reference:row.newRef,receipt:file});
 }
 receipts.push({file,sha256:hash(batch+'/'+file),releases:rows.length,status:value.status});
}
for(const row of current.values()){
 const live=JSON.parse(execFileSync('docker',['inspect','--format','{{json .}}',row.container],{encoding:'utf8',timeout:10000,maxBuffer:2*1024**2}));
 assert.equal(live.Image,row.image);assert(live.State.Running);assert(!live.State.Health||live.State.Health.Status==='healthy');
 row.running=true;row.health=live.State.Health?.Status||'no native healthcheck';
}
const staticRelease=read(batch+'/texlyre/release.json');assert.equal(staticRelease.status,'passed');
const gristSource=read(batch+'/grist/source-completion.json');assert(gristSource.passed&&gristSource.applicationChanged===false);
const before=read(batch+'/before-security-queue.json'), after=read(root+'/security-queue.json'), scan=read(root+'/security.json');
assert.equal(scan.status,'checked');assert.equal(after.scanDate,scan.completedAt);
const counts=q=>({raw:q.items.length,critical:q.items.filter(i=>i.severity==='CRITICAL').length,high:q.items.filter(i=>i.severity==='HIGH').length,unresolvedCritical:q.items.filter(i=>i.severity==='CRITICAL'&&i.status==='needs-review').length,unresolvedHigh:q.items.filter(i=>i.severity==='HIGH'&&i.status==='needs-review').length});
const result={schemaVersion:1,recordedAt:new Date().toISOString(),status:'released-with-remaining-security-work',
 distinctContainers:current.size,receipts,containers:[...current.values()].sort((a,b)=>a.container.localeCompare(b.container)),
 staticRelease:{application:'TeXlyre',status:staticRelease.status,archiveSha256:staticRelease.archiveSha256,sourceSha256:staticRelease.sourceSha256,userDataChanged:staticRelease.userDataChanged},
 sourceCorrection:{application:'Grist',url:gristSource.url,sha256:gristSource.archiveSha256,compiledAdapterSha256:gristSource.compiledSha256,nativePngVerified:gristSource.nativePng,applicationChanged:gristSource.applicationChanged},
 assessment:{before:{date:before.scanDate,...counts(before)},after:{date:after.scanDate,...counts(after)},images:scan.images.length,containers:scan.containers,sources:scan.sources.length,host:scan.host.status,
 limitations:['Counts are package/target records, not unique vulnerabilities or confirmed exploits.','Raw critical records remain visible; exact, expiring reviews identify repaired or inapplicable payloads.','Full before/after scans may use different refreshed advisory data. Individual candidate gates retained one database snapshot.','No fleet-wide security-clearance or real-device compatibility claim.']}};
console.log(JSON.stringify(result,null,2));
