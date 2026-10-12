// Complete signed-release source and fixed allowlisted recipes; no runtime data.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {current,fixes} from './host-policy.mjs';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/xserver-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const release=JSON.parse(fs.readFileSync(root+'/host-release.json'));assert.equal(release.status,'passed');assert.equal(release.version,current);
const temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!path.isAbsolute(to)&&!to.split('/').includes('..'));assert(fs.lstatSync(from).isFile());const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);files.push({path:to,sha256:sha(dest)});};
try{
 for(const row of release.sourceArchives){assert.equal(sha(root+'/sources/'+row.file),row.sha256);copy(root+'/sources/'+row.file,'native/'+row.file);}
 for(const [id,fix]of Object.entries(fixes)){assert.equal(sha(root+'/'+id+'.patch'),fix.sha256);copy(root+'/'+id+'.patch','upstream/'+id+'.patch');}
 for(const file of ['README.md','review.sources','acquire.sh','stage.mjs','native.mjs','host-policy.mjs','host-policy.test.mjs','release-host.mjs','review-host.mjs','publish-source.mjs'])copy(here+file,'recipes/'+file);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),version:current,files,reproduction:'Complete unmodified Debian Xorg-server source package and original upstream notices, plus native test and deployment recipes. Extract native/xorg-server_21.1.25-1.dsc with dpkg-source -x. Files under upstream/ identify patches already included: do not apply them a second time. Acquisition used authenticated signed Debian APT indexes; no claim of a separately verified upstream .asc signature. Shared maintenance/guard imports are provided in the Utilibre integration source offer and repository. No package binaries, operational logs, X11 cookies, user displays, keys or user data are included.',repository:'https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/xserver-followup'},null,2)+'\n');
 const filename='security-host-xserver-20261012-source.tar.gz',archive=root+'/'+filename;assert(!fs.existsSync(archive));
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert(!fs.existsSync(base+'/'+filename));
 cp.execFileSync('tar',['-czf',archive,'-C',temp,'.'],{timeout:60000});
 const proof={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=base+'/'+filename;fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
