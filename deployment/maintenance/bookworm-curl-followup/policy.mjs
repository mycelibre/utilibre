import assert from 'node:assert/strict';
const retiredRtmp=['rtmp','rtmpe','rtmps','rtmpt','rtmpte','rtmpts'];
export function exportedSymbols(text){
 const rows=text.split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND');
 // Old Debian 7.88 emits an empty linker-version namespace named HIDDEN.
 // It is not exported storage or a callable API. Do not exempt actual data,
 // functions, or symbols carrying that version (nor CURL_* ABI namespaces).
 const emptyHidden=v=>v[3]==='OBJECT'&&v[6]==='ABS'&&v[2]==='0'&&/^0+$/.test(v[1])&&v[7]==='HIDDEN';
 return new Set(rows.filter(v=>!emptyHidden(v)).map(v=>v[3]+':'+v[7].replace('@@','@')));
}
export function featureChanges(before,after){
 return ['Protocols','Features'].map(label=>{
  const get=s=>{const line=s.split('\n').find(l=>l.startsWith(label+':'));assert(line);return line.slice(label.length+1).trim().split(/\s+/);};
  const current=get(after),removed=get(before).filter(x=>!current.includes(x));
  assert(removed.every(x=>[...retiredRtmp,'TLS-SRP','NTLM_WB'].includes(x)),'Unexpected native capability loss: '+removed);
  return {label,removed,added:current.filter(x=>!get(before).includes(x))};
 });
}
export function libraryChanges(old,current){
 const value=(rows,key)=>{const row=rows.find(l=>l.startsWith(key+'='));assert(row);return row.slice(key.length+1);};
 assert.equal(value(current,'CURL_VERSION'),'8.22.0');
 const mask=rows=>{const text=value(rows,'CURL_FEATURE_MASK');assert.match(text,/^\d+$/);const n=Number(text);assert(Number.isSafeInteger(n)&&n<=0xffffffff);return n;};
 const removedMask=(mask(old) & ~mask(current))>>>0;
 assert.equal((removedMask & ~((1<<14)|(1<<15)))>>>0,0,'Unexpected library capability removal');
 const oldProtocols=value(old,'CURL_PROTOCOLS').trim().split(/\s+/),newProtocols=value(current,'CURL_PROTOCOLS').trim().split(/\s+/);
 const removedProtocols=oldProtocols.filter(p=>!newProtocols.includes(p));assert(removedProtocols.every(p=>retiredRtmp.includes(p)),'Unexpected library protocol removal: '+removedProtocols);
 return {removedMask,removedProtocols,allowedUpstreamRemovals:['RTMP','TLS-SRP','NTLM_WB']};
}
