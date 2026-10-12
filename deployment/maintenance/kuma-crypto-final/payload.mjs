import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,candidate,read,sha,docker,limits,inspect} from './common.mjs';
process.umask(0o077);
const packages=read(root+'/packages.json'),stage=read(root+'/stage.json');assert.equal(stage.status,'passed');assert.equal(stage.image,inspect(candidate).Id);const files=packages.records.flatMap(r=>r.payload.filter(p=>p.path.startsWith('/usr/lib/')));
const actual=docker('run',...limits,'--entrypoint','sha256sum',candidate,...files.map(p=>p.path)).split('\n');assert.equal(actual.length,files.length);for(let i=0;i<files.length;i++)assert.equal(actual[i],files[i].sha256+'  '+files[i].path);
const old=docker('run',...limits,'--entrypoint','sh',candidate,'-ec','find /usr/lib/python3/dist-packages -name "*38.0.4*" -o -name "_openssl.abi3.so"');assert.equal(old,'');
fs.writeFileSync(root+'/payload.json',JSON.stringify({date:new Date().toISOString(),status:'passed',image:stage.image,exactUpstreamRuntimeFiles:files.length,filesSha256:sha(JSON.stringify(files)),packagesSha256:sha(fs.readFileSync(root+'/packages.json')),oldVersionAndNativeExtensionAbsent:true},null,2)+'\n');console.log(JSON.stringify({status:'passed',files:files.length,oldVersionAndNativeExtensionAbsent:true}));
