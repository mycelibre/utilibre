// Synthetic local cache contracts; no visitor traffic or production state.
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process'),http=require('node:http');
const paths=JSON.parse(process.argv[2]);
const request={url:'http://fictional.invalid/example',method:'GET',headers:{host:'fictional.invalid',accept:'text/plain'}};
let checks=0;
for(const p of paths){
 const CachePolicy=require(p),version=require(p+'/package.json').version;assert.equal(version,'4.3.0');
 const policy=headers=>new CachePolicy(request,{status:200,headers});
 const fresh=policy({'cache-control':'public, max-age=600'});assert(fresh.storable());assert(fresh.satisfiesWithoutRevalidation(request));assert(fresh.timeToLive()>0);checks+=3;
 const restored=CachePolicy.fromObject(fresh.toObject());assert(restored.satisfiesWithoutRevalidation(request));checks++;
 for(const control of ['private','no-store']){assert.equal(policy({'cache-control':control,'set-cookie':'fictional=value'}).storable(),false);checks++;}
 for(const vary of ['*',' * ','accept, *']){assert.equal(policy({'cache-control':'public,max-age=600',vary}).satisfiesWithoutRevalidation(request),false);checks++;}
 const vary=policy({'cache-control':'max-age=600',vary:'accept'});assert(!vary.satisfiesWithoutRevalidation({...request,headers:{...request.headers,accept:'image/png'}}));checks++;
 const auth=new CachePolicy({...request,headers:{...request.headers,authorization:'Bearer fictional'}},{status:200,headers:{'cache-control':'max-age=600'}});assert(!auth.storable());checks++;
 const revalidation=policy({'cache-control':'no-cache',etag:'"fictional"'});assert.equal(revalidation.revalidationHeaders(request)['if-none-match'],'"fictional"');checks++;
 // Record the disputed max-stale behaviour honestly: this is NOT a fix for
 // CVE-2026-93748. Never turn that observation into an automatic waiver.
 const disputed=policy({'cache-control':'max-age=0','set-cookie':'fictional=value'});
 assert(disputed.satisfiesWithoutRevalidation({...request,headers:{...request.headers,'cache-control':'max-stale=600'}}));checks++;
}
async function cachedFetch(){
 const npm='/usr/local/lib/node_modules/npm';
 const fetch=require(npm+'/node_modules/make-fetch-happen');
 let hits=0;const server=http.createServer((req,res)=>{hits++;res.setHeader('Cache-Control','public,max-age=600');res.setHeader('ETag','"fixture"');res.end('fictional cache fixture');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url='http://127.0.0.1:'+server.address().port+'/fixture';for(let i=0;i<2;i++){const r=await fetch(url,{cachePath:'/tmp/native-cache'});assert.equal(await r.text(),'fictional cache fixture');}assert.equal(hits,1);checks++;}
 finally{await new Promise(r=>server.close(r));}
}
async function main(){
 await cachedFetch();
 const npm=(...args)=>cp.execFileSync('npm',args,{encoding:'utf8',timeout:20000,stdio:['ignore','pipe','pipe']}).trim();
 for(const setting of ['update-notifier','audit','fund'])assert.equal(npm('config','get',setting),'false');
 const d=fs.mkdtempSync('/tmp/cache-package-');process.chdir(d);fs.writeFileSync('package.json',JSON.stringify({name:'utilibre-fictional-cache-test',version:'1.0.0',scripts:{test:'node -e "process.exit(0)"'}}));
 npm('run','test','--offline');const packed=JSON.parse(npm('pack','--offline','--ignore-scripts','--json'));assert(fs.statSync(packed[0].filename).size>100);
 console.log(JSON.stringify({passed:true,contracts:checks,nativeNpmCacheReused:true,nativeNpmLifecycleAndPack:true,unsolicitedChecksDisabled:true,network:'none plus container loopback',disputed93748StillReproduces:true,fixedVaryWildcard93750:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
