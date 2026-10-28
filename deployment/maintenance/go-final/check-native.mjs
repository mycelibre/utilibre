import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
process.umask(0o077);
const codec=process.argv.includes('--codec-oct28'),oct28=codec||process.argv.includes('--oct28'),root=codec?'/var/lib/utilibre-maintenance/security-20261028/codec':oct28?'/var/lib/utilibre-maintenance/security-20261028/go':'/var/lib/utilibre-maintenance/go-final-20261011';
const selected=process.argv.slice(2).filter(a=>!a.startsWith('--'));assert(selected.every(k=>['rimgo','gothub','anonymousoverflow'].includes(k)));
const specs=oct28?(codec?(selected.length?selected:['rimgo']):['rimgo','gothub','safetwitch','anonymousoverflow']).map(k=>{const s=JSON.parse(fs.readFileSync(root+'/'+k+'/build.json'));return{...s,baseId:s.base};}):JSON.parse(fs.readFileSync(root+'/build.json')).rows.filter(s=>s.key!=='galene');
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:90000}).trim();
const definitions={
 rimgo:{port:3000,paths:['/about','/privacy','/static/app.css','/favicon.ico'],env:{PORT:'3000'}},
 gothub:{port:3000,paths:['/','/about','/css/global.css'],env:{DOCKER:'true',GOTHUB_SETUP_COMPLETE:'true',GOTHUB_IP_LOGGED:'false',GOTHUB_REQUEST_URL_LOGGED:'false',GOTHUB_USER_AGENT_LOGGED:'false',GOTHUB_DIAGNOSTIC_INFO_LOGGED:'false'}},
 safetwitch:{port:7000,paths:['/'],env:{PORT:'7000',GIN_MODE:'release',UTILIBRE_CHAT_ENABLED:'false',URL:'https://twitch.utilibre.org'}},
 anonymousoverflow:{port:8080,paths:['/'],env:{PORT:'8080',APP_URL:'https://overflow.utilibre.org',GIN_MODE:'release',DISABLE_RATELIMIT:'true',SCRAPER:'api',JWT_SIGNING_SECRET:crypto.randomBytes(32).toString('hex')}},
};
const rows=[],network='maintenance-go-final-native';docker('network','create','--internal','--subnet','172.29.240.0/28',network);
try{
 for(const s of specs){
  const d=definitions[s.key],variants=[];
  for(const image of [s.baseId,s.candidate]){
   const name='maintenance-go-native-'+s.key;
   try{
    docker('run','-d','--name',name,'--network',network,'--read-only','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777',...Object.entries(d.env).flatMap(([k,v])=>['-e',k+'='+v]),image);
    const ip=docker('inspect',name,'--format','{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'),origin='http://'+ip+':'+d.port;
    let ready=false;for(let i=0;i<50;i++){try{const r=await fetch(origin+d.paths[0],{signal:AbortSignal.timeout(1000)});await r.body?.cancel();if(r.status<500){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,s.key+' startup');
    const responses=[];for(const path of d.paths){const r=await fetch(origin+path,{signal:AbortSignal.timeout(3000)});let b=Buffer.from(await r.arrayBuffer());assert(r.status>=200&&r.status<400,s.key+path);if(s.key==='gothub'&&['/','/about'].includes(path))b=Buffer.from(b.toString().replaceAll(/go1\.26\.(?:8|9|10)/g,'go1.26.REVIEWED'));responses.push({path,status:r.status,sha256:crypto.createHash('sha256').update(b).digest('hex'),length:b.length});}
    if(s.key==='safetwitch'){const status=await new Promise((resolve,reject)=>{const q=http.get(origin,{headers:{Upgrade:'websocket'},timeout:3000},r=>{r.resume();resolve(r.statusCode)});q.on('timeout',()=>q.destroy(Error('timeout')));q.on('error',reject)});assert.equal(status,403);responses.push({path:'disabled-chat',status});}
    variants.push(responses);
   }finally{try{docker('rm','-f',name);}catch{}}
  }
  assert.deepEqual(variants[0],variants[1],s.key+' native response drift');rows.push({key:s.key,imageId:s.imageId,status:'passed',responses:variants[1],sourceTests:true});
 }
 const destination=root+(selected.length?'/native-'+selected.join('-')+'.json':'/native.json');assert(!selected.length||!fs.existsSync(destination),'Preserve completed evidence');
 fs.writeFileSync(destination,JSON.stringify({date:new Date().toISOString(),status:'passed',rows,network:'internal; no upstream requests possible',productionChanged:false,limitations:'Static/native routes and existing parser/outbound tests; not a fresh broad upstream proxy-content audit.'},null,2)+'\n');console.log(rows.length+' native backend equivalence/privacy checks passed.');
}finally{docker('network','rm',network);}
