// Tiny boundary checks on the actual mounted module, isolated/read-only.
const assert=require('node:assert/strict'),braces=require('/deps/braces');
assert.equal(require('/deps/braces/package.json').version,'3.0.3-utilibre.1');
assert.equal(require('/deps/braces/lib/constants').MAX_LENGTH,10000);
let rejected=0;for(const options of [{},{maxLength:1000000},{maxLength:Infinity}])for(const input of ['x'.repeat(10001),'{'.repeat(10001)]){assert.throws(()=>braces.parse(input,options),e=>e instanceof SyntaxError&&e.message.includes('exceeds max characters'));rejected++}
assert.equal(braces.stringify(braces.parse('x'.repeat(10000))),'x'.repeat(10000));
assert.throws(()=>braces.parse('abcd',{maxLength:3}),SyntaxError);
assert.deepEqual(braces.expand('file-{one,two}.txt'),['file-one.txt','file-two.txt']);
assert.deepEqual(require('/deps/micromatch')(['one.js','two.json','three.txt'],'*.{js,json}'),['one.js','two.json']);
assert.throws(()=>braces.parse('{'.repeat(300)+'x'),e=>e instanceof SyntaxError&&e.message.includes('supported depth'));
const semver=require('/deps/semver');assert(semver.lt('3.0.3-utilibre.1','3.0.3'));
console.log(JSON.stringify({passed:true,defaultAndRaisedFiniteInfiniteLimitRejections:rejected,boundary10000Accepted:true,smallerConfiguredLimitHonored:true,ordinaryExpansion:true,micromatchConsumer:true,depthGuardRetained:true,prereleaseSortsBefore303:true,network:'none',content:'synthetic only'}));
