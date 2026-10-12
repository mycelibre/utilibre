#!/usr/bin/env node
// Export exact compiler artifacts/evidence; never reads a production volume.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,s=JSON.parse(fs.readFileSync(here+'spec.json')),w=s.work;
const run=a=>execFileSync(a[0],a.slice(1),{encoding:'utf8',timeout:60000,maxBuffer:8e6,stdio:['ignore','pipe','pipe']}).trim();
const sha=b=>createHash('sha256').update(b).digest('hex');
const log=fs.readFileSync(w+'/build.log','utf8');assert(log.includes('dpkg-buildpackage: info: binary-only upload (no source included)'),'Debian binary build/check did not complete');
const sourceLog=fs.readFileSync(w+'/source-build.log','utf8');assert(sourceLog.endsWith('OPENLDAP_SOURCE_PASSED\n'),'Clean source package did not complete');
fs.mkdirSync(w+'/out',{recursive:true});
const names=['libldap-2.5-0_'+s.version+'_amd64.deb','openldap_'+s.version+'.dsc','openldap_'+s.version+'.debian.tar.xz','openldap_'+s.version+'_amd64.buildinfo','native'];
for(const name of names)run(['docker','cp',s.builder+':'+s.builderWork+'/'+name,w+'/out/'+name]);
const files=Object.fromEntries(names.map(name=>[name,{sha256:sha(fs.readFileSync(w+'/out/'+name)),bytes:fs.statSync(w+'/out/'+name).size}]));
const matched=log.split(/^>>>>> Starting /m).slice(1).flatMap(block=>{
  const m=block.match(/^>>>>> (test\d+[^\n]+) completed OK for ([^\n]+) after (\d+) seconds\./m);
  if(!m)return [];
  const body=block.slice(0,m.index),skip=body.split('\n').filter(line=>/\b(?:tests? skipped|skipping (?:test|GSSAPI tests)|skip(?:ping)? this test|Test \d+ is currently disabled)\b/i.test(line));
  return [{name:m[1],backend:m[2],seconds:Number(m[3]),status:skip.length?'skipped':'passed',skip}];
});
assert(matched.length>30,'Unexpectedly few upstream integration tests');
const skipped=log.split('\n').filter(x=>/skip|disabled/i.test(x)&&/test|not configured|TLS/i.test(x));
const patches=run(['docker','exec',s.builder,'sh','-ec','cd /work/openldap-followup/tree; sha256sum debian/patches/utilibre-*.patch; cat .pc/applied-patches; sha256sum libraries/libldap/fetch.c libraries/libldap/url.c']);
for(const hash of Object.values(s.patches))assert(patches.includes(hash));
const packages=run(['docker','exec',s.builder,'dpkg-query','-W','-f=${Package}\t${Version}\n']);
fs.writeFileSync(w+'/out/build-dependencies.tsv',packages+'\n');
const builder=JSON.parse(run(['docker','inspect',s.builder]))[0];assert.equal(builder.Image,s.builderImage);
fs.writeFileSync(w+'/out/provenance.json',JSON.stringify({date:new Date().toISOString(),version:s.version,source:s.sourceFiles,upstreamPatches:s.patches,builder:{image:builder.Image,cpu:builder.HostConfig.NanoCpus,memory:builder.HostConfig.Memory,pids:builder.HostConfig.PidsLimit},buildLogSha256:sha(log),sourceLogSha256:sha(sourceLog),files,tests:matched,skipped,debianDisabledTests:['test063-delta-multiprovider','test069-delta-multiprovider-starttls'],patches,applicationCandidate:false,deployed:false},null,2)+'\n');
console.log(`Native package/source exported; ${matched.filter(x=>x.status==='passed').length} upstream tests passed, ${matched.filter(x=>x.status==='skipped').length} skipped, two Debian-disabled timing-sensitive tests.`);
