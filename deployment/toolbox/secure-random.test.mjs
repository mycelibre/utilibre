import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import {utilibreSecureToken} from './secure-random.mjs';
const source=(await readFile(new URL('./secure-random.mjs',import.meta.url),'utf8')).replace('export function','function');
test('requested lengths and selected alphabets; invalid or empty input is empty',()=>{
 for(const length of [1,5,12,64,512,2000])for(const alphabet of ['0123456789','ABCDEF','abcdef','!@#$','abcXYZ123!@']){
  const token=utilibreSecureToken(alphabet,length);assert.equal(token.length,length);assert([...token].every(c=>alphabet.includes(c)));
 }
 for(const length of [0,-1,NaN,1.5])assert.equal(utilibreSecureToken('abc',length),'');
 assert.equal(utilibreSecureToken('',64),'');
});
test('rejection sampling discards the incomplete upper range',()=>{
 let calls=0;
 const context={Uint32Array,crypto:{getRandomValues(a){a.fill(calls++===0?0xffffffff:1);return a;}}};
 assert.equal(runInNewContext(source+';utilibreSecureToken("abc",3)',context),'bbb');
 assert.equal(calls,2);
});
test('missing WebCrypto fails closed; Math.random is never called',()=>{
 assert.throws(()=>runInNewContext(source+';utilibreSecureToken("abc",12)',{Uint32Array}),/Secure random generation is unavailable/);
 assert.equal(runInNewContext(source+';utilibreSecureToken("abcdef",64)',{Uint32Array,crypto:webcrypto,Math:{random(){throw Error('insecure PRNG used')}}}).length,64);
});
test('native generators preserve options and use the tested helper body',async()=>{
 const {default:ts}=await import('../../portal/node_modules/typescript/lib/typescript.js');
 const root=process.env.TOOLBOX_SOURCE_ROOT||'/opt/utilibre/src';
 const native=[
  ['omnitools/src/pages/tools/string/password-generator/service.ts','generatePassword'],
  ['it-tools/src/tools/token-generator/token-generator.service.ts','createToken'],
 ];
 for(const [path,name]of native){
  const code=await readFile(root+'/'+path,'utf8');
  assert(code.includes(source.replace('function utilibreSecureToken(alphabet, length)','function utilibreSecureToken(alphabet: string, length: number)')));
  assert(!code.includes('Math.random')&&!code.includes('shuffleString('));
  const exports={};const context={exports,crypto:webcrypto,Uint32Array,Math:{...Math,random(){throw Error('insecure PRNG used')}},parseInt,isNaN};
  runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const make=exports[name];
  const options=name==='generatePassword'?{length:'64',includeLowercase:false,includeUppercase:false,includeNumbers:true,includeSymbols:false}:{length:64,withLowercase:false,withUppercase:false,withNumbers:true,withSymbols:false};
  assert.match(make(options),/^[0-9]{64}$/);
  if(name==='generatePassword')assert(!/[iIl0O]/.test(make({...options,includeLowercase:true,includeUppercase:true,avoidAmbiguous:true})));
  else assert.match(make({...options,alphabet:'ABC'}),/^[ABC]{64}$/);
 }
});
