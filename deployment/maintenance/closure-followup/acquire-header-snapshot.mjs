// Controlled acquisition only. Review stays offline and never trusts a moving ref.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const commit=process.argv[2];
assert(process.argv.length===3&&commit==='d4e64685005cb49f8cf3123b04e49eac6617de00','Only the reviewed CNA snapshot is supported');
const root='/var/lib/utilibre-maintenance',dir=root+'/headers-review-'+commit;
const queue=JSON.parse(fs.readFileSync(root+'/security-queue.json'));
const selected=[...new Set(queue.items.filter(i=>i.status==='needs-review'&&i.package==='linux-libc-dev').map(i=>i.id))].sort();
const ids=selected.filter(i=>/^CVE-\d{4}-\d{4,}$/.test(i)),unsupported=selected.filter(i=>!ids.includes(i));
assert(ids.length&&ids.length<=5000);
const paths=ids.map(i=>{const [,year,num]=i.split('-');return `cves/${year}/${num.slice(0,-3)}xxx/${i}.json`;});
const cache=dir+'/cna',repo=dir+'/selected-source';fs.mkdirSync(cache,{recursive:true});fs.mkdirSync(repo,{recursive:true});
assert(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize>8*1024**3);
function git(args,input){return cp.execFileSync('git',['-c','core.hooksPath=/dev/null','-c','credential.helper=','-C',repo,...args],{input,encoding:'utf8',timeout:600000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],env:{...process.env,GIT_TERMINAL_PROMPT:'0'}}).trim();}
if(!fs.existsSync(repo+'/.git')){
 git(['init','--quiet']);git(['remote','add','origin','https://github.com/CVEProject/cvelistV5.git']);
 git(['config','remote.origin.promisor','true']);git(['config','remote.origin.partialclonefilter','blob:none']);
}
assert.equal(git(['remote','get-url','origin']),'https://github.com/CVEProject/cvelistV5.git');
let acquired=false;
try{acquired=git(['rev-parse','--verify','HEAD'])===commit;}catch{}
if(!acquired)git(['fetch','--quiet','--no-tags','--depth=1','--filter=blob:none','origin',commit]);
git(['config','core.sparseCheckout','true']);git(['config','core.sparseCheckoutCone','false']);
fs.writeFileSync(repo+'/.git/info/sparse-checkout',paths.map(p=>'/'+p).join('\n')+'\n');
git(['checkout','--quiet','--detach',commit]);
git(['read-tree','-mu','HEAD']);assert.equal(git(['rev-parse','HEAD']),commit);
const records=[],missing=[];let total=0;
for(const [n,p]of paths.entries()){
 const file=repo+'/'+p;if(!fs.existsSync(file)){missing.push(ids[n]);continue;}
 const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<250000);
 const bytes=fs.readFileSync(file),value=JSON.parse(bytes);assert.equal(value.cveMetadata?.cveId,ids[n]);
 const hash=createHash('sha256').update(bytes).digest('hex');total+=bytes.length;assert(total<128*1024**2);
 const dest=cache+'/'+ids[n]+'.json';
 if(fs.existsSync(dest))assert.equal(createHash('sha256').update(fs.readFileSync(dest)).digest('hex'),hash,'Cached primary record drift');
 else fs.writeFileSync(dest,bytes,{flag:'wx',mode:0o600});
 records.push({id:ids[n],path:p,sha256:hash,bytes:bytes.length});
}
const receipt={date:new Date().toISOString(),commit,source:'https://github.com/CVEProject/cvelistV5',requested:ids.length,records,missing,unsupported,bytes:total,reviewed:false,network:'GitHub acquisition only; no application requests or production mutation'};
fs.writeFileSync(dir+'/acquisition-'+Date.now()+'.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({requested:ids.length,acquired:records.length,missing:missing.length,unsupported:unsupported.length,bytes:total,reviewed:false}));
