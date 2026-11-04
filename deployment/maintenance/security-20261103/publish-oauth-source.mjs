// Code-only supplement to existing complete application source offers.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103',dir=root+'/oauth-debian',name='oauth-client-binding-20261104-source.tar.gz',dest='/opt/utilibre/toolbox-public/'+name;
const sha=b=>createHash('sha256').update(b).digest('hex'),inputs=JSON.parse(fs.readFileSync(new URL('./oauth-debian-inputs.json',import.meta.url)));
assert(!fs.existsSync(dest),'Preserve published sources');const stage=fs.mkdtempSync(dir+'/source-');
try{
 const deb=root+'/remaining/oauth-debian/python3-oauthlib_3.2.2-3_all.deb';assert.equal(sha(fs.readFileSync(deb)),'96246105498eccac13513e18cfc1771ce9644b559e22d60bb518dcffeb4eeb73');
 cp.execFileSync('dpkg-deb',['-x',deb,stage+'/original'],{timeout:30000});
 fs.mkdirSync(stage+'/recipe');for(const f of ['oauth-debian-inputs.json','oauth-client-binding.patch','oauth-debian-check.py','oauth-debian.mjs','oauth-debian-policy.mjs','check-oauth-debian-app.mjs','oauth-host.mjs','publish-oauth-source.mjs'])fs.copyFileSync(new URL('./'+f,import.meta.url),stage+'/recipe/'+f);
 const upstream=fs.readFileSync(root+'/remaining/oauth-upstream.patch');assert.equal(sha(upstream),inputs.upstreamPatchSha256);fs.writeFileSync(stage+'/upstream-c951a1d.patch',upstream);
 fs.writeFileSync(stage+'/REBUILD.txt','BSD-3-Clause OAuthlib source and original Debian notices are under original/. recipe/ contains the exact two-file identity-binding backport and isolated tests for Debian OAuthlib 3.2.2. No API migration, new OAuth server, network request or general vulnerability clearance is implied. Use these files in the full Utilibre repository for its existing scan/release helpers. Other application sources remain available in their complete offers. No secrets, accounts or operational logs are included.\n');
 const archive=dir+'/'+name;cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:30000});
 fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);
 const body=cp.execFileSync('curl',['-fsS','--max-time','20','https://tools.utilibre.org/utilibre-source/'+name],{timeout:25000,maxBuffer:2*1024**2});assert.equal(sha(body),sha(fs.readFileSync(archive)));
 fs.writeFileSync(dir+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,publicHashVerified:true,filename:name,sha256:sha(body),bytes:body.length},null,2)+'\n');console.log('Code-only source supplement published and public bytes verified.');
}finally{fs.rmSync(stage,{recursive:true});}
