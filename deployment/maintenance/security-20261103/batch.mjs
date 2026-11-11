import assert from 'node:assert/strict';
// Explicit finite batch; old release receipts and replay paths remain untouched.
export function selectBatch(args){
 if(args.includes('--batch-20261111')){
  assert.equal(args.filter(a=>a==='--batch-20261111').length,1);
  assert.equal(args.filter(a=>a==='--vendor-libs-20261111').length,1);
  assert(!args.some(a=>a.startsWith('--')&&!['--batch-20261111','--vendor-libs-20261111'].includes(a)));
  return {args:args.filter(a=>a!=='--batch-20261111'),enabled:true,
   root:'/var/lib/utilibre-maintenance',
   input:profile=>{assert.equal(profile,'vendor-libs-20261111');return new URL('../releases-20261111/vendor-inputs.json',import.meta.url);}};
 }
 if(args.includes('--batch-20261110')){
  assert.equal(args.filter(a=>a==='--batch-20261110').length,1);
  assert.equal(args.filter(a=>['--symfony','--vendor-debian'].includes(a)).length,1);
  assert(!args.some(a=>a.startsWith('--')&&!['--batch-20261110','--symfony','--vendor-debian'].includes(a)));
  return {args:args.filter(a=>a!=='--batch-20261110'),enabled:true,
   root:'/var/lib/utilibre-maintenance/security-20261110',
   input:profile=>{assert(['symfony','vendor-debian'].includes(profile));return new URL('../security-20261110/'+(profile==='vendor-debian'?'kerberos':profile)+'-inputs.json',import.meta.url);}};
 }
 const november9=args.includes('--batch-20261109');
 if(november9){
  assert.equal(args.filter(a=>a==='--batch-20261109').length,1);
  assert(!args.includes('--batch-20261103')&&['--musl','--vendor-debian','--zlib','--xnet','--xnet-caddy','--sqlite-followup','--rsync','--zlib-bookworm','--oauth','--symfony','--mongoc'].filter(f=>args.includes(f)).length===1);
  assert(!args.some(a=>a.startsWith('--')&&!['--batch-20261109','--musl','--vendor-debian','--zlib','--xnet','--xnet-caddy','--sqlite-followup','--rsync','--zlib-bookworm','--oauth','--symfony','--mongoc'].includes(a)));
  return {args:args.filter(a=>a!=='--batch-20261109'),enabled:true,
   root:'/var/lib/utilibre-maintenance/security-20261109',
   input:profile=>{assert(['musl','vendor-debian','zlib','xnet','xnet-caddy','sqlite-followup','rsync','zlib-bookworm','oauth','symfony','mongoc'].includes(profile));return new URL('../security-20261109/'+(['xnet','xnet-caddy'].includes(profile)?profile+'-release':profile==='rsync'?'rsync-followup':profile)+'-inputs.json',import.meta.url);}};
 }
 const enabled=args.includes('--batch-20261103');
 if(enabled){assert.equal(args.filter(a=>a==='--batch-20261103').length,1);assert(args.includes('--guava')||args.includes('--oauth-debian')||args.includes('--libxi')||args.includes('--expat')||args.includes('--expat-debian')||args.includes('--pyasn1')||args.includes('--redirects')||args.includes('--sqlite')||args.includes('--js-nov'),'November batch permits only the explicitly reviewed profiles');}
 return {args:args.filter(a=>a!=='--batch-20261103'),enabled,
  root:'/var/lib/utilibre-maintenance/security-'+(enabled?'20261103':'20261028'),
  input:profile=>new URL((enabled?'./':'../security-20261028/')+profile+'-inputs.json',import.meta.url)};
}
