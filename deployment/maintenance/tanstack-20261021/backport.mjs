// Exact compiled backport of TanStack commit d521abd71c69f1ff010bb3def4d417cb5fa058cb.
// The previously patched Penpot image is preserved. No fuzzy/minifier fallback.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const base='sha256:fbc2d56e8e1d5f1e8711b54321f4235ef3e154b307df5d4de2816729eb77f382';
export const candidate='utilibre-penpot-admin:tanstack-security-20261021';
export const target='/nitrate/apps/admin-console/.output/server/_ssr/ssr.mjs';
export const beforeSha='fd07f08e318a40fc638010d44eb63becf33e71e7ef2cfb855ba4c79a3d23ef83';
export const afterSha='ee108a6e9515f1b246374c5572112c0af58e0c43eb81063c61026159b1620ec3';
export const sha=value=>createHash('sha256').update(value).digest('hex');
export const changes=[
 ['GET input boundary','return n.context=J(n.context,t),n.method=r,await a(n)','return await a({data:n?.data,context:J(n?.context,t),method:r})'],
 ['JSON input boundary','return o.context=J(o.context,t),o.method=r,await a(o)','return await a({data:o?.data,context:J(o?.context,t),method:r})'],
 ['Error precedence and response boundary','l=n.result||n.error;if(Ze(n)&&(n=Ac(n)),!o)return l;','l=n.error!==void 0?n.error:n.result;if(Ze(n)&&(n=Ac(n)),!o&&(l instanceof Response||l===null||typeof l!==`object`))return l;'],
 ['Server factory input boundary','{...t,...e,serverFnMeta:t.serverFnMeta,context:J(e.context,r),request:n.request}','{...t,data:e.data,method:e.method??t.method,serverFnMeta:t.serverFnMeta,context:J(e.context,r),request:n.request}'],
 ['Serialized function boundary','fromSerializable:({functionId:e})=>async(t,n)=>(await(await Ls(e,{origin:`client`}))(t??{},n)).result','fromSerializable:({functionId:e})=>async(t,n)=>{let r=await Ls(e,{origin:`client`}),i=await r({data:t?.data,context:t?.context,method:r.method??`GET`},n);if(i.error!==void 0)throw i.error;return i.result}'],
 ['SSR response validation','function zl(e){return typeof e==`object`&&!!e&&`response`in e&&`serverSsrCleanup`in e}function Q(e){return zl(e)?e:{response:e,serverSsrCleanup:`none`}}','function zl(e){if(typeof e!==`object`||e===null||!(`response`in e)||!(e.response instanceof Response)||!(`serverSsrCleanup`in e))return false;return e.serverSsrCleanup===`none`||e.serverSsrCleanup===`stream`&&`dispose`in e&&typeof e.dispose===`function`}function Q(e){if(e instanceof Response)return{response:e,serverSsrCleanup:`none`};if(zl(e))return e;throw new TypeError(`Expected a Response from the SSR handler`)}'],
 ['Promise validation','function Ne(e){return typeof e.then==`function`}','function Ne(e){return(typeof e===`object`||typeof e===`function`)&&e!==null&&typeof e.then===`function`}'],
 ['Final response enforcement','function Ie(e,t){return Ne(e)?e.then(e=>(e instanceof Response&&Fe(e,t),e)):(e instanceof Response&&Fe(e,t),e)}','function utilibreEnsureResponse(e){return e instanceof Response?e:new Response(`Internal Server Error`,{status:500})}function utilibreHandleResponseError(e){if(e instanceof Response)return e;if(e instanceof Error)throw e;return new Response(`Internal Server Error`,{status:500})}function utilibreFinalizeResponse(e,t){let n=utilibreEnsureResponse(e);return Fe(n,t),n}function Ie(e,t){return Ne(e)?Promise.resolve(e).then(e=>utilibreFinalizeResponse(e,t),e=>utilibreFinalizeResponse(utilibreHandleResponseError(e),t)):utilibreFinalizeResponse(e,t)}'],
 ['Synchronous error boundary','return ve(Ie(Me.run({h3Event:r},()=>e(t,n)),r),r)','let i;try{i=Me.run({h3Event:r},()=>e(t,n))}catch(e){i=utilibreHandleResponseError(e)}return ve(Ie(i,r),r)'],
 ['Not-found content type','function Ac(e){let{headers:t,...n}=e;return new Response(JSON.stringify(n),{status:404,headers:{"Content-Type":`application/json`,...t||{}}})}','function Ac(e){let{headers:t,...n}=e,r=new Response(JSON.stringify(n),{status:404,headers:t});return r.headers.set(`Content-Type`,`application/json`),r}'],
];
export function backport(source){
 if(sha(source)===afterSha)return source;
 assert.equal(sha(source),beforeSha,'Unsupported compiled input; rebuild/review required');
 assert(!source.includes('utilibreEnsureResponse'),'Unexpected previous edit');
 let next=source;
 for(const [name,before,after] of changes){assert.equal(next.split(before).length-1,1,'Ambiguous or missing '+name);next=next.replace(before,after);}
 assert.equal(sha(next),afterSha,'Unexpected backport output');
 return next;
}
