import test from 'node:test';
import assert from 'node:assert/strict';
import {evidence,fresh} from './release.mjs';
const s={base:'sha256:'+'a'.repeat(64),candidate:'reviewed:patch',container:'reviewed-app'};
const imageId='sha256:'+'b'.repeat(64);
function fixtures(){const date=new Date().toISOString();return [{...s,imageId,passed:true,configurationUnchanged:true},{imageId,date,passed:true,libraryGate:true,productionChanged:false,applicationParity:[{imageId:s.base},{imageId}]},{imageId,date,passed:true}];}
test('exact native, library, configuration and image evidence required',()=>assert.equal(evidence(s,...fixtures()),imageId));
test('reject wrong image, omitted native parity and unverified config',()=>{for(const mutate of [r=>r[1].imageId=s.base,r=>r[0].configurationUnchanged=false,r=>r[1].applicationParity.pop(),r=>r[2].passed=false,r=>r[2].date='2020-01-01']){const r=fixtures();mutate(r);assert.throws(()=>evidence(s,...r));}});
test('reject missing, stale and future evidence',()=>{for(const date of [undefined,'not-a-date','2020-01-01',new Date(Date.now()+3600000).toISOString()])assert.throws(()=>fresh(date));});
