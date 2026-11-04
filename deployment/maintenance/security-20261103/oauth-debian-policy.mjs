import assert from 'node:assert/strict';
import fs from 'node:fs';import {createHash} from 'node:crypto';
export function proveOauthDebian(s,b,app){
 assert.equal(s.key,'kuma');assert.equal(b.imageId,app.imageId);assert.equal(b.base,s.base);
 assert(b.passed&&b.configurationUnchanged&&b.consumer.passed&&b.consumer.oauthlib==='3.2.2');
 assert(b.baseline.passed&&b.baseline.identityEscalationReproduced&&!b.baseline.identityMismatchRejected);
 assert(b.native.passed&&!b.native.identityEscalationReproduced&&b.native.identityMismatchRejected);
 for(const r of [b.baseline,b.native])assert(r.checks===13&&r.normalGrantsAndOAuth1Preserved&&r.network==='none');
 assert(app.passed&&app.nativeKumaSetupAndLogin&&app.network==='none'&&!app.productionChanged);
 assert.deepEqual(b.changedFiles,s.files.map(f=>s.site+'/'+f.path));
 const sha=f=>createHash('sha256').update(fs.readFileSync(new URL(f,import.meta.url))).digest('hex');
 assert.equal(b.fixtureSha256,sha('./oauth-debian-check.py'));
 assert.equal(b.consumerFixtureSha256,sha('../kuma-crypto-final/native.py'));
 const inputs=JSON.parse(fs.readFileSync(new URL('./oauth-debian-inputs.json',import.meta.url)));
 assert.deepEqual(b.patches,inputs.patches);
 for(const p of inputs.patches)assert.equal(p.sha256,sha('./'+p.file));
}
