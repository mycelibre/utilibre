import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/go-final-20261011';for(const p of ['input','output'])fs.mkdirSync(root+'/'+p,{recursive:true,mode:0o700});
const specs=JSON.parse(fs.readFileSync(new URL('./images.json',import.meta.url)));
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[];
for(const s of specs){
 assert.equal(docker('image','inspect',s.base,'--format','{{.Id}}'),s.baseId);
 assert.equal(cp.execFileSync('git',['-C',s.source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),s.commit);
 const cid=docker('create','--entrypoint','/bin/true',s.baseId);try{docker('cp',cid+':'+s.binary,root+'/input/'+s.key+'-original');}finally{docker('rm',cid);}
 const files=[];function walk(dir,prefix=''){for(const x of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){if(['.git','node_modules'].includes(x.name))continue;const rel=prefix+x.name,abs=dir+'/'+x.name;if(x.isDirectory())walk(abs,rel+'/');else if(x.isFile())files.push({path:rel,sha256:hash(fs.readFileSync(abs))});}}walk(s.source);
 rows.push({...s,sourceFiles:files,goModSha256:hash(fs.readFileSync(s.source+'/go.mod')),goSumSha256:hash(fs.readFileSync(s.source+'/go.sum'))});
}
// Preserve the exact embedded Tailwind asset from an isolated copy of the
// pinned old image. This also works after release and never queries production.
const name='maintenance-go-final-rimgo-assets';let css;
try{
 docker('run','-d','--name',name,'--network','none','--read-only','--memory','256m','--cpus','1','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,noexec,size=8m,mode=1777',specs[0].baseId);
 for(let i=0;i<30;i++){try{const b=cp.execFileSync('docker',['exec',name,'wget','-qO-','http://127.0.0.1:3000/static/app.css'],{stdio:['ignore','pipe','pipe'],timeout:2000});assert(b.length>1000&&b.toString().includes('tailwind'));css=b;break;}catch{await new Promise(r=>setTimeout(r,200));}}
}finally{docker('rm','-f',name);}
assert(css,'Native existing embedded CSS required');fs.writeFileSync(root+'/input/rimgo-app.css',css);
fs.writeFileSync(root+'/prepare.json',JSON.stringify({date:new Date().toISOString(),rows,existingRimgoCssSha256:hash(css),productionChanged:false},null,2)+'\n');console.log(root);
