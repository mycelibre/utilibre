// Reuse the existing complete disposable CryptPad journey, with only its exact
// runtime pin and candidate module bind adjusted. Never mounts live content.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,run,json,save,hash} from './common.mjs';
const d=root+'/braces',image='sha256:ef67f76abe92ed0502d44d8e7dfe72ea56b2a1dde9286b0ad28358342a8c6cae';
function readable(p){const s=fs.lstatSync(p);if(s.isDirectory()){fs.chmodSync(p,0o755);for(const n of fs.readdirSync(p))readable(p+'/'+n)}else if(s.isFile())fs.chmodSync(p,s.mode&0o111?0o755:0o644);else assert.fail('Unexpected source symlink')};readable(d+'/source');
const original=fs.readFileSync('deployment/pack/check-cryptpad-export.mjs','utf8');let script=original;
const substitutions=[
 ["const repo = path.resolve(new URL('../..', import.meta.url).pathname);","const repo = '/home/ubuntu/freetools';"],
 ["const runtimeImage=process.env.UTILIBRE_CRYPTPAD_CHECK_IMAGE||'utilibre-cryptpad-node:debian-security-20261011';",'const runtimeImage='+JSON.stringify(image)+';'],
 ["runtimeImage, 'node', 'server.js'","'-v', "+JSON.stringify(d+'/source:/cryptpad/node_modules/braces:ro')+", runtimeImage, 'node', 'server.js'"],
];
// Match the original allowlist as a whole line, not arbitrary user configuration.
const line=script.split('\n').find(l=>l.startsWith('assert([')&&l.endsWith('.includes(runtimeImage));'));assert(line);script=script.replace(line,'assert.equal(runtimeImage, '+JSON.stringify(image)+');');
for(const[a,b]of substitutions){assert.equal(script.split(a).length,2,'Fixture adapter drift');script=script.replace(a,b)}
fs.writeFileSync(d+'/application-fixture.mjs',script);
try{const text=run(process.execPath,[d+'/application-fixture.mjs'],{timeout:600000});fs.writeFileSync(d+'/application.log',text);const path=text.match(/Metadata evidence: (.+\/result\.json)/)?.[1];assert(path);const result=json(path);assert(result.completed&&result.disposableStateRemoved);save(d+'/application.json',{date:new Date().toISOString(),passed:true,imageId:image,sourceProofSha256:hash(fs.readFileSync(d+'/source.json')),baseFixtureSha256:hash(original),adaptedFixtureSha256:hash(script),evidence:path,...result});console.log('Braces candidate: full native CryptPad two-account/export/import journey passed.');}
catch(e){fs.writeFileSync(d+'/application-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('CryptPad native journey failed; private diagnostic retained')}
