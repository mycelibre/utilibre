const assert=require('node:assert/strict'),fs=require('node:fs');
const old=require('/original'),fixed=require('/candidate');
// One bounded bad pattern: no exponential alternation and no external input.
const bad='('.repeat(4999)+'x'+')'.repeat(4999);
// The installed Node 24 engine's string-path threshold differs from the
// report's Node 26 threshold. Its supported direct-AST API is an unambiguous
// baseline control, with a finite synthetic 20,000-node tree (< 4 MiB).
assert.throws(()=>old.compile(ast(20000)),RangeError);
let rejected=0;for(const method of ['parse','compile','expand','stringify'])for(const pattern of [bad,'{'.repeat(300)+'x'+'}'.repeat(300),'('.repeat(300)+'x','{'.repeat(300)+'x']){assert.throws(()=>fixed[method](pattern),e=>e instanceof SyntaxError&&e.message.includes('supported depth'));rejected++}
function ast(depth){let node={type:'text',value:'fictional'};for(let i=0;i<depth;i++)node={type:'root',nodes:[node]};return node;}
for(const method of ['compile','expand','stringify']){assert.throws(()=>fixed[method](ast(4000)),e=>e instanceof SyntaxError&&e.message.includes('supported depth'));rejected++}
const samples=['file-{a,b}.txt','{1..5}','x/{red,blue}/{small,large}','{a,{b,c}}','[abc]','\\{literal\\}','$(echo)','foo/**/{*.js,*.json}','('.repeat(100)+'x'+')'.repeat(100),'{'.repeat(100)+'x'+'}'.repeat(100)];
let comparisons=0;for(const sample of samples)for(const method of ['compile','expand','stringify']){assert.deepEqual(fixed[method](sample),old[method](sample));comparisons++}
// Real installed consumers, redirected only through the candidate module mount.
const mm=require('/consumer/node_modules/micromatch'),fg=require('/consumer/node_modules/fast-glob');
assert.deepEqual(mm(['one.js','two.json','three.txt'],'*.{js,json}'),['one.js','two.json']);
fs.mkdirSync('/tmp/fixture',{recursive:true});for(const f of ['one.js','two.json','three.txt'])fs.writeFileSync('/tmp/fixture/'+f,'fictional');
assert.deepEqual(fg.sync('*.{js,json}',{cwd:'/tmp/fixture'}).sort(),['one.js','two.json']);
assert.throws(()=>mm.braces('{'.repeat(300)+'x'+'}'.repeat(300)),SyntaxError);
console.log(JSON.stringify({passed:true,oldStackOverflowReproduced:true,oldFailurePath:'compile(direct AST), depth 20000, Node 24; not a claimed reproduction of the Node 26 string threshold',boundedRejections:rejected,unchangedOrdinaryResults:comparisons,micromatchConsumer:true,fastGlobConsumer:true,maxAstDepth:256,network:'none'}));
