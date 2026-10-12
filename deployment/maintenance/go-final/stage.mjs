import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/go-final-20261011',recipe=fileURLToPath(new URL('.',import.meta.url));
const prepared=JSON.parse(fs.readFileSync(root+'/prepare.json'));
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:120000}).trim();
const rows=[];
for(const s of prepared.rows){
 const old=fs.readFileSync(root+'/output/'+s.key+'-before-buildinfo.txt','utf8'),fresh=fs.readFileSync(root+'/output/'+s.key+'-buildinfo.txt','utf8');
 assert(fresh.split('\n')[0].endsWith('go1.26.9'),s.key);assert(old.split('\n')[0].endsWith('go1.26.8'),s.key);
 const modules=text=>new Map(text.split('\n').filter(l=>/^\s+dep\s/.test(l)).map(l=>{const [,name,version,sum]=l.trim().split(/\s+/);return [name,{version,sum}]}));
 assert(!/^\s+=>\s/m.test(fresh),'Unexpected module replacement');
 const allowed={'golang.org/x/net':'v0.60.0','golang.org/x/crypto':'v0.57.0','golang.org/x/sys':'v0.48.0','golang.org/x/text':'v0.42.0','golang.org/x/term':'v0.46.0','golang.org/x/sync':'v0.23.0','golang.org/x/mod':'v0.41.0','golang.org/x/tools':'v0.49.0',...(s.key==='rimgo'?{'github.com/gofiber/fiber/v2':'v2.52.15'}:{}),...(s.key==='galene'?{'github.com/gorilla/websocket':'v1.5.3'}:{}),...(s.key==='anonymousoverflow'?{'github.com/redis/go-redis/v9':'v9.5.5','go.mongodb.org/mongo-driver':'v1.17.7','github.com/montanaflynn/stats':'v0.7.1'}:{})};
 const previous=modules(old),next=modules(fresh),changes=[];
 const locked=new Map(fs.readFileSync(recipe+'locks/'+s.key+'/go.mod','utf8').split('\n').map(l=>l.trim().split(/\s+/)).filter(p=>p.length>=2&&p[1].startsWith('v')).map(([name,version])=>[name,version]));
 for(const [name,value] of next)if(locked.has(name))assert.equal(value.version,locked.get(name),'Binary differs from final lock '+name);
 assert.equal(next.get('golang.org/x/net')?.version,'v0.60.0','Fixed networking library not linked');
 const tests=fs.readFileSync(root+'/output/'+s.key+'-tests.txt','utf8');assert(!/(^|\n)FAIL(?:\s|$)/.test(tests)&&/^ok\s/m.test(tests),'Native Go tests did not pass '+s.key);
 for(const [name,value] of previous){assert(next.has(name),'Unexpected removed dependency '+name);const n=next.get(name);if(value.version!==n.version){assert.equal(n.version,allowed[name],'Unreviewed module change '+name);changes.push({module:name,from:value.version,to:n.version});}else assert.equal(n.sum,value.sum,'Same-version module checksum drift');}
 for(const [name,value] of next)if(!previous.has(name)){assert.equal(value.version,allowed[name],'Unreviewed module addition '+name);changes.push({module:name,from:null,to:value.version});}
 for(const lock of ['go.mod','go.sum'])assert.equal(fs.readFileSync(root+'/output/locks/'+s.key+'/'+lock,'utf8'),fs.readFileSync(recipe+'locks/'+s.key+'/'+lock,'utf8'),'Committed lock drift '+s.key);
 assert.equal(docker('image','inspect',s.base,'--format','{{.Id}}'),s.baseId);
 const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3);
 const log=fs.openSync(root+'/output/'+s.key+'-image.log','w');try{cp.execFileSync('docker',['build','--pull=false','-f',recipe+'Dockerfile','--build-arg','BASE='+s.base,'--build-arg','BINARY='+s.key,'--build-arg','DESTINATION='+s.binary,'-t',s.candidate,root+'/output'],{stdio:['ignore',log,log],timeout:120000});}finally{fs.closeSync(log);}
 const base=JSON.parse(docker('image','inspect',s.baseId))[0],after=JSON.parse(docker('image','inspect',s.candidate))[0];
 for(const key of ['Env','Entrypoint','Cmd','User','WorkingDir','Healthcheck','ExposedPorts','Volumes'])assert.deepEqual(after.Config[key],base.Config[key],key);
 rows.push({...s,imageId:after.Id,linkedModules:next.size,moduleChanges:changes,tests:tests.trim(),status:'built-not-runtime-verified'});
}
fs.writeFileSync(root+'/build.json',JSON.stringify({date:new Date().toISOString(),status:'passed',compiler:'go1.26.9',rows,productionChanged:false},null,2)+'\n');console.log(rows.map(x=>({key:x.key,image:x.imageId,modules:x.linkedModules,changes:x.moduleChanges})));
