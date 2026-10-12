// Deliberately limited to the two reviewed Redlib image references. This does
// not parse arbitrary interpolation, substitute environment values, or touch
// other .env settings. It can also reverse the exact change for proof/rollback.
import assert from 'node:assert/strict';
export const redlibOld='utilibre-redlib:openssl-vendor-security-20261011';
export const redlibNew='utilibre-redlib:mount-noble-security-20261012';
function pair(from,to){assert((from===redlibOld&&to===redlibNew)||(from===redlibNew&&to===redlibOld),'Unreviewed Redlib image pair');}
export function replaceRedlibDefaultPin(text,from,to){
 pair(from,to);const lines=text.split('\n');let replaced=0;
 const expected='${REDLIB_IMAGE:-'+from+'}',replacement='${REDLIB_IMAGE:-'+to+'}';
 for(let i=0;i<lines.length;i++){
  if(!/^\s*image:/.test(lines[i])||!lines[i].includes('REDLIB_IMAGE'))continue;
  const match=lines[i].match(/^(\s*image:\s*)(\S+)(\s*(?:#.*)?)$/);assert(match&&match[2]===expected,'Unexpected Redlib default scalar');
  lines[i]=match[1]+replacement+match[3];replaced++;
 }
 assert.equal(replaced,1,'Exactly one reviewed Redlib default required');
 return {text:lines.join('\n'),replaced};
}
export function replaceRedlibEnvPin(text,from,to){
 pair(from,to);const lines=text.split('\n');let replaced=0;
 for(let i=0;i<lines.length;i++){
  if(!/^\s*(?:export\s+)?REDLIB_IMAGE\s*=/.test(lines[i]))continue;
  assert.equal(lines[i],'REDLIB_IMAGE='+from,'Unexpected Redlib override; no guessing or arbitrary value replacement');
  lines[i]='REDLIB_IMAGE='+to;replaced++;
 }
 assert.equal(replaced,1,'Exactly one known Redlib override required');
 return {text:lines.join('\n'),replaced};
}
