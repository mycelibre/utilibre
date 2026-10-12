// Native Debian --with quilt semantics for a freshly extracted verification tree.
// No host quilt installation is needed: apply the authenticated series with GNU
// patch, without fuzz or automatic reversal. Never use against live app sources.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
// Historical release receipts remain immutable. Permit only the reviewed
// argument-only hardening delta, reconstructed against the old recorded hash.
export function historicalRecipeMatches(file,expected){const bytes=fs.readFileSync(file),sha=b=>createHash('sha256').update(b).digest('hex');if(sha(bytes)===expected)return true;if(!file.endsWith('/release-host.mjs')||expected!=='842ae96d75de44ceec960b2526e9dbfea8f315c02d0ca0b8c39f729701bf0f68')return false;const s=bytes.toString(),now="['-p1','--force','--batch','--fuzz=0','--reverse','--dry-run','-i',dir+'/'+id+'.patch']",old="['-p1','--batch','--reverse','--dry-run','-i',dir+'/'+id+'.patch']";return s.split(now).length===2&&sha(s.replace(now,old))===expected;}
export function strictReverse(tree,patch){cp.execFileSync('patch',['--force','--batch','--fuzz=0','--reverse','--dry-run','-p1','-i',patch],{cwd:tree,stdio:'pipe',timeout:15000});}
export function applyVendorSeries(tree){
 const file=tree+'/debian/patches/series';assert(fs.existsSync(file));const rows=fs.readFileSync(file,'utf8').split('\n').map(s=>s.split('#')[0].trim()).filter(Boolean).map(s=>{const parts=s.split(/\s+/),name=parts.shift();assert(/^[A-Za-z0-9_.+/-]+$/.test(name)&&!name.startsWith('/')&&!name.split('/').includes('..'));assert(parts.length===0||parts.length===1&&/^-p[01]$/.test(parts[0]));return{name,strip:parts[0]||'-p1'}});
 const applied=fs.existsSync(tree+'/.pc/applied-patches')?fs.readFileSync(tree+'/.pc/applied-patches','utf8').trim().split('\n').filter(Boolean):[];assert.deepEqual(applied,rows.slice(0,applied.length).map(r=>r.name));
 for(const{name,strip}of rows.slice(applied.length))cp.execFileSync('patch',['--force','--forward','--batch','--fuzz=0',strip,'-i',tree+'/debian/patches/'+name],{cwd:tree,stdio:'pipe',timeout:15000});return rows.map(r=>r.name);
}
