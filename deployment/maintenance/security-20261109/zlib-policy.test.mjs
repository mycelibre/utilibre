import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {proveZlib} from './zlib-policy.mjs';
const i=JSON.parse(fs.readFileSync(new URL('./zlib-inputs.json',import.meta.url))),spec=i.rows.find(s=>s.key==='projects-app'),d='/var/lib/utilibre-maintenance/security-20261109/zlib/'+spec.key,read=n=>JSON.parse(fs.readFileSync(d+'/'+n+'.json'));
const args=()=>[structuredClone(i),{...structuredClone(spec),...spec.releaseGroups[0],evidenceKey:spec.key},read('build'),{...read('consumer'),path:d+'/consumer.json'},{...read('scan-gate'),rawPath:d+'/after-scan.json'},{...read('scope'),path:d+'/scope.json'}];
test('recorded exact image passes twice without changing inputs',()=>{const a=args(),text=JSON.stringify(a);proveZlib(...a);proveZlib(...a);assert.equal(JSON.stringify(a),text);});
for(const [name,change]of Object.entries({
 'unsupported image':a=>a[1].base='sha256:'+'a'.repeat(64),
 'unapproved release':a=>a[1].releaseApproval='held',
 'active-work hold':a=>a[1].ownerHold='Preserve active work',
 'new vulnerability':a=>a[4].newHighCritical=1,
 'incomplete scan':a=>a[4].nativeApkInventoryComplete=false,
 'different advisory snapshot':a=>a[4].databaseSha256='wrong',
 'changed application bytes':a=>a[2].applicationBytesUnchanged=false,
 'unproven filesystem scope':a=>a[5].allUnrelatedImageFilesUnchanged=false,
 'wrong consumer image':a=>a[3].rows[1].imageId=a[2].base,
 'missing native test':a=>a[3].rows[1].checks=0,
 'modified fixture':a=>a[3].fixtureSha256='wrong',
 'wrong signed package':a=>a[2].package.sha256='wrong',
}))test('rejects '+name,()=>{const a=args();change(a);assert.throws(()=>proveZlib(...a));});
