import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,version,oldVersion,sha,read,docker,inspect,limits} from './common.mjs';
process.umask(0o077);
const targets={actual:'utilibre-expanded-actual-1',gathio:'utilibre-gathio-postgres-1',rallly:'utilibre-community-rallly-1',kuma:'utilibre-community-uptime-kuma-1',wishlist:'utilibre-wishlist-app-1',resume:'utilibre-expanded-resume-1',rssbridge:'utilibre-community-rssbridge-1',cryptpad:'utilibre-pack-cryptpad-cryptpad-1'};
const n=read(root+'/native.json');assert.equal(n.status,'passed');assert.equal(n.version,version);assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.bookwormLibcCompatible);assert.equal(n.checks.length,12);
const context=root+'/overlay';fs.mkdirSync(context+'/packages',{recursive:true});
for(const p of n.packages){const bytes=fs.readFileSync(root+'/output/'+p.name);assert.equal(sha(bytes),p.sha256);fs.writeFileSync(context+'/packages/'+p.name,bytes);}
const here=new URL('.',import.meta.url).pathname;
const selected=process.argv.slice(2);assert(selected.every(k=>k in targets));
for(const [key,name]of Object.entries(targets).filter(([k])=>!selected.length||selected.includes(k))){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const out=root+'/images/'+key;fs.mkdirSync(out,{recursive:true});assert(!fs.existsSync(out+'/stage.json'));
 const live=inspect(name),base=live.Image,baseRef=live.Config.Image,before=inspect(base),candidate=key==='kuma'?'utilibre-kuma:mount-after-crypto-20261012':`utilibre-${key}:mount-security-20261012`;
 if(key==='kuma')assert.equal(base,'sha256:2316397a528edec995ac47cc4b58d277e226d104e0d079d7eff758acdb80e368','Preserve completed Kuma crypto repair');
 const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
 for(const p of ['mount','libmount1'])assert.equal(shell(base,`dpkg-query -W -f='\${Version}' ${p}`),oldVersion);
 assert.equal(inspect(baseRef).Id,base);
 docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',candidate,context);
 assert.equal(inspect(baseRef).Id,base);
 const after=inspect(candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const inventory=id=>shell(id,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(l=>!/^libmount1(?::amd64)? |^mount /.test(l));assert.deepEqual(inventory(base),inventory(after.Id));
 for(const p of ['mount','libmount1'])assert.equal(shell(after.Id,`dpkg-query -W -f='\${Version}' ${p}`),version);
 assert.equal(shell(after.Id,'dpkg --audit'),'');
 // Exclude only the files belonging to the two intentionally replaced packages.
 // Compare every other /usr, /opt and /etc regular file (except generated DNS
 // and dynamic-loader cache files). No mutable application volume is mounted.
 const hashCmd="{ dpkg-query -L libmount1 mount; printf '%s\\n' /etc/ld.so.cache /etc/hosts /etc/hostname /etc/resolv.conf; } | sed -E 's@^/(lib|bin|sbin)/@/usr/\\1/@' | sort -u > /tmp/exclude; find /usr /opt /etc -type f -print | sort | comm -23 - /tmp/exclude | xargs -d '\\n' -r sha256sum > /tmp/runtime-hashes; sha256sum /tmp/runtime-hashes";
 const preserved=shell(base,hashCmd);assert.equal(shell(after.Id,hashCmd),preserved);
 assert.equal(shell(after.Id,'sha256sum '+n.libraryPath).split(/\s/)[0],n.librarySha256);
 const record={schema:1,date:new Date().toISOString(),status:'passed',key,name,base,baseRef,candidate,image:after.Id,version,packages:n.packages,nativeSha256:sha(fs.readFileSync(root+'/native.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,preservedRuntimeHash:preserved,productionChanged:false};
 fs.writeFileSync(out+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({key,status:'passed',image:after.Id,base,candidate}));
}
