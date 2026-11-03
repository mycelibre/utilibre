// Small synthetic inputs. Counts work, not timings or remote requests.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire,Module}from'node:module';import {pathToFileURL}from'node:url';
const [name,path]=process.argv.slice(2),pkg=JSON.parse(fs.readFileSync(path+'/package.json'));assert.equal(pkg.name,name);
let observations;
assert.equal(name,'decode-uri-component');
 const decode=(await import(pathToFileURL(path+'/index.js'))).default;
 const cases=[['hello%20world','hello world'],['caf%C3%A9','café'],['%E2%82%AC','€'],['a%2Bb','a+b'],['x+y',pkg.version==='0.2.2'?'x y':'x+y'],['%zz','%zz'],['%F0%9F%98%80','😀'],['','']];for(const [a,b]of cases)assert.equal(decode(a),b);assert.throws(()=>decode(null),TypeError);
 let total=0,calls=0;const original=String.prototype.replace;String.prototype.replace=function(...args){total+=this.length;calls++;return original.apply(this,args);};
 let output;const input=Array.from({length:64},(_,i)=>'%00%'+i.toString(16).padStart(2,'0')+'x').join('')+'%zz';
 try{output=decode(input);}finally{String.prototype.replace=original;}
 assert(output.endsWith('%zz'));const linearReplacementWork=total<=input.length*4;
 if(pkg.version==='0.5.1')assert(linearReplacementWork);else assert(!linearReplacementWork);
 observations={normalChecks:10,inputBytes:input.length,replaceCalls:calls,replaceInputCharacters:total,linearReplacementWork};

const require=createRequire(path+'/package.json'),decodeCjs=require(path),query=require('/grist/node_modules/query-string');
assert.equal(typeof decodeCjs,'function');assert.equal(decodeCjs('caf%C3%A9'),'café');assert.equal(decodeCjs('x+y'),'x y');assert.equal(decodeCjs('x%2By'),'x+y');assert.throws(()=>decodeCjs(null),TypeError);
const queryCases=[['title=caf%C3%A9&tag=a&tag=b&note=hello+world&empty=&flag',{empty:'',flag:null,note:'hello world',tag:['a','b'],title:'café'}],['bad=%zz',{bad:'%zz'}],['a=%F0%9F%98%80',{a:'😀'}],['x=a%2Bb',{x:'a+b'}]];
for(const [input,expected]of queryCases)assert.deepEqual(JSON.parse(JSON.stringify(query.parse(input))),expected);
const object={note:'á + & #',list:['one','two'],blank:''};assert.deepEqual(JSON.parse(JSON.stringify(query.parse(query.stringify(object)))),object);
console.log(JSON.stringify({passed:true,name,version:pkg.version,...observations,consumerChecks:6,cjsFunction:true,productionModified:false,network:'none'}));
