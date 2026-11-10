// Recheck this one reviewed mitigation during queue construction. No network,
// service execution, settings inspection or user-content reads are involved.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const repo=new URL('../../../',import.meta.url).pathname;
const reportPath='/var/lib/utilibre-maintenance/security-20261109/remaining-high/superseded-go-review.json';
const digest=b=>createHash('sha256').update(b).digest('hex');
export function validateState(report,{hashFile,runtime}){
  assert.equal(report.schemaVersion,1);assert.equal(report.replacements.length,14);
  assert(Object.keys(report.guards).length>=7);
  for(const [path,hash]of Object.entries(report.guards)){
    assert(path.startsWith('deployment/maintenance/')&&!path.split('/').includes('..'));
    assert(/^[a-f0-9]{64}$/.test(hash));assert.equal(hashFile(path),hash);
  }
  for(const replacement of report.replacements){
    assert(replacement.containers.length>0&&replacement.binary.startsWith('/')&&!replacement.binary.split('/').includes('..'));
    for(const name of replacement.containers){
      assert(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name));
      const current=runtime(name,replacement.binary);
      assert.equal(current.image,replacement.imageId);assert.equal(current.binarySha256,replacement.binarySha256);
    }
  }
  return true;
}
export function verifyReview(expectedHash){
  assert(/^[a-f0-9]{64}$/.test(expectedHash));
  const bytes=fs.readFileSync(reportPath);assert.equal(digest(bytes),expectedHash);
  const report=JSON.parse(bytes),names=report.replacements.flatMap(r=>r.containers);
  assert(names.length<=20&&names.every(n=>/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(n)));
  const inspect=()=>cp.execFileSync('docker',['inspect','--format','{"name":{{json .Name}},"image":{{json .Image}},"pid":{{.State.Pid}},"running":{{.State.Running}}}',...names],{encoding:'utf8',timeout:15000,maxBuffer:65536,stdio:['ignore','pipe','pipe']}).trim();
  const before=inspect(),states=new Map(before.split('\n').map(s=>{const r=JSON.parse(s);return[r.name.slice(1),r];}));
  validateState(report,{hashFile:path=>digest(fs.readFileSync(repo+path)),runtime:(name,binary)=>{
    const live=states.get(name);assert(live?.running&&live.pid>0);
    const path='/proc/'+live.pid+'/root'+binary;assert(fs.statSync(path).size<=256*1024**2);
    return {image:live.image,binarySha256:digest(fs.readFileSync(path))};
  }});
  assert.equal(inspect(),before,'Runtime changed during review-condition check');
  const keys=new Set(report.decisions.map(d=>d.key));
  assert.equal(keys.size,22);assert([...keys].every(k=>/^[a-f0-9]{64}$/.test(k)));
  return keys;
}
