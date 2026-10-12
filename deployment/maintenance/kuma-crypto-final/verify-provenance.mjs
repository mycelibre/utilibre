import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,read,run,sha} from './common.mjs';
process.umask(0o077);
const a=read(root+'/acquisition.json'),verified=[];
for(const row of a.rows){const file=root+'/input/'+row.filename;assert.equal(sha(fs.readFileSync(file)),row.sha256);if(fs.existsSync(file+'.provenance.json')){const output=run(root+'/verifier/bin/pypi-attestations',['verify','pypi','--repository','https://github.com/'+row.repository,'--provenance-file',file+'.provenance.json',file]);fs.writeFileSync(file+'.verification.log',output+'\n');verified.push({...row,provenance:'PyPI attestation cryptographically verified against expected GitHub repository',provenanceSha256:sha(fs.readFileSync(file+'.provenance.json'))});}else verified.push(row);}
assert(verified.filter(r=>r.project==='cryptography').every(r=>r.provenance.startsWith('PyPI attestation cryptographically')));
fs.writeFileSync(root+'/provenance.json',JSON.stringify({date:new Date().toISOString(),status:'passed',verifier:'pypi-attestations==0.0.30 (isolated build-time tool only)',verifierLock:run(root+'/verifier/bin/pip',['freeze','--all']),rows:verified},null,2)+'\n');console.log(verified.map(r=>({file:r.filename,provenance:r.provenance})));
