// Exact signed DHI package/source proof; no exporter mutation or deployment.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/xserver-followup-20261012',dir=root+'/dhi';
const container='utilibre-expanded-penpot-exporter-1',version='2:21.1.16-1.3+deb13u4+dhi1';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(c,a)=>cp.execFileSync(c,a,{encoding:'utf8',timeout:60000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const blocks=fs.readFileSync(dir+'/package-index.txt','utf8').split(/\n\n+/),packages={};
const extract=dir+'/payload';fs.mkdirSync(extract,{recursive:true});
for(const pkg of ['xvfb','xserver-common']){
 const block=blocks.find(b=>b.startsWith('Package: '+pkg+'\n'));assert(block);
 const digest=block.match(/^SHA256: (\S+)$/m)[1],file=dir+'/'+pkg+'_2%3a21.1.16-1.3+deb13u4+dhi1_'+(pkg==='xvfb'?'amd64':'all')+'.deb';
 assert.equal(sha(file),digest);assert.equal(run('dpkg-deb',['-f',file,'Version']),version);
 assert.equal(run('docker',['exec',container,'dpkg-query','-W','-f=${Version}',pkg]),version);
 run('dpkg-deb',['-x',file,extract]);packages[pkg]={file,sha256:digest,version};
}
const sourceBlock=fs.readFileSync(dir+'/source-index.txt','utf8').split(/\n\n+/).find(b=>b.includes('\nVersion: '+version+'\n'));assert(sourceBlock);
const archives=sourceBlock.match(/^Checksums-Sha256:\n((?: .+\n?)+)/m)[1].trim().split('\n').map(s=>s.trim().split(/ +/));
for(const [digest,size,name] of archives){assert.equal(sha(dir+'/'+name),digest);assert.equal(fs.statSync(dir+'/'+name).size,Number(size));}
const tree=dir+'/source';if(!fs.existsSync(tree))run('dpkg-source',['-x',dir+'/xorg-server_21.1.16-1.3+deb13u4+dhi1.dsc',tree]);
const stage=JSON.parse(fs.readFileSync(root+'/stage.json'));
for(const f of stage.fixes)cp.execFileSync('patch',['-p1','--batch','--reverse','--dry-run','-i',root+'/'+f.cve+'.patch'],{cwd:tree,stdio:'pipe'});
function walk(path,prefix=''){return fs.readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path+'/'+e.name,prefix+'/'+e.name):e.isFile()?[prefix+'/'+e.name]:[]);}
const files=walk(extract).sort().map(path=>({path,sha256:sha(extract+path)}));
// Verify every regular payload file, including docs declaring the backport.
for(const file of files)assert.equal(run('docker',['exec',container,'sha256sum',file.path]).split(/\s+/)[0],file.sha256);
const native=JSON.parse(fs.readFileSync(root+'/native-current-dhi.json'));assert(native.passed);
assert.equal(native.binarySha256,sha(extract+'/usr/bin/Xvfb'));
const imageId=run('docker',['inspect',container,'--format','{{.Image}}']);
const report={date:new Date().toISOString(),status:'passed',version,container,imageId,packages,files,native:root+'/native-current-dhi.json',nativeSha256:sha(root+'/native-current-dhi.json'),sourceArchives:archives.map(([sha256,bytes,file])=>({file,sha256,bytes:Number(bytes)})),upstreamFixes:stage.fixes,allPayloadsMatchSignedVendor:true,productionChanged:false,releaseRequired:false,limitation:'RandR providers are absent in Xvfb; no provider-mutation reproduction is claimed. Exact signed source contains the upstream fix.'};
fs.writeFileSync(root+'/dhi-proof.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,version,files:files.length,exactUpstreamFixes:stage.fixes.length,nativePassed:true,releaseRequired:false}));
