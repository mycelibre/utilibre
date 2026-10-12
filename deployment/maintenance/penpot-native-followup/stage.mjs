import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/penpot-native-followup-20261012';
const specs=JSON.parse(await readFile(new URL('./specs.json',import.meta.url)));
const manifest=JSON.parse(await readFile(root+'/packages.json','utf8'));
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2});
assert.equal(manifest.status,'prepared');
const rows=[];
for(const role of specs.roles) {
 const current=JSON.parse(docker(['inspect',role.container]))[0];
 assert.equal(current.Image,role.baseId,'Live ancestry changed; explicit rebase required');
 const base=JSON.parse(docker(['image','inspect',role.baseId]))[0];
 assert.equal(JSON.parse(docker(['image','inspect',role.base]))[0].Id,role.baseId);
 assert.match(base.Config.User,/^[a-z0-9:-]+$/);
 const context=root+'/images/'+role.name;await mkdir(context,{recursive:true});
 const packages=manifest.packages.filter(p=>role.common||p.name==='librsvg2-2');
 for(const p of packages){const bytes=await readFile(p.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);await copyFile(p.file,context+'/'+p.name+'.deb');}
 const command=packages.map(p=>'/tmp/'+p.name+'.deb').join(' ');
 const dockerfile=`FROM ${role.base}\nUSER root\n`+packages.map(p=>`COPY ${p.name}.deb /tmp/${p.name}.deb\n`).join('')+
  `RUN set -eu; test "$(dpkg-query -W -f='\$\{Version\}' librsvg2-2)" = '2.60.0+dfsg-1'; dpkg -i ${command}; test "$(dpkg-query -W -f='\$\{Version\}' librsvg2-2)" = '${specs.version}'; rm ${command}\nUSER ${base.Config.User}\n`;
 await writeFile(context+'/Dockerfile',dockerfile);
 await writeFile(context+'/build.log',docker(['build','--network=none','--pull=false','-t',role.candidate,context]));
 const after=JSON.parse(docker(['image','inspect',role.candidate]))[0];
 assert.equal(JSON.parse(docker(['image','inspect',role.base]))[0].Id,role.baseId);
 assert.deepEqual(after.RootFS.Layers.slice(0,base.RootFS.Layers.length),base.RootFS.Layers);
 for(const key of ['User','Cmd','Entrypoint','Env','WorkingDir','Volumes','ExposedPorts'])assert.deepEqual(after.Config[key],base.Config[key],key);
 rows.push({...role,imageId:after.Id});
}
await writeFile(root+'/stage.json',JSON.stringify({schema:1,status:'staged',createdAt:new Date().toISOString(),rows},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'staged',rows:rows.map(({name,candidate,imageId})=>({name,candidate,imageId}))}));
