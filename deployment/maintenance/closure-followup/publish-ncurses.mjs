// Additive, immutable corresponding-source offer; no logs or private state.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const release=JSON.parse(fs.readFileSync(dir+'/ncurses-release.json'));assert.equal(release.status,'passed');
const roles=[];
for(const g of release.groups){assert.equal(g.status,'passed');for(const r of g.rows){
 assert.equal(cp.execFileSync('docker',['inspect',r.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),r.newImage);
 roles.push({name:r.name,image:r.newRef,imageId:r.newImage});
}}
const filename='security-ncurses-followup-20261012-source.tar.gz',temp=fs.mkdtempSync(dir+'/terminal-source-'),manifest=[];
function copy(from,to){const dest=path.join(temp,to);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);manifest.push({path:to,sha256:sha(fs.readFileSync(dest))});}
try{
 for(const f of ['ncurses_6.4.orig.tar.gz','ncurses_6.4-4+utilibre1.debian.tar.xz','ncurses_6.4-4+utilibre1.dsc'])copy(dir+'/ncurses-bookworm/'+f,'bookworm/'+f);
 for(const f of ['ncurses-CVE-2025-69720.patch','ncurses-6.5-20251213.patch.gz'])copy(dir+'/sources/'+f,'upstream/'+f);
 for(const f of fs.readdirSync(here).filter(f=>/ncurses|^cache-release\.mjs$|^README\.md$/.test(f)))copy(here+f,'recipes/closure-followup/'+f);
 copy(here+'../xml-final/Dockerfile','recipes/xml-final/Dockerfile');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,license:'ncurses uses a permissive MIT-style license; full original Bookworm source and notices, modified Debian packaging, exact upstream/DHI patch and recipes included.',trixie:{version:'6.5+20250216-2+dhi4',source:'https://github.com/docker-hardened-images/catalog/tree/a399ba8b3297ee5f29c05f9a1d2068743eaae797/package/deb/main/ncurses',packageSha256:'54821f5e17572f0badc7059efefb54fb54d9e8a28449274f478735314f22474d'},reproduction:'Shared release helpers are in utilibre-integration.tar.gz. Only ncurses-bin is installed; libraries remain unchanged. See recipes README for native test scope and retained failed rehearsal. No user data/configuration/logs are included.'},null,2)+'\n');
 const archive=dir+'/'+filename;assert(!fs.existsSync(archive));cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const result={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish')){for(const out of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=out+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}result.published=true;}
 fs.writeFileSync(dir+'/ncurses-source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{assert(path.dirname(temp)===dir&&path.basename(temp).startsWith('terminal-source-'));fs.rmSync(temp,{recursive:true});}
