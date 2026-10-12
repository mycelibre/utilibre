// The exporter has a real vendor backport. Verify it rather than replace it.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012';
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const container='utilibre-expanded-penpot-exporter-1',image=docker('inspect','--format','{{.Image}}',container);
assert.equal(image,'sha256:906460df3ab8b53623a5a3a5608f2d2c96e0afc0e493abacdc58a7e179596fcc');
const path='/usr/share/perl/5.40/Archive/Tar.pm',body=docker('exec',container,'cat',path),upstream=fs.readFileSync(root+'/Archive-Tar-3.14/lib/Archive/Tar.pm','utf8').trim();
const start=s=>s.indexOf('            if ( $MAX_FILE_SIZE && $entry->size > $MAX_FILE_SIZE ) {');
const block=s=>{assert(start(s)>0);const end=s.indexOf('\n            }',start(s));assert(end>start(s));return s.slice(start(s),end+14);};
assert.equal(block(body),block(upstream),'Vendor guard differs from official fixed code');
assert(body.indexOf('$data = $entry->get_content_by_ref;',start(body))>start(body));
assert(body.includes('$MAX_FILE_SIZE          = 1024 * 1024 * 1024;'));
const fixture=new URL('./native.pl',import.meta.url).pathname;
const output=docker('run','--rm','--network','none','--cpus','1','--memory','256m','--pids-limit','64','--read-only','--user','65534:65534','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,size=16m,mode=1777','--mount','type=bind,src='+fixture+',dst=/native.pl,readonly','-e','EXPECT_VENDOR_FIXED=1','--entrypoint','perl',image,'/native.pl');
assert(!/^not ok/m.test(output));assert(output.includes('1..9'));
fs.writeFileSync(root+'/penpot-vendor.tap',output+'\n');
const report={date:new Date().toISOString(),status:'passed',container,image,path,sha256:createHash('sha256').update(body+'\n').digest('hex'),upstreamGuardEqual:true,defaultCap:1073741824,capBeforeAllocation:true,nativeCapAndNormalRoundtrips:true,limitation:'Existing vendor version string is 3.02_001. Recovery for an oversized entry has upstream issue47; no overall resource-abuse immunity claimed.'};
fs.writeFileSync(root+'/vendor.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
