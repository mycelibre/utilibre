import assert from 'node:assert/strict';
// Explicit finite batch; old release receipts and replay paths remain untouched.
export function selectBatch(args){
 const november9=args.includes('--batch-20261109');
 if(november9){
  assert.equal(args.filter(a=>a==='--batch-20261109').length,1);
  assert(!args.includes('--batch-20261103')&&['--musl','--vendor-debian','--zlib','--xnet','--sqlite-followup','--rsync','--zlib-bookworm'].filter(f=>args.includes(f)).length===1);
  assert(!args.some(a=>a.startsWith('--')&&!['--batch-20261109','--musl','--vendor-debian','--zlib','--xnet','--sqlite-followup','--rsync','--zlib-bookworm'].includes(a)));
  return {args:args.filter(a=>a!=='--batch-20261109'),enabled:true,
   root:'/var/lib/utilibre-maintenance/security-20261109',
   input:profile=>{assert(['musl','vendor-debian','zlib','xnet','sqlite-followup','rsync','zlib-bookworm'].includes(profile));return new URL('../security-20261109/'+(profile==='xnet'?'xnet-release':profile==='rsync'?'rsync-followup':profile)+'-inputs.json',import.meta.url);}};
 }
 const enabled=args.includes('--batch-20261103');
 if(enabled){assert.equal(args.filter(a=>a==='--batch-20261103').length,1);assert(args.includes('--guava')||args.includes('--oauth-debian')||args.includes('--libxi')||args.includes('--expat')||args.includes('--expat-debian')||args.includes('--pyasn1')||args.includes('--redirects')||args.includes('--sqlite')||args.includes('--js-nov'),'November batch permits only the explicitly reviewed profiles');}
 return {args:args.filter(a=>a!=='--batch-20261103'),enabled,
  root:'/var/lib/utilibre-maintenance/security-'+(enabled?'20261103':'20261028'),
  input:profile=>new URL((enabled?'./':'../security-20261028/')+profile+'-inputs.json',import.meta.url)};
}
