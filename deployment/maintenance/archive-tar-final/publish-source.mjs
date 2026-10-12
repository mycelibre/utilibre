import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv[2],'--publish');
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012',name='security-archive-tar-20261012-source.tar.gz',dest='/opt/utilibre/toolbox-public/'+name;
assert(!fs.existsSync(dest),'Immutable source offer exists');const s=JSON.parse(fs.readFileSync(root+'/source.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(sha(fs.readFileSync(root+'/Archive-Tar-3.14.tar.gz')),s.archiveSha256);
const stage=fs.mkdtempSync(root+'/source-offer-');fs.copyFileSync(root+'/Archive-Tar-3.14.tar.gz',stage+'/Archive-Tar-3.14.tar.gz');fs.copyFileSync(root+'/source.json',stage+'/provenance.json');fs.cpSync(new URL('.',import.meta.url).pathname,stage+'/recipes',{recursive:true});
cp.execFileSync('tar',['-czf',root+'/'+name,'-C',stage,'.']);const body=fs.readFileSync(root+'/'+name);
for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){fs.copyFileSync(root+'/'+name,dir+'/'+name+'.tmp');fs.chmodSync(dir+'/'+name+'.tmp',0o644);fs.renameSync(dir+'/'+name+'.tmp',dir+'/'+name);}
const offer={date:new Date().toISOString(),published:true,filename:name,sha256:sha(body),bytes:body.length,url:'https://tools.utilibre.org/utilibre-source/'+name,license:'Artistic or GNU GPL, as Perl; original notices retained',scope:'Complete unmodified CPAN source and module-package integration; no credentials, service configuration or user data'};
fs.writeFileSync(root+'/source-offer.json',JSON.stringify(offer,null,2)+'\n');console.log(JSON.stringify(offer));
