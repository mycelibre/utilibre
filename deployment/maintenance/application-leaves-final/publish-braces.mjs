import fs from 'node:fs';import assert from 'node:assert/strict';import {root,here,run,save,hash} from './common.mjs';
const body=process.argv[2]==='--body-oct28';assert.equal(process.argv.length,body?3:2);
const d=body?'/var/lib/utilibre-maintenance/security-20261028/cryptpad-body':root+'/braces',out=d+'/offer';fs.mkdirSync(out,{recursive:true});
if(!body){
for(const n of ['source','package','integration','rollback'])fs.cpSync(d+'/'+n,out+'/'+n,{recursive:true});
for(const n of ['upstream.tar.gz','source.json','integration.json','test-package.json','braces-3.0.3-utilibre.1.tgz'])fs.copyFileSync(d+'/'+n,out+'/'+n);
fs.copyFileSync(d+'/test-deps/package-lock.json',out+'/test-package-lock.json');
for(const n of ['braces-prepare.mjs','braces-check.mjs','braces-native.cjs','braces-application.mjs','braces-integration.mjs','braces-release.mjs','common.mjs'])fs.copyFileSync(here+n,out+'/'+n);
fs.copyFileSync('deployment/pack/check-cryptpad-export.mjs',out+'/upstream-utilibre-cryptpad-fixture.mjs');
}else{
 const code='deployment/maintenance/security-20261028/';
 for(const n of ['source','integration','rollback'])fs.cpSync(d+'/'+n,out+'/'+n,{recursive:true});
 for(const n of ['body-parser-2.3.0.tgz','f7075ea.patch','source.json','integration.json'])fs.copyFileSync(d+'/'+n,out+'/'+n);
 for(const n of ['cryptpad-body-inputs.json','cryptpad-body.patch','cryptpad-body.mjs','body-native.cjs','body-lifecycle.cjs'])fs.copyFileSync(code+n,out+'/'+n);
 for(const n of ['braces-application.mjs','braces-release.mjs','common.mjs'])fs.copyFileSync(here+n,out+'/'+n);
 fs.copyFileSync('deployment/pack/check-cryptpad-export.mjs',out+'/upstream-utilibre-cryptpad-fixture.mjs');
 fs.writeFileSync(out+'/REBUILD.txt','Original MIT-licensed body-parser 2.3.0 source, upstream f7075eae fix, exact contextual backport and complete changed file. Extract the archive, verify lib/read.js against beforeSha256 in cryptpad-body-inputs.json, and apply cryptpad-body.patch with git apply --check then git apply. Verify afterSha256. No dependency/lockfile metadata changes are required. The implementation only advances charset validation before decoder creation and detaches/destroys a finished decoder while preserving other request consumers. The bounded native tests reproduce the old crash, verify seven normal cases per state and three lifecycle cases. The existing complete disposable CryptPad account/document/export fixture is reused through the --body-oct28 profile. Run tests with the pinned runtime and the unchanged CryptPad dependencies mounted read-only; never mount live document state. Existing source offers contain the remaining CryptPad source/privacy configuration. Production release is a separately authorized code-only operation with old bytes retained; an npm reinstall must replay this exact patch and rerun its gates. Do not apply it to another version.\n');
}
const filename=body?'security-cryptpad-body-20261028-source.tar.gz':'security-braces-depth-20261012-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
if(body)assert(!fs.existsSync(archive));
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(d+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);const b=fs.readFileSync(archive);
save(d+'/source-offer.json',{date:new Date().toISOString(),published:true,filename,url:'https://tools.utilibre.org/utilibre-source/'+filename,sha256:hash(b),bytes:b.length,scope:body?'Upstream MIT body-parser source and exact upstream backport; original/candidate file, manifest and native/browser fixture recipes. No documents, credentials or production configuration.':'Upstream MIT source, complete patched library, exact mounted-code/lock changes, original rollback files and reproducible bounded native/browser test recipes. No content, credentials or production configuration.'});
