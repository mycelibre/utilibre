// Isolated native X11 protocol tests; always launch our own Xvfb with fresh auth.
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
process.umask(0o077);
const [label,binary,output]=process.argv.slice(2);
assert(['baseline','candidate'].includes(label));assert(binary?.startsWith('/'));assert(output?.startsWith('/'));
const dir=fs.mkdtempSync(os.tmpdir()+'/utilibre-xserver-');
const display=String(200+Math.floor(Math.random()*10000));
assert(!fs.existsSync('/tmp/.X11-unix/X'+display));
const cookie=randomBytes(16),authName=Buffer.from('MIT-MAGIC-COOKIE-1');
const u16be=n=>{const b=Buffer.alloc(2);b.writeUInt16BE(n);return b;};
const authField=b=>Buffer.concat([u16be(b.length),b]);
fs.writeFileSync(dir+'/auth',Buffer.concat([u16be(65535),authField(Buffer.alloc(0)),authField(Buffer.from(display)),authField(authName),authField(cookie)]));
const log=fs.openSync(dir+'/server.log','w');
const proc=cp.spawn(binary,[':'+display,'-screen','0','320x240x24','-nolisten','tcp','-auth',dir+'/auth'],{stdio:['ignore',log,log]});
const pad=b=>Buffer.concat([b,Buffer.alloc((4-b.length%4)%4)]);
const counted=s=>{const b=Buffer.from(s),h=Buffer.alloc(2);h.writeUInt16LE(b.length);return pad(Buffer.concat([h,b]));};
let socket;
class Reader{
 constructor(s){this.buffer=Buffer.alloc(0);this.waiters=[];this.closed=false;s.on('data',b=>{this.buffer=Buffer.concat([this.buffer,b]);this.flush();});s.on('end',()=>{this.closed=true;this.flush();});s.on('error',()=>{this.closed=true;this.flush();});}
 flush(){while(this.waiters.length&&(this.buffer.length>=this.waiters[0].n||this.closed)){const w=this.waiters.shift();clearTimeout(w.timer);if(this.buffer.length<w.n)w.reject(Error('fixture server closed'));else{const b=this.buffer.subarray(0,w.n);this.buffer=this.buffer.subarray(w.n);w.resolve(b);}}}
 read(n){return new Promise((resolve,reject)=>{const w={n,resolve,reject,timer:setTimeout(()=>reject(Error('fixture protocol timeout')),5000)};this.waiters.push(w);this.flush();});}
}
const checks=[];let seq=0,reader,root,resource;
function request(major,minor,body=Buffer.alloc(0)){
 assert.equal(body.length%4,0);const h=Buffer.alloc(4);h[0]=major;h[1]=minor;h.writeUInt16LE((body.length+4)/4,2);socket.write(Buffer.concat([h,body]));return ++seq;
}
async function response(expected){
 const errors=[];
 for(;;){const h=await reader.read(32),type=h[0]&127;
  const extra=(type===1||type===35)?await reader.read(h.readUInt32LE(4)*4):Buffer.alloc(0);
  if(type===0)errors.push({code:h[1],sequence:h.readUInt16LE(2),value:h.readUInt32LE(4)});
  if(type===1&&h.readUInt16LE(2)===expected)return {header:h,data:extra,errors};
 }
}
const sync=()=>response(request(43,0));
async function extension(name){const b=Buffer.from(name),h=Buffer.alloc(4);h.writeUInt16LE(b.length);const r=await response(request(98,0,Buffer.concat([h,pad(b)])));assert.equal(r.header[8],1,name+' unavailable');return r.header[9];}
try{
 for(let i=0;i<100&&!fs.existsSync('/tmp/.X11-unix/X'+display);i++){assert.equal(proc.exitCode,null);await new Promise(r=>setTimeout(r,25));}
 socket=net.createConnection('/tmp/.X11-unix/X'+display);await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});reader=new Reader(socket);
 const h=Buffer.alloc(12);h[0]=108;h.writeUInt16LE(11,2);h.writeUInt16LE(authName.length,6);h.writeUInt16LE(cookie.length,8);socket.write(Buffer.concat([h,pad(authName),pad(cookie)]));
 const hello=await reader.read(8);assert.equal(hello[0],1,'Synthetic X11 authentication');
 const setup=await reader.read(hello.readUInt16LE(6)*4);resource=setup.readUInt32LE(4);const screen=32+Math.ceil(setup.readUInt16LE(16)/4)*4+setup[21]*8;root=setup.readUInt32LE(screen);
 // Render a bounded solid 8x8 pixmap and verify every native pixel.
 const pix=resource|1,gc=resource|2,create=Buffer.alloc(12);create.writeUInt32LE(pix);create.writeUInt32LE(root,4);create.writeUInt16LE(8,8);create.writeUInt16LE(8,10);request(53,24,create);
 const g=Buffer.alloc(16);g.writeUInt32LE(gc);g.writeUInt32LE(pix,4);g.writeUInt32LE(4,8);g.writeUInt32LE(0x2f80ed,12);request(55,0,g);
 const rect=Buffer.alloc(16);rect.writeUInt32LE(pix);rect.writeUInt32LE(gc,4);rect.writeUInt16LE(8,12);rect.writeUInt16LE(8,14);request(70,0,rect);
 const get=Buffer.alloc(16);get.writeUInt32LE(pix);get.writeUInt16LE(8,8);get.writeUInt16LE(8,10);get.writeUInt32LE(0xffffffff,12);
 const pixels=await response(request(73,2,get));assert.equal(pixels.errors.length,0);assert.equal(pixels.data.length,256);for(let p=0;p<256;p+=4)assert.equal(pixels.data.readUInt32LE(p)&0xffffff,0x2f80ed);
 checks.push({name:'native-pixel-roundtrip',width:8,height:8,allPixelsMatch:true});
 const xi=await extension('XInputExtension');const v=Buffer.alloc(4);v.writeUInt16LE(2);await response(request(xi,47,v));
 const ungrab=modifier=>{const b=Buffer.alloc(20);b.writeUInt32LE(root);b.writeUInt32LE(1,4);b.writeUInt16LE(2,8);b.writeUInt16LE(1,10);b.writeUInt32LE(modifier,16);request(xi,55,b);};
 ungrab(0);assert.equal((await sync()).errors.length,0);
 ungrab(256);const invalid=(await sync()).errors;
 if(label==='candidate')assert.deepEqual(invalid.map(e=>e.code),[2]);else assert.equal(invalid.length,0);
 checks.push({name:'CVE-2026-93523',invalidModifierRejected:invalid.length===1,validModifierAccepted:true,boundedNoExistingGrab:true});
 const rr=await extension('RANDR'),rrver=Buffer.alloc(8);rrver.writeUInt32LE(1);rrver.writeUInt32LE(5,4);await response(request(rr,0,rrver));
 const providersBody=Buffer.alloc(4);providersBody.writeUInt32LE(root);const providers=await response(request(rr,32,providersBody));
 assert.equal(providers.errors.length,0);const providerCount=providers.header.readUInt16LE(12);
 checks.push({name:'RandR-provider-query',providers:providerCount,limitation:'Xvfb has no RandR providers; CVE-2026-93521 native provider mutation is not reproduced. Signed fixed package and exact upstream source changes are verified separately.'});
 const xkb=await extension('XKEYBOARD'),xkbver=Buffer.alloc(4);xkbver.writeUInt16LE(1);await response(request(xkb,0,xkbver));
 // Valid geometry header/colors/shape/text, then one truncated font string.
 // This exercises the upstream cleanup error path with under 128 wire bytes.
 const geometry=Buffer.alloc(24);geometry.writeUInt16LE(0x100);geometry[2]=1;geometry.writeUInt32LE(31,4);geometry.writeUInt16LE(100,8);geometry.writeUInt16LE(50,10);geometry.writeUInt16LE(2,14);geometry.writeUInt16LE(1,16);geometry[21]=1;
 const shape=Buffer.alloc(8);shape.writeUInt32LE(31);shape[5]=255;shape[6]=255;
 const doodad=Buffer.alloc(20);doodad.writeUInt32LE(32);doodad[4]=3;doodad.writeUInt16LE(10,12);doodad.writeUInt16LE(10,14);
 const truncatedFont=Buffer.alloc(4);truncatedFont.writeUInt16LE(1000);
 request(xkb,20,Buffer.concat([geometry,counted('fixed'),counted('black'),counted('white'),shape,doodad,counted('fixture'),truncatedFont]));
 let geometryError=null,closed=false;
 try{geometryError=(await sync()).errors;}catch(e){closed=true;}
 if(label==='candidate'){assert(!closed);assert.deepEqual(geometryError.map(e=>e.code),[2]);assert.equal(proc.exitCode,null);}
 else {await new Promise(r=>setTimeout(r,100));assert(closed&&proc.exitCode!==null||proc.signalCode!==null,'Baseline must reproduce isolated cleanup crash');}
 checks.push({name:'CVE-2026-88812',malformedFontRejected:!closed,serverSurvived:!closed,isolatedBaselineCrash:closed});
 const report={date:new Date().toISOString(),label,binarySha256:createHash('sha256').update(fs.readFileSync(binary)).digest('hex'),passed:true,checks,productionChanged:false};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{
 socket?.destroy();if(proc.exitCode===null&&proc.signalCode===null){proc.kill('SIGTERM');await new Promise(r=>proc.once('exit',r));}fs.closeSync(log);
}
