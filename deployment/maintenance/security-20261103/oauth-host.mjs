// Exact two-file host backport. No package resolution, cloud-init run, or restart.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);const mode=process.argv[2];assert(['prepare','apply'].includes(mode)&&process.argv.length===3);
const root='/var/lib/utilibre-maintenance/security-20261103/oauth-debian',dir=root+'/host',here=new URL('.',import.meta.url).pathname;
fs.mkdirSync(dir,{recursive:true});
const inputs=JSON.parse(fs.readFileSync(here+'oauth-debian-inputs.json')),s=inputs.host,sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Host OAuth operation failed; private evidence retained');}};
const site='/usr/lib/python3/dist-packages',version=()=>run('dpkg-query',['-W','-f=${Version}',s.package]);assert.equal(version(),s.version);
const noCloudInit=()=>{for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{const args=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');assert(!args.some(a=>/\/(?:bin|sbin)\/cloud-init$/.test(a)),'Active cloud-init requires a separate window');}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')continue;throw e;}};
noCloudInit();assert.equal(run('dpkg',['--audit']),'');
const pids=()=>run('systemctl',['show','ssh.service','docker.service','qemu-guest-agent.service','-p','Id','-p','MainPID']);
if(fs.existsSync(dir+'/release.json')){const r=JSON.parse(fs.readFileSync(dir+'/release.json'));assert.equal(r.status,'passed');assert.deepEqual(r.proof.files,s.files);assert.deepEqual(r.proof.patches,inputs.patches);for(const f of s.files)assert.equal(sha(fs.readFileSync(site+'/'+f.path)),f.afterSha256);console.log('Supported host state already repaired; no files or services changed.');process.exit(0);}
const beforePids=pids(),work=fs.mkdtempSync('/tmp/utilibre-oauth-host-');fs.chmodSync(work,0o755);
try{
 // Package files contain code only; copy them for an unprivileged networkless test.
 fs.cpSync(site+'/oauthlib',work+'/oauthlib',{recursive:true,filter:p=>!p.includes('__pycache__')});
 run('chmod',['-R','a+rX',work+'/oauthlib']);
 const originals=[];
 for(const f of s.files){const path=site+'/'+f.path,stat=fs.lstatSync(path),bytes=fs.readFileSync(path);assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.uid,0);assert.equal(stat.gid,0);assert.equal(stat.mode&0o777,0o644);assert.equal(sha(bytes),f.beforeSha256);originals.push({path,bytes});}
 for(const p of inputs.patches){const bytes=fs.readFileSync(here+p.file);assert.equal(sha(bytes),p.sha256);fs.writeFileSync(work+'/'+p.file,bytes);run('git',['apply','--check',p.file],{cwd:work});run('git',['apply',p.file],{cwd:work});}
 for(const f of s.files){assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.afterSha256);fs.chmodSync(work+'/'+f.path,0o644);}
 const testFile=work+'/check.py';fs.copyFileSync(here+'oauth-debian-check.py',testFile);fs.chmodSync(testFile,0o644);
 const check=local=>JSON.parse(run('unshare',['--net','runuser','-u','nobody','--','env','PYTHONPATH='+(local?work:''),'PYTHONDONTWRITEBYTECODE=1','/usr/bin/python3','-B',testFile,'fixed'],{env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8'}}));
 const consumerCode="from cloudinit.url_helper import oauth_headers; h=oauth_headers('https://example.invalid/metadata','fictional-consumer','fictional-token','fictional-token-secret','fictional-secret',timestamp=1); assert 'oauth_signature=\"fictional-secret%26fictional-token-secret\"' in h['Authorization']; print('native cloud-init OAuth1 signing passed')";
 const consumer=local=>run('unshare',['--net','runuser','-u','nobody','--','env','PYTHONPATH='+(local?work:''),'PYTHONDONTWRITEBYTECODE=1','/usr/bin/python3','-B','-c',consumerCode],{env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8'}});
 const proof={package:s.package,version:s.version,files:s.files,patches:inputs.patches,fixtureSha256:sha(fs.readFileSync(here+'oauth-debian-check.py')),cloudInitSha256:sha(fs.readFileSync(site+'/cloudinit/url_helper.py'))};
 const verify=()=>{assert.equal(version(),s.version);assert.equal(pids(),beforePids);noCloudInit();};
 if(mode==='prepare'){const native=check(true),cloudInit=consumer(true);verify();fs.writeFileSync(dir+'/prepared.json',JSON.stringify({date:new Date().toISOString(),passed:true,proof,native,cloudInit,noServiceRestart:true},null,2)+'\n');console.log('Host OAuth candidate and actual cloud-init signing passed offline; not deployed.');}
 else{
  const prepared=JSON.parse(fs.readFileSync(dir+'/prepared.json'));assert(prepared.passed&&Date.now()-Date.parse(prepared.date)<1800000);assert.deepEqual(prepared.proof,proof);
  const source=JSON.parse(fs.readFileSync(root+'/source-offer.json'));assert(source.published&&source.publicHashVerified);
  const report={startedAt:new Date().toISOString(),status:'applying',proof,sourceSha256:source.sha256,noServiceRestart:true};const save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');
  for(const [i,o]of originals.entries()){fs.writeFileSync(dir+'/original-'+i+'.py',o.bytes);}
  const replace=(path,bytes)=>{fs.writeFileSync(path+'.utilibre-tmp',bytes,{mode:0o644});fs.chmodSync(path+'.utilibre-tmp',0o644);fs.renameSync(path+'.utilibre-tmp',path);};
  save();try{
   verify();for(const [i,f]of s.files.entries()){assert.equal(sha(fs.readFileSync(originals[i].path)),f.beforeSha256);replace(originals[i].path,fs.readFileSync(work+'/'+f.path));}
   for(const f of s.files)assert.equal(sha(fs.readFileSync(site+'/'+f.path)),f.afterSha256);
   report.native=check(false);report.cloudInit=consumer(false);verify();run('python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);report.status='passed';report.completedAt=new Date().toISOString();save();console.log('Host OAuth guard installed and native checks passed; no services restarted.');
  }catch(e){for(const o of originals)replace(o.path,o.bytes);for(const [i,f]of s.files.entries())assert.equal(sha(fs.readFileSync(originals[i].path)),f.beforeSha256);report.status='failed';report.rollback='Original two files restored';report.error=e.message;save();throw e;}
 }
}finally{fs.rmSync(work,{recursive:true});}
