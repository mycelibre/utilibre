import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,read,run,candidate,inspect} from './common.mjs';
process.umask(0o077);
assert(!fs.existsSync(root+'/application.json'));const stage=read(root+'/stage.json');assert.equal(stage.status,'passed');assert.equal(stage.image,inspect(candidate).Id);
const check='deployment/maintenance/native-final/check-coturn.py';
const result=JSON.parse(run('env',['UTILIBRE_COTURN_TEST_SUBNET=198.19.250.0/28','python3',check,candidate]));assert.equal(result.passed,true);assert.equal(result.image,stage.image);
fs.writeFileSync(root+'/application.json',JSON.stringify({date:new Date().toISOString(),status:'passed',image:stage.image,stageSha256:sha(fs.readFileSync(root+'/stage.json')),fixtureSha256:sha(fs.readFileSync(check)),result,limitation:'Isolated native protocol test, not a real phone/browser, public NAT path, production throughput or live quota stress test.',productionChanged:false},null,2)+'\n');console.log(JSON.stringify(result));
