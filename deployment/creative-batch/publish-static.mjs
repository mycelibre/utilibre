import {cpSync,mkdirSync,existsSync} from 'node:fs';
const name=process.argv[2],base='/opt/utilibre/evaluation-src/',dest='/opt/utilibre/creative-batch/sites/'+name;
const paths={blockbench:['index.html','dist','css','assets','font','lang','icon_full.png','favicon.png','manifest.webmanifest'],fossflow:['packages/fossflow-app/build'],floorplan:['build'],openreel:['apps/web/dist'],graphite:['frontend/dist']};
if(!paths[name])throw Error('Unsupported static publication');
mkdirSync(dest,{recursive:true});
const source=base+(name==='floorplan'?'openplan3d':name)+'-20261011/';
for(const path of paths[name]){
 if(!existsSync(source+path))throw Error('Missing build asset: '+path);
 cpSync(source+path,paths[name].length===1?dest:dest+'/'+path,{recursive:true});
}
console.log(name+': copied native build to read-only serving directory');
