// Read-only current-runtime applicability checks; no network, restart or update.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
import {cases,eligible,prove} from './platform-policy.mjs';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261028/platform';fs.mkdirSync(dir,{recursive:true});
const evidenceDir=fs.mkdtempSync(dir+'/evidence-');
if(fs.existsSync(dir+'/review.json'))fs.copyFileSync(dir+'/review.json',evidenceDir+'/previous-review.json',fs.constants.COPYFILE_EXCL);
const read=p=>JSON.parse(fs.readFileSync(p));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const selected=process.argv.slice(2);assert(new Set(selected).size===selected.length&&selected.every(k=>cases.some(s=>s.key===k)));
const decisions=[],proofs=[];
let kitchenNative;
for(const item of queue.items){
 if(item.status==='not-rechecked')continue;
 const reviewedItem={...item,status:'needs-review'};
 const s=eligible(reviewedItem);if(!s||(selected.length&&!selected.includes(s.key)))continue;assert.equal(scan.images.find(i=>i.id===s.image)?.status,'checked');const rows=[];
 for(const name of s.containers){
  const c=JSON.parse(run('docker',['inspect',name]))[0],im=JSON.parse(run('docker',['image','inspect',c.Image]))[0];
  const shadowed=c.Mounts.some(m=>s.path===m.Destination||s.path.startsWith(m.Destination+'/'));
  let observed;
  if(s.package==='stdlib'){
   const binary=evidenceDir+'/esbuild-darwin';run('docker',['cp',name+':'+s.path,binary]);
   const info=run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--pids-limit','32','--log-driver','none','-v',binary+':/binary:ro','--entrypoint','go','sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f','version','-m','/binary']);
   fs.writeFileSync(evidenceDir+'/go-build-info.txt',info);
   const code='const f=require("fs"),h=require("crypto");const p=process.argv[1],b=f.readFileSync(p),n=f.readFileSync("/usr/src/app/node_modules/.pnpm/@esbuild+linux-x64@0.19.12/node_modules/@esbuild/linux-x64/bin/esbuild");console.log(JSON.stringify({path:p,runtimePlatform:process.platform,runtimeArch:process.arch,machOHeader:b.subarray(0,16).toString("hex"),binarySha256:h.createHash("sha256").update(b).digest("hex"),nativeHeader:n.subarray(0,20).toString("hex"),nativeSha256:h.createHash("sha256").update(n).digest("hex")}));';
   observed=JSON.parse(run('docker',['exec',name,'node','-e',code,s.path]));
   assert(!c.Mounts.some(m=>'/usr/src/app/node_modules'.startsWith(m.Destination+'/')||m.Destination==='/usr/src/app/node_modules'||m.Destination.startsWith('/usr/src/app/node_modules/')));
   observed.imageArch=im.Architecture;observed.metadataSha256=createHash('sha256').update(info).digest('hex');
   observed.version='v'+info.match(/^\/binary: go([0-9.]+)$/m)?.[1];observed.compiledOs=info.match(/\bGOOS=(\w+)/)?.[1];observed.compiledArch=info.match(/\bGOARCH=(\w+)/)?.[1];observed.module=info.match(/\bpath\s+(\S+)/)?.[1];
   const check='const m=require("./node_modules/.pnpm/esbuild@0.19.12/node_modules/esbuild"),a=require("assert/strict");a.equal(m.version,"0.19.12");a.match(m.transformSync("const n: number = 7;",{loader:"ts"}).code,/const n = 7/);console.log("passed")';
   observed.nativeTransform=run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--pids-limit','32','--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777','--entrypoint','node',s.image,'-e',check])==='passed';observed.network='none';
   const a=read(root+'/security-20261028/zod/wishlist/application.json');assert(a.passed&&a.imageId===s.image&&a.typescriptTransform&&a.nativeAccountCreated&&a.listCreated&&a.itemCreated&&a.reloadPersistence&&a.anonymousListDenied&&a.externalBrowserOrigins.length===0);observed.nativeApplication=true;
  }else if(s.package==='vite'){
   const code='const fs=require("fs"),h=require("crypto");const p=process.argv[1],b=fs.readFileSync(p+"/package.json");console.log(JSON.stringify({path:p,version:JSON.parse(b).version,metadataSha256:h.createHash("sha256").update(b).digest("hex"),runtimePlatform:process.platform,uncLikePathExists:fs.existsSync("/tmp/utilibre-fictional-nonexistent\\\\..") }));';
   observed=JSON.parse(run('docker',['exec',name,'node','-e',code,s.path]));
  }else if(s.package==='litellm'){
   const flags=Object.fromEntries(c.Config.Env.map(v=>v.split(/=(.*)/s).slice(0,2)));
   const expectedFlags={LITELLM_LOCAL_MODEL_COST_MAP:'true',LITELLM_TELEMETRY:'false',LLM_MODEL:'',LLM_API_URL:'',COLLECT_METRICS:'false',KITCHENOWL_MCP_ENABLED:'false'};
   assert.deepEqual(Object.fromEntries(Object.keys(expectedFlags).map(k=>[k,flags[k]])),expectedFlags);
   assert(!c.Mounts.some(m=>['/usr/src/kitchenowl','/opt/venv'].some(p=>p===m.Destination||p.startsWith(m.Destination+'/')||m.Destination.startsWith(p+'/'))));
   const pins={'entrypoint.sh':'721a992709ae8d2ae45adddc458d9d8e8b9f8c03d02dcd02aba3606046da389d','wsgi.ini':'ac66c99f61f2df50184cbd6fd90109885b3c7a0c50d02f1997bd156302bc0030','wsgi.py':'eb912af4ffaf87a3c16871edd6ac675412c07a6a615243504c5bd83c2f69e2fc','app/service/ingredient_parsing.py':'7619624a42ceee2e02517316d2064870843f324e7d4c1fe9de6f2e0bff10ef7d'};
   const code='import pathlib,hashlib,json,importlib.metadata as m; r=pathlib.Path("/usr/src/kitchenowl");d=m.distribution("litellm");p=pathlib.Path(d._path);print(json.dumps({"path":str(p),"version":d.version,"metadataSha256":hashlib.sha256((p/"METADATA").read_bytes()).hexdigest(),"files":{n:hashlib.sha256((r/n).read_bytes()).hexdigest() for n in '+JSON.stringify(Object.keys(pins))+'}}))';
   observed=JSON.parse(run('docker',['exec',name,'python','-c',code]));assert.deepEqual(observed.files,pins);
   observed.sourceUnchanged=true;observed.flags=expectedFlags;
   observed.applicationRole=JSON.stringify(c.Config.Entrypoint)===JSON.stringify(['./entrypoint.sh'])&&JSON.stringify(c.Config.Cmd)===JSON.stringify(['--ini','wsgi.ini:web','--gevent','100','--max-fd','4096','--disable-logging']);
   if(!kitchenNative){
    const native=new URL('./litellm-sdk-native.py',import.meta.url).pathname;
    const account=new URL('../xml-final/kitchenowl.py',import.meta.url).pathname;
    assert.equal(createHash('sha256').update(fs.readFileSync(account)).digest('hex'),'f915ba10661346da18ff27156bb12d9a680c03ee92b0199b0ee5da29ad458ae9');
    const args=['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1g','--memory-swap','1g','--cpus','1','--pids-limit','64','--log-driver','none',
     '--tmpfs','/tmp:rw,size=32m,mode=1777','--tmpfs','/data:rw,size=64m,mode=1777',
     '-e','UTILIBRE_SECURITY_DISPOSABLE=yes','-e','STORAGE_PATH=/data','-e','DATA_PATH=/data',
     '-e','JWT_SECRET_KEY=fictional-local-account-key-with-thirty-two-bytes',
     '-e','DISABLE_ONBOARDING=true','-e','PYTHONPATH=/usr/src/kitchenowl','-e','PYTHONDONTWRITEBYTECODE=1',
     ...Object.entries(expectedFlags).flatMap(([k,v])=>['-e',k+'='+v]),
     '-v',native+':/native.py:ro','-v',account+':/account-check.py:ro','--entrypoint','python',s.image,'/native.py'];
    const output=run('docker',args);fs.writeFileSync(evidenceDir+'/litellm-native.log',output);
    kitchenNative=JSON.parse(output.split('LITELLM_SDK_RESULT ')[1]);
    kitchenNative.fixtureSha256=createHash('sha256').update(fs.readFileSync(native)).digest('hex');
    kitchenNative.accountFixtureSha256=createHash('sha256').update(fs.readFileSync(account)).digest('hex');
   }
   observed.native=kitchenNative;
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
 prove(reviewedItem,rows);proofs.push({key:s.key,source:s.source,rows});
 const reason=s.package==='stdlib'?'This exact reported esbuild executable is Mach-O ARM64 for macOS, verified by binary header, SHA256 and pinned Go build-info reader (GOOS=darwin, GOARCH=arm64). The live container and Node runtime are Linux amd64/x64. Its separate ELF x86-64 esbuild executable is pinned and the native TypeScript transform passes offline; existing exact-image account/list/reload/isolation checks pass. This is deployment-platform attribution only: the bundled macOS executable is NOT upgraded or cleared for use on a Mac, redistribution or another runtime. No waiver for other stdlib targets or later images.':s.package==='litellm'?'These exact advisories concern LiteLLM proxy-server HTTP authentication/key-generation and transform_request credential loading. The current KitchenOwl image instead starts its hash-verified uWSGI/Flask application, imports the completion SDK only, and has no LLM model/provider configured. Exact runtime flags, launcher, entrypoint, parser and unshadowed source paths were checked. The isolated native application has no affected proxy routes or loaded proxy server; ingredient parsing makes no provider call, and two-account recipe import/export and isolation pass. The vulnerable library remains installed; this review does not repair its proxy code or authorize enabling that proxy, LLM integration or another consumer.':s.package==='vite'?'Upstream GHSA-587h-7wmj-h5pm explicitly limits CVE-2026-112942 to Windows path/shell handling. Exact current image and actual Node runtime are Linux; package metadata and mounts were inspected read-only. The synthetic Windows-like nonexistent path remains absent. This is platform attribution only: no exclusion for other Vite advisories, historical source locks or future images.':'Upstream GHSA-cg8m-r9f2-5wm2 limits CVE-2026-114134 to the Black GitHub Action with use_pyproject:true in 26.9.0/26.10.0. All three exact SimpleLogin roles instead contain Python Black 22.1.0 with no action files in its distribution or action manifests at the application roots; native role commands and installed metadata were checked. Isolated offline formatting still passes. This is runtime-component attribution, not clearance for arbitrary CI workflows or other Black advisories.';
 decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Evidence: '+evidenceDir.slice(root.length+1)+'/review.json; '+s.source}));
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt);
fs.writeFileSync(evidenceDir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,decisions,proofs,network:'none',productionChanged:false},null,2)+'\n');
fs.copyFileSync(evidenceDir+'/review.json',dir+'/review.json');
console.log(JSON.stringify({prepared:decisions.length,roles:proofs.reduce((n,p)=>n+p.rows.length,0),productionChanged:false}));
