import test from 'node:test';import assert from 'node:assert/strict';import {proveMsal}from'./msal-policy.mjs';
const fixture=()=>{
 const s={base:'old',candidate:'candidate',site:'/pkg',files:[{path:'a'},{path:'b'}]};
 const native=fixed=>({passed:true,network:false,realCredentials:false,rows:['cjs','esm'].map(format=>({format,passed:true,normalChecks:7,syntheticTransportOnly:true,sanitized:fixed,configRejected:fixed,queryRejections:[fixed,fixed,fixed]}))});
 const b={passed:true,configurationUnchanged:true,base:'old',candidate:'candidate',imageId:'new',changedFiles:['/pkg/a','/pkg/b'],baseline:native(false),native:native(true)};
 const v={passed:true,imageId:'new',unchangedFiles:5,changedPaths:b.changedFiles};
 const c={passed:true,imageId:'new',network:false,rows:['old','new'].map(imageId=>({imageId,passed:true,azureCredential:true,azureTokenCache:true,nativeMssqlModule:true,monitorChecks:4,network:false,realCredentials:false}))};
 const a={passed:true,imageId:'new',network:'none',fictionalDataOnly:true,nativeSetupLogin:true,noNotificationSent:true};
 return [s,b,v,c,a];
};
test('accepts exact backport plus preserved legitimate consumers',()=>proveMsal(...fixture()));
for(const [name,mutate]of [
 ['wrong baseline',x=>x[1].base='unsupported'],
 ['extra modified file',x=>x[2].changedPaths=['/pkg/a','/pkg/b','/unrelated']],
 ['unreproduced baseline',x=>x[1].baseline.rows[0].sanitized=true],
 ['ESM path still vulnerable',x=>x[1].native.rows[1].sanitized=false],
 ['instance query still accepted',x=>x[1].native.rows[0].queryRejections[1]=false],
 ['normal auth broken',x=>x[1].native.rows[0].normalChecks=6],
 ['missing consumer baseline',x=>x[3].rows.shift()],
 ['cache broken',x=>x[3].rows[1].azureTokenCache=false],
 ['network enabled',x=>x[3].rows[1].network=true],
 ['wrong app artifact',x=>x[4].imageId='other'],
 ['notification side effect',x=>x[4].noNotificationSent=false],
])test('rejects '+name,()=>{const x=fixture();mutate(x);assert.throws(()=>proveMsal(...x));});
