// Synthetic native library contracts in a bounded, networkless container.
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const root=process.argv[2],mode=process.argv[3];
assert(['normal','regression'].includes(mode));
const S=require(root+'/dist/cjs/Schema.js');
const E=require(root+'/dist/cjs/Effect.js');
const template=S.TemplateLiteral(S.String,':',S.String,':',S.String,'X');
if(mode==='regression'){
 const start=performance.now();
 assert.equal(S.is(template)(':'.repeat(5000)),false);
 const elapsedMs=performance.now()-start;
 assert(elapsedMs<1000,'Upstream corrected string-span matcher must complete within the bounded fixture');
 console.log(JSON.stringify({passed:true,elapsedMs,inputCharacters:5000}));
}else{
 assert.equal(S.decodeUnknownSync(template)('first:second:thirdX'),'first:second:thirdX');
 assert.equal(S.is(template)('::X'),true);
 assert.equal(S.is(template)('first:second:thirdY'),false);
 assert.equal(S.is(template)(42),false);
 const numeric=S.TemplateLiteral(S.Number,'px');
 assert(S.is(numeric)('12px'));assert(!S.is(numeric)('wordpx'));
 const object=S.Struct({name:S.String,count:S.Number});
 assert.deepEqual(S.decodeUnknownSync(object)({name:'Fictional example',count:3}),{name:'Fictional example',count:3});
 assert.throws(()=>S.decodeUnknownSync(object)({name:'Fictional example',count:'three'}));
 assert.equal(E.runSync(E.gen(function*(){return (yield* E.succeed(21))*2;})),42);
 console.log(JSON.stringify({passed:true,checks:9}));
}
