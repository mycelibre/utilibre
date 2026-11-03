import assert from 'node:assert/strict';
// Explicit finite batch; old release receipts and replay paths remain untouched.
export function selectBatch(args){
 const enabled=args.includes('--batch-20261103');
 if(enabled){assert.equal(args.filter(a=>a==='--batch-20261103').length,1);assert(args.includes('--expat')||args.includes('--expat-debian')||args.includes('--pyasn1')||args.includes('--redirects'),'November batch permits only reviewed Expat/pyasn1/redirects profiles');}
 return {args:args.filter(a=>a!=='--batch-20261103'),enabled,
  root:'/var/lib/utilibre-maintenance/security-'+(enabled?'20261103':'20261028'),
  input:profile=>new URL((enabled?'./':'../security-20261028/')+profile+'-inputs.json',import.meta.url)};
}
