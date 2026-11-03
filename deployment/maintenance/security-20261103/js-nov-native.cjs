// Tiny synthetic inputs, no dynamic evaluation, files, sockets or large payloads.
const assert=require('node:assert/strict'),fs=require('node:fs');
const [name,path]=process.argv.slice(2),pkg=JSON.parse(fs.readFileSync(path+'/package.json'));
assert(['seroval','joi'].includes(name)&&pkg.name===name);const lib=require(path);
if(name==='seroval'){
 const data={label:'Fictional café',date:new Date('2026-01-01T00:00:00Z'),bytes:new Uint8Array([1,2,3]),map:new Map([['sample',7]]),set:new Set(['a','b']),big:123n,pattern:/hello/gi};data.self=data;
 const output=lib.fromJSON(lib.toJSON(data));assert.equal(output.self,output);for(const k of ['label','date','bytes','map','set','big','pattern'])assert.deepEqual(output[k],data[k]);
 const observations=[];
 for(const length of [2,3]){const v=lib.toJSON([1,2,3]);v.t.a={...v.t.a,length};let rejected=false;try{lib.fromJSON(v);}catch(e){rejected=e instanceof lib.SerovalDeserializationError&&e.cause instanceof lib.SerovalMalformedNodeError;}observations.push(rejected);}
 const bytes=new Uint8Array([1,2,3]);Object.defineProperty(bytes,'constructor',{value:{name:'Uint8Array/*UTILIBRE_FICTIONAL_MARKER*/'}});
 const encoded=lib.serialize(bytes),constructorInjected=encoded.includes('UTILIBRE_FICTIONAL_MARKER');
 const regex=lib.serialize(new RegExp('</script>'));const rawScriptCloser=regex.toLowerCase().includes('</script>');
 assert.throws(()=>lib.fromJSON({t:999999}));
 if(pkg.version==='1.6.11'){assert(observations.every(Boolean));assert(!constructorInjected);assert(!rawScriptCloser);}
 console.log(JSON.stringify({passed:true,name,version:pkg.version,normalChecks:9,arrayShapeRejected:observations,constructorInjected,rawScriptCloser,codeEvaluated:false}));
}else{
 const single=lib.string().email({tlds:false}),multiple=lib.string().email({multiple:true,tlds:false}),custom=lib.string().email({multiple:true,separator:';',tlds:false});
 for(const v of ['one@example.test','a.b+sample@example.test'])assert(!single.validate(v).error);
 for(const v of ['one@example.test, two@example.test','one@example.test ,two@example.test'])assert(!multiple.validate(v).error);
 assert(!custom.validate('one@example.test ; two@example.test').error);assert(single.validate('no-at-sign').error);assert(multiple.validate('one@example.test, invalid').error);
 const source=fs.readFileSync(path+'/lib/types/string.js','utf8');const boundedWhitespace=source.includes('(?<!\\\\s)');
 assert(multiple.validate(' '.repeat(8192)).error);
 if(pkg.version==='17.13.9')assert(boundedWhitespace,'Missing upstream whitespace boundary');
 console.log(JSON.stringify({passed:true,name,version:pkg.version,normalChecks:8,boundedWhitespace,scope:'Small invalid input and exact upstream regex guard; no large denial-of-service benchmark'}));
}
