// PairDrop 1.11.2: an unload/reconnect can run before tab storage exists.
// Do not remove the last unrelated tab when the requested ID is already gone.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='public/scripts/browser-tabs-connector.js';
let source=fs.readFileSync(path,'utf8');
const old=`        const index = peerIdsBrowser.indexOf(peerId);
        peerIdsBrowser.splice(index, 1);`;
const fix=`        if (!Array.isArray(peerIdsBrowser)) return peerId;
        const index = peerIdsBrowser.indexOf(peerId);
        if (index === -1) return peerId;
        peerIdsBrowser.splice(index, 1);`;
if(process.argv.includes('--apply')){
 assert.equal(source.split(old).length,2,'Upstream method changed; review again');
 source=source.replace(old,fix);fs.writeFileSync(path,source);
}
assert(source.includes(fix),'Missing storage guard');
(async()=>{
 for(const [start,id,expected] of [[null,'a',null],['[]','a','[]'],['["b"]','a','["b"]'],['["a","b"]','a','["b"]']]){
  let value=start;
  const context=vm.createContext({localStorage:{getItem:()=>value,setItem:(_,v)=>value=v}});
  vm.runInContext(source+';globalThis.remove=BrowserTabsConnector.removePeerIdFromLocalStorage;',context);
  assert.equal(await context.remove(id),id);assert.equal(value,expected);
 }
 console.log('PairDrop missing-tab, empty, unknown-ID and normal removal checks passed.');
})().catch(()=>{console.error('PairDrop storage guard regression');process.exitCode=1;});
