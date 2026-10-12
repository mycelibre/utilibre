// Ordinary native consumer compatibility; no remote articles or exploit probes.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',proof=JSON.parse(fs.readFileSync(root+'/images/breezewiki/build.json'));
const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const bounded=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','96','--ulimit','core=0','--log-driver','none','--tmpfs','/tmp:rw,size=48m,mode=1777'];
const code=`(require racket/draw file/sha1)
(define bmp (make-bitmap 96 32))
(define dc (new bitmap-dc% [bitmap bmp]))
(send dc set-background "white") (send dc clear)
(send dc set-text-foreground "black") (send dc draw-text "Utilibre: á ñ" 2 2)
(send bmp save-file "/tmp/fictional.png" 'png)
(define copy (read-bitmap "/tmp/fictional.png"))
(unless (and (= 96 (send copy get-width)) (= 32 (send copy get-height))) (error "dimensions"))
(displayln (call-with-input-file "/tmp/fictional.png" sha1))`;
const raster=image=>run(['run','--rm',...bounded,'--entrypoint','racket',image,'-e',code]);
const oldRaster=raster(proof.base),newRaster=raster(proof.imageId);assert.equal(newRaster,oldRaster,'Native text/raster output changed');
const name='maintenance-xlib-breezewiki-compat';let started=false;
try{
 run(['run','-d','--name',name,...bounded,proof.imageId]);started=true;
 let ready=false;
 for(let n=0;n<40;n++){
  try{const reply=run(['exec',name,'python','-B','-c',"import urllib.request; r=urllib.request.urlopen('http://127.0.0.1:10416/',timeout=2); print(r.status); print(r.read(1000000).decode())"]);assert(reply.startsWith('200\n'));assert.match(reply,/BreezeWiki/);ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}
 }
 assert(ready,'Isolated native BreezeWiki homepage startup');
 const result={date:new Date().toISOString(),imageId:proof.imageId,passed:true,network:'none',nativeRacketTextPngRoundtrip:true,oldNewPngEqual:true,nativeHomepage200:true,productionChanged:false,limitation:'Compatibility with local graphics and homepage only. No remote article/media retrieval or malicious-X-server reproduction was attempted.'};
 fs.writeFileSync(root+'/images/breezewiki/native.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{if(started)run(['rm','-f','-v',name]);}
