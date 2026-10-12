import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,builder,version,oldVersion,sha,read,docker,inspect,limits} from './ubuntu-common.mjs';
process.umask(0o077);
const targets={addy:'utilibre-addy-db-1',redlib:'public-utility-redlib-1'};
const n=read(root+'/ubuntu-native.json');assert.equal(n.status,'passed');assert.equal(n.version,version);assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.nobleLibcCompatible);assert.equal(n.checks.length,12);
const context=root+'/ubuntu-overlay';fs.mkdirSync(context+'/packages',{recursive:true});
for(const p of n.packages){const bytes=fs.readFileSync(root+'/ubuntu-output/'+p.name);assert.equal(sha(bytes),p.sha256);fs.writeFileSync(context+'/packages/'+p.name,bytes);}
const here=new URL('.',import.meta.url).pathname;
const selected=process.argv.slice(2);assert(selected.every(k=>k in targets));
for(const [key,name]of Object.entries(targets).filter(([k])=>!selected.length||selected.includes(k))){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const out=root+'/ubuntu-images/'+key;fs.mkdirSync(out,{recursive:true});assert(!fs.existsSync(out+'/stage.json'));
 const live=inspect(name),base=live.Image,baseRef=live.Config.Image,before=inspect(base),candidate=`utilibre-${key}:mount-noble-security-20261012`;
 const shell=(id,cmd)=>docker('run',...limits,'--user','0','--entrypoint','sh',id,'-ec',cmd);
 for(const p of ['mount','libmount1'])assert.equal(shell(base,`dpkg-query -W -f='\${Version}' ${p}`),oldVersion);
 docker('cp',name+':'+n.libraryPath,out+'/predecessor-libmount.so');
 docker('cp',out+'/predecessor-libmount.so',builder+':/build/predecessor-'+key+'.so');
 const priorLib='/build/predecessor-'+key+'.so';
 const oldExports=docker('exec',builder,'nm','-D','--defined-only',priorLib).split('\n').map(l=>l.trim().split(/\s+/).slice(1).join(' ')).sort();
 const oldAbi=docker('exec',builder,'readelf','-d',priorLib).split('\n').filter(l=>/NEEDED|SONAME/.test(l)).map(l=>l.replace(/^.*?\(/,'('));
 assert.deepEqual(oldExports,n.exports);assert.deepEqual(oldAbi,n.sonameAndNeeded);
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
 const record={schema:1,date:new Date().toISOString(),status:'passed',key,name,base,baseRef,candidate,image:after.Id,version,packages:n.packages,nativeSha256:sha(fs.readFileSync(root+'/ubuntu-native.json')),configurationUnchanged:true,unrelatedPackagesUnchanged:true,priorRuntimeBytesUnchanged:true,preservedRuntimeHash:preserved,productionChanged:false};
 fs.writeFileSync(out+'/stage.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({key,status:'passed',image:after.Id,base,candidate}));
}

