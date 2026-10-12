#!/usr/bin/env node
// Additive, immutable corresponding-source offer; no service release or listing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const here=new URL('.',import.meta.url).pathname,s=JSON.parse(fs.readFileSync(here+'spec.json')),w=s.work;
const sha=b=>createHash('sha256').update(b).digest('hex');
const proof=JSON.parse(fs.readFileSync(w+'/out/provenance.json'));
const dest=w+'/source-offer';assert(!fs.existsSync(dest),'Do not overwrite immutable offer');fs.mkdirSync(dest,{recursive:true});
const files=[];
const copy=(from,to)=>{assert(!to.split('/').includes('..'));fs.mkdirSync(path.dirname(dest+'/'+to),{recursive:true});fs.copyFileSync(from,dest+'/'+to);files.push({path:to,sha256:sha(fs.readFileSync(dest+'/'+to))});};
for(const name of Object.keys(s.sourceFiles)){assert.equal(sha(fs.readFileSync(w+'/source/'+name)),s.sourceFiles[name]);copy(w+'/source/'+name,'native/'+name);}
for(const [commit,hash]of Object.entries(s.patches)){assert.equal(sha(fs.readFileSync(w+'/source/'+commit+'.patch')),hash);copy(w+'/source/'+commit+'.patch','native/'+commit+'.patch');}
for(const name of ['openldap_'+s.version+'.dsc','openldap_'+s.version+'.debian.tar.xz','openldap_'+s.version+'_amd64.buildinfo']){assert.equal(sha(fs.readFileSync(w+'/out/'+name)),proof.files[name].sha256);copy(w+'/out/'+name,'native/'+name);}
copy(w+'/out/build-dependencies.tsv','native/build-dependencies.tsv');
for(const name of fs.readdirSync(here))if(fs.statSync(here+name).isFile())copy(here+name,'recipes/maintenance/openldap-followup/'+name);
for(const name of ['xml-final/Dockerfile','openssl-bookworm-followup/app-checks.mjs','openssl-bookworm-followup/rssbridge-check.mjs','sqlite-final/kuma-native.cjs','python-bookworm-followup/sdk-native.py','bookworm-curl-followup/impersonate-fixture.mjs','bookworm-curl-followup/impersonate-native.php','bookworm-curl-followup/impersonate-feed.php','language-final/release.mjs','go-final/release.mjs'])copy(here+'../'+name,'recipes/maintenance/'+name);
// Public source-controlled bridge policy, never a production secret/env file.
copy(here+'../../community/rssbridge.ini.php','recipes/community/rssbridge.ini.php');
fs.writeFileSync(dest+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
fs.writeFileSync(dest+'/SOURCES.json',JSON.stringify({version:s.version,repair:s.reviewedCve,source:s.sourceFiles,upstreamPatches:s.patches,files,reproduction:'Extract the patched DSC beside its orig tarball and Debian packaging, then build with the native Bookworm dependencies recorded in build-dependencies.tsv. Original Debian hardening and patches are preserved; both upstream fixes applied with zero fuzz. Recipes include shared fixture/helper sources. Browser checks use the existing Utilibre Playwright installation. Recreate synthetic localhost test TLS certificates as described in README; no credentials, captured content, private keys or runtime configuration are included. Release helper refuses unknown roles, stale/drifted images and unpassed application evidence.'},null,2)+'\n');
const filename='security-openldap-native-20261012-source.tar.gz',file=w+'/'+filename;assert(!fs.existsSync(file));
execFileSync('tar',['-czf',file,'-C',dest,'.'],{timeout:60000,stdio:'pipe'});
const result={date:new Date().toISOString(),file,filename,bytes:fs.statSync(file).size,sha256:sha(fs.readFileSync(file)),published:true};
for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const target=base+'/'+filename;assert(!fs.existsSync(target));fs.copyFileSync(file,target+'.tmp');fs.chmodSync(target+'.tmp',0o644);fs.renameSync(target+'.tmp',target);assert.equal(sha(fs.readFileSync(target)),result.sha256);}
fs.writeFileSync(w+'/source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
