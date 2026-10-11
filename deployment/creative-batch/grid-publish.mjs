import {cpSync,mkdirSync,writeFileSync,readFileSync,mkdtempSync,renameSync,existsSync,chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const src='/opt/utilibre/evaluation-src/grid-20261011',live='/opt/utilibre/creative-batch/sites/grid',dst=mkdtempSync('/opt/utilibre/creative-batch/sites/grid-build-');
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
if(existsSync(live))renameSync(live,live+'-previous-'+Date.now());renameSync(dst,live);
console.log('Published upstream static paths, no printer/proxy server.');
