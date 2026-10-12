const assert=require('node:assert/strict');
const fs=require('node:fs');
const paths=JSON.parse(process.argv[2]);
(async()=>{
 const sm=require(paths['source-map-js']);
 const generator=new sm.SourceMapGenerator({file:'fictional.js'});
 generator.addMapping({generated:{line:1,column:0},original:{line:2,column:1},source:'fictional.ts'});
 generator.setSourceContent('fictional.ts','// fictional\nconst example = 1;');
 const consumer=new sm.SourceMapConsumer(generator.toJSON());
 assert.equal(consumer.originalPositionFor({line:1,column:0}).source,'fictional.ts');
 assert.equal(sm.SourceNode.fromStringWithSourceMap('const example=1;',consumer).toString(),'const example=1;');
 const malicious={version:3,sections:[{offset:{line:1e12,column:0},map:generator.toJSON()}]};
 let bounded=false;try{sm.SourceNode.fromStringWithSourceMap('x',new sm.SourceMapConsumer(malicious));}catch{bounded=true;}
 // SourceNode1.2.2 bounds the skip loop to available generated lines; rejecting
 // the source map is not required. The outer process has a strict timeout.
 const result={sourceMapRoundTrip:true,hugeOffsetTerminates:true,hugeOffsetRejected:bounded};
 if(paths['js-yaml']){
  const yaml=require(paths['js-yaml']);
  const value={title:'Fictional planning',labels:['Español','English'],count:3};
  assert.deepEqual(yaml.load(yaml.dump(value)),value);
  const synthetic='arr: &arr ['+Array(32).fill('{}').join(',')+']\ntargets:\n'+Array(32).fill('  - <<: *arr\n').join('');
  assert.throws(()=>yaml.load(synthetic,{maxTotalMergeKeys:16}),/maxTotalMergeKeys/);
  result.yamlRoundTrip=true;result.emptyMergeBudgetEnforced=true;
 }
 if(paths.sharp){
  const sharp=require(paths.sharp);assert.equal(sharp.versions.sharp,'0.35.5');assert.equal(sharp.versions.rsvg,'2.63.2');
  const png=await sharp({create:{width:24,height:16,channels:4,background:{r:20,g:80,b:160,alpha:.5}}}).png().toBuffer();
  for(const format of ['png','jpeg','webp']){
   const out=await sharp(png).resize(12,8).toFormat(format).toBuffer();const meta=await sharp(out).metadata();assert.equal(meta.width,12);assert.equal(meta.height,8);assert.equal(meta.format,format);assert(out.length>20);
  }
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="12"><rect width="18" height="12" fill="#123456"/></svg>');
  const raster=await sharp(svg).png().toBuffer();assert.equal((await sharp(raster).metadata()).width,18);
  const rotation=await sharp(png).withMetadata({orientation:6}).jpeg().toBuffer();assert.equal((await sharp(await sharp(rotation).autoOrient().toBuffer()).metadata()).width,16);
  assert.equal((await sharp(png).metadata()).hasAlpha,true);
  await assert.rejects(sharp(Buffer.from('not an image')).png().toBuffer());
  result.image={formats:['png','jpeg','webp','svg'],resize:true,orientation:true,alpha:true,malformedRejected:true,versions:sharp.versions};
 }
 console.log(JSON.stringify(result));
})().catch(()=>{console.error('Bounded synthetic package gate failed');process.exit(1);});
