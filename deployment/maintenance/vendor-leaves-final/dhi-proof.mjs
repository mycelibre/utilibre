import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Frozen from the authenticated APT transaction, not inferred from version text.
export const archivePins={
 'libblkid1':'2687b4aba95bc3870c537fd73601dacc340ce13f6cac5d7c4fdcb4522e4674f7',
 'liblastlog2-2':'99c4461f1448b6d4c75c0563b172c94b4d8b8f3dedc1d1062bc1225dbea861cc',
 'libmount1':'e0e438149253a4f1b3d1d0642f2c7feb322ccc66883f8edc83f400150af0a762',
 'libpcre2-8-0':'6305d7bf47bbbfa79b68d49e76794030d9672daca0a630ffc7adfeb03dfd422a',
 'libsmartcols1':'682768d01ad569674dd0531ba21e137e3cd63bafbcdeef67ed9edd9c0e83a1f5',
 'libsqlite3-0':'b75ff69990f3e10b838805c0f5f3bb573bd2cbf7406f94e78f272b97da3e7fea',
 'libssl3t64':'9f5f836285ef8697e6790706b9b8079bcbb1fe513382dc8e64068bc14d82e2c2',
 'libuuid1':'21eab7c14e287fb5e61f0a986d91ef4b1a8cba8cd20e3ef79bc3b48648097d5c',
 'openssl-provider-legacy':'7c1382e39fbdf5ee47137632260fe024ef0eac45d50d9beace7f052b5fcee95d',
 'openssl':'50bef088b4eb621a91eea94575679caef24741a8b79ddafa44581a9c0100da74',
 'util-linux':'03c32b248ceb6ba1705469b8060b16b8bb5f973e6de92b2f99d226d52dc955a2',
};
export const digest=b=>createHash('sha256').update(b).digest('hex');
export function authenticateArchive(index,packageName,version,hash){
 assert.equal(hash,archivePins[packageName],'Unexpected signed archive');
 const stanzas=index.split(/\n\s*\n/).map(s=>Object.fromEntries(s.split('\n').filter(l=>/^[A-Za-z0-9-]+: /.test(l)).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+2)])));
 assert(stanzas.some(s=>s.Package===packageName&&s.Version===version&&s.SHA256===hash),'Archive is absent from the exact authenticated APT record');
}
export function payloadManifest(root,prefix=''){
 const rows=[];
 for(const entry of fs.readdirSync(root+prefix,{withFileTypes:true})){
  const path=prefix+'/'+entry.name;
  assert(/^\/[A-Za-z0-9/_.+@-]+$/.test(path)&&!path.split('/').includes('..'),'Unexpected package path');
  if(entry.isDirectory())rows.push(...payloadManifest(root,path));
  else if(entry.isFile())rows.push({path,type:'file',sha256:digest(fs.readFileSync(root+path))});
  else if(entry.isSymbolicLink())rows.push({path,type:'symlink',target:fs.readlinkSync(root+path)});
  else throw Error('Unsupported package entry');
 }
 return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
export function validatePayload(expected,observed){
 assert(expected.length>0,'Empty package proof');
 assert.deepEqual(observed,expected,'Live payload or symbolic link differs from authenticated archive');
 return digest(JSON.stringify(expected));
}
