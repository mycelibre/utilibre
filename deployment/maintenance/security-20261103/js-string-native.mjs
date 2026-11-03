// Small synthetic inputs. Counts work, not timings or remote requests.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire,Module}from'node:module';import {pathToFileURL}from'node:url';
const [name,path]=process.argv.slice(2),pkg=JSON.parse(fs.readFileSync(path+'/package.json'));assert.equal(pkg.name,name);
let observations;
if(name==='decode-uri-component'){
 const decode=(await import(pathToFileURL(path+'/index.js'))).default;
 const cases=[['hello%20world','hello world'],['caf%C3%A9','café'],['%E2%82%AC','€'],['a%2Bb','a+b'],['x+y','x+y'],['%zz','%zz'],['%F0%9F%98%80','😀'],['','']];for(const [a,b]of cases)assert.equal(decode(a),b);assert.throws(()=>decode(null),TypeError);
 let total=0,calls=0;const original=String.prototype.replace;String.prototype.replace=function(...args){total+=this.length;calls++;return original.apply(this,args);};
 let output;const input=Array.from({length:64},(_,i)=>'%00%'+i.toString(16).padStart(2,'0')+'x').join('')+'%zz';
 try{output=decode(input);}finally{String.prototype.replace=original;}
 assert(output.endsWith('%zz'));const linearReplacementWork=total<=input.length*4;
 if(pkg.version==='0.5.1')assert(linearReplacementWork);else assert(!linearReplacementWork);
 observations={normalChecks:10,inputBytes:input.length,replaceCalls:calls,replaceInputCharacters:total,linearReplacementWork};
}else{
 assert.equal(name,'re2js');const file=path+'/'+pkg.main,source=fs.readFileSync(file,'utf8');assert(source.includes('class Machine')||source.includes('Machine = class'));
 // Export the existing internal Machine only in this disposable test module;
 // no installed file is modified. This is upstream's NFA-step counting method.
 const m=new Module(file);m.filename=file;m.paths=Module._nodeModulePaths(path);m._compile(source+'\nexports.__Machine=Machine;\n',file);
 const {RE2JS,__Machine:Machine}=m.exports;const checks=[['abc','abcdef',true],['abc','def',false],['^(a+)+b$','a'.repeat(32)+'!',false],['[0-9]+','abc123',true]];for(const[p,s,e]of checks)assert.equal(RE2JS.compile(p).test(s),e);
 assert.equal(RE2JS.compile('(hello) (world)').matcher('hello world').replaceAll('$2 $1'),'world hello');assert.throws(()=>RE2JS.compile('['));
 const re=RE2JS.compile('(?<=a)b',RE2JS.LOOKBEHINDS),counts=[];
 for(const length of [128,256]){let steps=0;const original=Machine.prototype.step;Machine.prototype.step=function(...a){steps++;return original.apply(this,a);};try{const text='ab'.repeat(length/2),matcher=re.matcher(text);let found=0;while(matcher.find())found++;assert.equal(found,length/2);counts.push({length,steps});}finally{Machine.prototype.step=original;}}
 const ratio=counts[1].steps/counts[0].steps,linearRepeatedMatching=ratio<2.5&&counts.every(r=>r.steps<4*r.length);if(pkg.version==='2.8.7')assert(linearRepeatedMatching);else assert(!linearRepeatedMatching);
 observations={normalChecks:8,counts,ratio,linearRepeatedMatching};
}
console.log(JSON.stringify({passed:true,name,version:pkg.version,...observations,productionModified:false,network:'none'}));
