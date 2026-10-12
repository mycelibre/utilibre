// Five exact version-mismatched records only. Read-only live inventory and
// draft decisions; never change installed status fragments or the ledger.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {archives,eligible,matchingRow,prove} from './policy.mjs';
import {readIndexes} from '../xserver-followup/authenticate-dhi.mjs';
import {inventory,command} from '../component-followup/inventory.mjs';
import {payloadManifest} from '../vendor-leaves-final/dhi-proof.mjs';
import {absentComponent} from '../review-binary-scope.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const base='/var/lib/utilibre-maintenance',root=base+'/dhi-binary-attribution-20261012';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const scan=read(base+'/security.json'),queue=read(base+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const acquisition=read(root+'/acquisition.json');assert.equal(acquisition.status,'passed');
const index=readIndexes().find(x=>x.name==='main/binary-amd64/Packages');assert.equal(index.hash,acquisition.signedIndexSha256);
const stanzas=index.text.split(/\n\s*\n/).map(s=>Object.fromEntries(s.split('\n').filter(l=>/^[\w-]+: /.test(l)).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+2)])));
const evidence=[],decisions=[],skipped=[],manifests=new Map();
function archive(packageName){
 if(manifests.has(packageName))return manifests.get(packageName);
 const pin=archives[packageName],row=acquisition.archives.find(a=>a.package===packageName);assert(row);assert.equal(row.version,pin.version);assert.equal(row.sha256,pin.sha256);assert(/^[A-Za-z0-9_.+~-]+_amd64\.deb$/.test(row.file));
 assert(stanzas.some(s=>s.Package===packageName&&s.Version===pin.version&&s.SHA256===pin.sha256));
 const file=root+'/packages/'+row.file;assert.equal(sha(fs.readFileSync(file)),pin.sha256);assert.equal(command('dpkg-deb',['-f',file,'Package']),packageName);assert.equal(command('dpkg-deb',['-f',file,'Version']),pin.version);
 const temporary=fs.mkdtempSync('/tmp/utilibre-dhi-binary-payload-');
 try{command('dpkg-deb',['-x',file,temporary]);const manifest=payloadManifest(temporary);manifests.set(packageName,manifest);return manifest;}
 finally{assert(temporary.startsWith('/tmp/utilibre-dhi-binary-payload-')&&!temporary.includes('/../'));fs.rmSync(temporary,{recursive:true});}
}
for(const item of queue.items.filter(eligible)){
 try{
  const row=matchingRow(item),name=row.container;assert.equal(scan.images.find(i=>i.id===item.artifact)?.status,'checked');
  assert.equal(command('docker',['inspect','--format','{{.Image}}',name]),item.artifact);assert.equal(command('docker',['inspect','--format','{{.State.Running}}',name]),'true');
  const expected=archive(item.package),inv=inventory(item.package,name);assert.equal(inv.installed,archives[item.package].version);
  const actual=inv.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(actual,expected,'Complete actual package payload differs from authenticated archive; missing files are not excused');
  const paths=inv.records.map(r=>r.path),component=absentComponent(item,paths);assert(component,'Affected component appears in the actual package inventory');
  assert(absentComponent(item,expected.map(f=>f.path)),'Affected component appears in signed package');
  const residualPath='/var/lib/dpkg/status.d/'+item.package,raw=execFileSync('docker',['exec',name,'cat',residualPath],{timeout:10000,maxBuffer:16384,stdio:['ignore','pipe','pipe']}),text=raw.toString();
  const field=key=>{const m=[...text.matchAll(new RegExp('^'+key+': (.+)$','gm'))];assert.equal(m.length,1);return m[0][1];};
  assert.equal(field('Package'),item.package);assert.equal(field('Source'),row.source);assert.equal(field('Version'),item.installed);
  const p={image:item.artifact,container:name,package:item.package,actualVersion:inv.installed,archiveSha256:archives[item.package].sha256,signedIndexSha256:index.hash,authenticatedIndex:true,payloadExact:true,fileCount:actual.length,inventorySha256:sha(JSON.stringify(inv.records)),componentAbsentFromPackage:true,component:row.source==='perl'?'Archive::Tar':'systemd-homed',residual:{path:residualPath,version:field('Version'),source:field('Source'),sha256:sha(raw)},records:inv.records};
  prove(item,p);assert.equal(command('docker',['inspect','--format','{{.Image}}',name]),item.artifact);evidence.push(p);
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Binary-subpackage attribution only: ${component}. Actual ${item.package} ${p.actualVersion} matches every regular file and symlink of the signed DHI archive ${p.archiveSha256}; that package contains none of the affected component. Scanner version ${item.installed} is independently verified in the retained ${residualPath} fragment, hash ${p.residual.sha256}; metadata was not edited or treated as the actual package version. Current image ${p.image}; package inventory ${p.inventorySha256}. Evidence: dhi-binary-attribution-20261012/evidence.json. The affected sibling package and other same-image findings remain separate; this is not a source-wide repair or whole-image safety claim. https://security-tracker.debian.org/tracker/${item.id}`}));
 }catch(error){skipped.push({key:item.key,package:item.package,artifact:item.artifact,error:String(error.message).slice(0,240)});}
}
assert.equal(read(base+'/security.json').completedAt,scan.completedAt,'Concurrent scan invalidates evidence');for(const p of evidence)assert.equal(command('docker',['inspect','--format','{{.Image}}',p.container]),p.image,'Concurrent deployment invalidates evidence');
const date=new Date().toISOString();fs.writeFileSync(root+'/evidence.json',JSON.stringify({date,scanDate:scan.completedAt,acquisitionSha256:sha(fs.readFileSync(root+'/acquisition.json')),evidence},null,2)+'\n');
fs.writeFileSync(root+'/review.json',JSON.stringify({date,scanDate:scan.completedAt,applied:false,decisions,skipped,evidenceSha256:sha(fs.readFileSync(root+'/evidence.json'))},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,inventoryGroups:evidence.length,skipped,applied:false,productionChanged:false}));
