// Exact approved application-upgrade inputs, separate from update discovery.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const upgradeRoot='/var/lib/utilibre-maintenance/upgrade-closure-20261111';
export const fileHash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function verifyWakapiUpgrade({fresh=true}={}){
 const s=JSON.parse(fs.readFileSync(new URL('./upgrade-inputs.json',import.meta.url))).wakapi;
 assert(s.approved&&s.version==='2.18.2'&&s.revision==='1157f203c8b646466b4e72563764738b10f0cd0d');
 const d=upgradeRoot+'/wakapi',read=f=>JSON.parse(fs.readFileSync(d+'/'+f));
 for(const [p,h]of Object.entries(s.evidence)){assert(/^[a-zA-Z0-9._-]+$/.test(p));assert.equal(fileHash(d+'/'+p),h,p);}
 for(const [p,h]of Object.entries(s.recipes)){assert(p.startsWith('deployment/')&&!p.includes('..'));assert.equal(fileHash(new URL('../../../'+p,import.meta.url)),h,p);}
 const build=read('compiled.json'),b=read('image.json'),scope=read('scope.json'),native=read('migration.json'),scan=read('scan-gate.json');
 assert(build.passed&&build.revision===s.revision&&build.binarySha256===s.binarySha256);
 for(const x of [b,scope,native,scan])assert(x.passed&&x.imageId===s.imageId);
 assert.equal(b.base,s.base);assert(b.configPreserved);assert.deepEqual(scope.changedFiles,['/app/wakapi']);
 for(const k of ['syntheticOldAccountMigration','heartbeatPreserved','nativeIndexMigration','reloadPersistence','syntheticBackupReadable','previousBinaryReadsMigratedStore'])assert(native[k]);
 assert.equal(native.nativeAccountAndHealthChecks,5);assert.equal(native.network,'none');
 assert.equal(scan.newHighCritical,0);assert.equal(scan.runtimeDependenciesPreserved,99);
 assert.deepEqual(scan.retainedHigh,[['CVE-2026-116587','github.com/go-jose/go-jose/v3','v3.0.5','HIGH']]);
 assert.equal(build.joseV3Sha256,'7593d1576566ed8330ceb98c8f0d077a82e6ab2fa5801f60abd24533e1e9293b');
 assert.equal(fileHash(d+'/wakapi'),s.binarySha256);
 assert.equal(fileHash(d+'/source.tar.gz'),read('source-offer.json').archiveSha256);
 if(fresh){const age=Date.now()-Date.parse(s.databaseUpdatedAt);assert(age>=0&&age<48*3600000,'Refresh advisory assessment before release');}
 return {s,b:{...b,binarySha256:s.binarySha256},d};
}
