// Read-only current-runtime applicability checks; no network, restart or update.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {eligible,prove} from './platform-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/platform';fs.mkdirSync(dir,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const decisions=[],proofs=[];
for(const item of queue.items){
 const s=eligible(item);if(!s)continue;assert.equal(scan.images.find(i=>i.id===s.image)?.status,'checked');const rows=[];
 for(const name of s.containers){
  const c=JSON.parse(run('docker',['inspect',name]))[0],im=JSON.parse(run('docker',['image','inspect',c.Image]))[0];
  const shadowed=c.Mounts.some(m=>s.path===m.Destination||s.path.startsWith(m.Destination+'/'));
  let observed;
  if(s.package==='vite'){
   const code='const fs=require("fs"),h=require("crypto");const p=process.argv[1],b=fs.readFileSync(p+"/package.json");console.log(JSON.stringify({path:p,version:JSON.parse(b).version,metadataSha256:h.createHash("sha256").update(b).digest("hex"),runtimePlatform:process.platform,uncLikePathExists:fs.existsSync("/tmp/utilibre-fictional-nonexistent\\\\..") }));';
   observed=JSON.parse(run('docker',['exec',name,'node','-e',code,s.path]));
  }else{
   const code='import importlib.metadata as m,json,pathlib,hashlib;d=m.distribution("black");p=pathlib.Path(d._path);print(json.dumps({"path":str(p),"version":d.version,"metadataSha256":hashlib.sha256((p/"METADATA").read_bytes()).hexdigest(),"hasActionFiles":any("action" in str(f).lower() for f in d.files),"actionManifestPresent":any(pathlib.Path(f).exists() for f in ["/action.yml","/action.yaml","/github/action.yml","/github/action.yaml","/code/action.yml","/code/action.yaml"])}))';
   observed=JSON.parse(run('docker',['exec',name,'python','-c',code]));
   // Use the exact image offline, with no writable host/application mounts.
   const formatted=run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--pids-limit','64','--cpus','1','--log-driver','none','-e','PYTHONDONTWRITEBYTECODE=1','--entrypoint','python',s.image,'-c','import black;assert black.format_str("x=1\\n",mode=black.FileMode())=="x = 1\\n";print("passed")']);
   observed.formattingPassed=formatted==='passed';
   const cmds={
    'utilibre-simplelogin-web-1':['gunicorn','wsgi:app','-b','0.0.0.0:7777','-w','1','--timeout','30','--log-level','warning'],
    'utilibre-simplelogin-smtp-1':['python','email_handler.py'],
    'utilibre-simplelogin-jobs-1':['python','job_runner.py'],
   };
   observed.applicationRole=c.Config.Entrypoint===null&&JSON.stringify(c.Config.Cmd)===JSON.stringify(cmds[name]);
  }
  rows.push({container:name,image:c.Image,imageOs:im.Os,running:c.State.Running,shadowed,...observed});
  assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),s.image);
 }
 prove(item,rows);proofs.push({key:s.key,source:s.source,rows});
 const reason=s.package==='vite'?'Upstream GHSA-587h-7wmj-h5pm explicitly limits CVE-2026-112942 to Windows path/shell handling. Exact current image and actual Node runtime are Linux; package metadata and mounts were inspected read-only. The synthetic Windows-like nonexistent path remains absent. This is platform attribution only: no exclusion for other Vite advisories, historical source locks or future images.':'Upstream GHSA-cg8m-r9f2-5wm2 limits CVE-2026-114134 to the Black GitHub Action with use_pyproject:true in 26.9.0/26.10.0. All three exact SimpleLogin roles instead contain Python Black 22.1.0 with no action files in its distribution or action manifests at the application roots; native role commands and installed metadata were checked. Isolated offline formatting still passes. This is runtime-component attribution, not clearance for arbitrary CI workflows or other Black advisories.';
 decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Evidence: security-20261028/platform/review.json; '+s.source}));
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,decisions,proofs,network:'none',productionChanged:false},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,roles:proofs.reduce((n,p)=>n+p.rows.length,0),productionChanged:false}));
