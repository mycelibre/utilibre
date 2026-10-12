// Existing X.Org diagnostic over the real native Xvfb, no invented wire protocol.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
const [area,libraryPath,result]=process.argv.slice(2);assert(area&&libraryPath&&result);
const env={...process.env,LD_LIBRARY_PATH:libraryPath},display=area+'/display',fd=fs.openSync(display,'wx',0o600);
const xvfb=cp.spawn('/usr/bin/Xvfb',['-displayfd','3','-screen','0','128x96x24','-nolisten','tcp','-noreset'],{env,stdio:['ignore','ignore','pipe',fd]});fs.closeSync(fd);
let stderr='';xvfb.stderr.on('data',b=>stderr+=b);
try{
 let number;for(let n=0;n<80;n++){const text=fs.readFileSync(display,'utf8').trim();if(/^\d+$/.test(text)){number=text;break;}if(xvfb.exitCode!==null)throw Error('Native Xvfb startup failed');await new Promise(r=>setTimeout(r,50));}assert(number);
 const executable=area+'/diagnostics/usr/bin/xdpyinfo';
 const output=cp.execFileSync(executable,['-display',':'+number,'-ext','RENDER'],{env,encoding:'utf8',timeout:10000,stdio:['ignore','pipe','pipe']});
 assert.match(output,/dimensions:\s+128x96 pixels/);assert.match(output,/RENDER version\s+0\.11/);assert.match(output,/number of visuals:\s+[1-9]/);
 fs.writeFileSync(result,JSON.stringify({passed:true,nativeDisplay:true,renderExtension:true,dimensions:'128x96',maliciousProtocolReproduction:false,upstreamClient:'Debian x11-utils 7.7+7 xdpyinfo',libraries:libraryPath},null,2)+'\n');
}finally{xvfb.kill('SIGTERM');await Promise.race([new Promise(r=>xvfb.once('exit',r)),new Promise(r=>setTimeout(r,3000))]);if(xvfb.exitCode===null)xvfb.kill('SIGKILL');}
