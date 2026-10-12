// Source trees legitimately include fixture names outside binary-package naming
// conventions. Read them literally; never execute paths or traverse symlinks.
import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
export function sourceManifest(root,prefix=''){
 const rows=[];
 for(const entry of fs.readdirSync(root+prefix,{withFileTypes:true})){
  assert(!['.','..'].includes(entry.name)&&!entry.name.includes('/'));
  const path=prefix+'/'+entry.name;
  if(entry.isDirectory())rows.push(...sourceManifest(root,path));
  else if(entry.isFile())rows.push({path,type:'file',sha256:createHash('sha256').update(fs.readFileSync(root+path)).digest('hex')});
  else if(entry.isSymbolicLink())rows.push({path,type:'symlink',target:fs.readlinkSync(root+path)});
  else throw Error('Unexpected source entry type');
 }
 return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
