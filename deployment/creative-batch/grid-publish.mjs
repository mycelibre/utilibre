import {cpSync,mkdirSync,writeFileSync,readFileSync,mkdtempSync,renameSync,existsSync,chmodSync,readdirSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const prepare=process.argv[2]==='--prepare-nov11';
if(process.argv.length!==(prepare?3:2))throw Error('Use --prepare-nov11 or no arguments');
if(!prepare)throw Error('Retired GridSpace 4.7.0 publisher: prepare the pinned candidate, then use the reviewed release-static --grid-nov11 profile.');
const src=prepare?'/var/lib/utilibre-maintenance/upgrade-closure-20261111/grid/source':'/opt/utilibre/evaluation-src/grid-20261011',live='/opt/utilibre/creative-batch/sites/grid',dst=prepare?'/var/lib/utilibre-maintenance/upgrade-closure-20261111/grid/output':mkdtempSync('/opt/utilibre/creative-batch/sites/grid-build-');
if(prepare){if(existsSync(dst))throw Error('Preserve previous candidate');mkdirSync(dst);}
// Upstream's native web paths and production alias map; no Node server/modules.
execFileSync('cp',['-aL',src+'/web/.',dst]);
mkdirSync(dst+'/lib',{recursive:true});execFileSync('cp',['-aL',src+'/src/.',dst+'/lib']);
chmodSync(dst,0o755);
for(const p of ['wasm','lib/kiri/wasm']){mkdirSync(dst+'/'+p,{recursive:true});execFileSync('cp',['-aL',src+'/src/wasm/.',dst+'/'+p]);}
cpSync(src+'/license.md',dst+'/license.md');
// The upstream printer server is not deployed. Hide its inactive send panel;
// actual network prevention is provided by CSP and the absent backend.
const kiri=dst+'/kiri/index.html';
writeFileSync(kiri,readFileSync(kiri,'utf8').replace('</head>','<style>#bambu-output,#octo-output,#grid-output{display:none!important}</style></head>'));
const aliases={'main/void.js':'pack/void-main.js','main/planegcs.wasm':'void/solver/planegcs_dist/planegcs.wasm','worker/solids_worker.js':'pack/void-work-solid.js','main/mesh.js':'pack/mesh-main.js','mesh/work.js':'pack/mesh-work.js','main/kiri.js':'pack/kiri-main.js','kiri/run/engine.js':'pack/kiri-eng.js','kiri/run/minion.js':'pack/kiri-pool.js','kiri/run/worker.js':'pack/kiri-work.js'};
for(const [to,from] of Object.entries(aliases)){mkdirSync(dst+'/lib/'+to.substring(0,to.lastIndexOf('/')),{recursive:true});cpSync(src+'/src/'+from,dst+'/lib/'+to);}
writeFileSync(dst+'/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/kiri/"><title>GridSpace · Utilibre</title></head><body><h1>GridSpace</h1><a href="/kiri/">Kiri:Moto — slicing</a> · <a href="/mesh/">Mesh:Tool — 3D meshes</a></body></html>');
if(prepare){
 const readable=dir=>{chmodSync(dir,0o755);for(const name of readdirSync(dir)){const p=dir+'/'+name,st=lstatSync(p);if(st.isSymbolicLink())throw Error('Unexpected public symlink');if(st.isDirectory())readable(p);else if(st.isFile())chmodSync(p,0o644);else throw Error('Unexpected public file type');}};
 readable(dst);
}
if(!prepare){if(existsSync(live))renameSync(live,live+'-previous-'+Date.now());renameSync(dst,live);}
console.log(prepare?'Prepared isolated static output; production unchanged.':'Published upstream static paths, no printer/proxy server.');
