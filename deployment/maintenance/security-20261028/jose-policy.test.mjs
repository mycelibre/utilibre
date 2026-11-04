import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyModuleDelta, verifyV3BuildInput} from './jose-policy.mjs';
const sum='h1:'+'a'.repeat(43)+'=',p='dep\tgithub.com/go-jose/go-jose/v4\t';
const old=[p+'v4.1.5\t'+sum,'dep\tgolang.org/x/net\tv0.60.0\t'+sum];
const fixed=[p+'v4.1.6\t'+sum,old[1]];
test('accepts the exact patch release while preserving other repairs',()=>verifyModuleDelta(old,fixed,'v4.1.5',sum));
test('unrelated CLI with no JOSE must remain unchanged',()=>{verifyModuleDelta([old[1]],[old[1]],'v4.1.5',sum);assert.throws(()=>verifyModuleDelta([old[1]],fixed,'v4.1.5',sum));});
test('rejects wrong baseline and major-version substitution',()=>{assert.throws(()=>verifyModuleDelta(old,fixed,'v4.1.3',sum));assert.throws(()=>verifyModuleDelta(old,fixed,'v4.1.4',sum));assert.throws(()=>verifyModuleDelta(old,[fixed[0].replace('/v4','/v5'),old[1]],'v4.1.5',sum));});
test('rejects dependency removal or unrelated upgrade',()=>{assert.throws(()=>verifyModuleDelta(old,[fixed[0]],'v4.1.5',sum));assert.throws(()=>verifyModuleDelta(old,[fixed[0],old[1].replace('v0.60.0','v0.61.0')],'v4.1.5',sum));});
test('rejects duplicated inventory, altered or missing integrity',()=>{assert.throws(()=>verifyModuleDelta([...old,old[0]],fixed,'v4.1.5',sum));assert.throws(()=>verifyModuleDelta(old,fixed,'v4.1.5',''));assert.throws(()=>verifyModuleDelta(old,[fixed[0].replace(sum,'h1:'+'b'.repeat(43)+'='),old[1]],'v4.1.5',sum));});
import {verifyVendorModuleDelta} from './jose-policy.mjs';
test('vendor inventories keep versions without requiring omitted sums',()=>verifyVendorModuleDelta(old,fixed.map(x=>x.split('\t').slice(0,3).join('\t')),'v4.1.5',sum));
test('vendor inventories reject unrelated replacements and version drift',()=>{assert.throws(()=>verifyVendorModuleDelta(old,[...fixed,'=>\t../unreviewed'],'v4.1.5',sum));assert.throws(()=>verifyVendorModuleDelta(old,[fixed[0],old[1].replace('v0.60.0','v0.61.0')],'v4.1.5',sum));});
test('v3 repair input rejects unsupported revision before using patch bytes',()=>{
 assert.throws(()=>verifyV3BuildInput('github.com/go-jose/go-jose/v3 v3.0.4',Buffer.from('unreviewed')),/Unsupported JOSE v3 revision/);
});
test('v3 repair input rejects missing or duplicated module identity',()=>{
 assert.throws(()=>verifyV3BuildInput('module fixture',Buffer.alloc(0)),/Missing or ambiguous/);
 const line='github.com/go-jose/go-jose/v3 v3.0.5';
 assert.throws(()=>verifyV3BuildInput(line+'\n'+line,Buffer.alloc(0)),/Missing or ambiguous/);
});
test('v3 repair input refuses different patch bytes on a supported version',()=>{
 for(const suffix of ['', ' // indirect'])assert.throws(()=>verifyV3BuildInput('github.com/go-jose/go-jose/v3 v3.0.5'+suffix,Buffer.from('unreviewed')),/Unreviewed JOSE v3 repair bytes/);
});
