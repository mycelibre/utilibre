// CVE-2026-109869: one small local response, not a live DoS probe.
const net=require('net'),assert=require('assert/strict'),{fetch}=require(process.argv[2]);
const server=net.createServer(socket=>{
 socket.once('data',()=>socket.end('HTTP/1.1 200 OK\r\nContent-Length: 42\r\nContent-Encoding: gzip, gzip, gzip, gzip, gzip, gzip\r\nConnection: close\r\n\r\n'));
});
server.listen(0,'127.0.0.1',async()=>{
 let rejected=false;
 try{const r=await fetch('http://127.0.0.1:'+server.address().port);await r.text();}catch(e){rejected=true;assert(e instanceof TypeError);}
 assert(rejected,'Excessive encodings must reject');
 // The old orphan stream's error occurs after the fetch rejection.
 setTimeout(()=>{server.close(()=>console.log('ENCODING_REJECTION_WITHOUT_PROCESS_CRASH_PASSED'));},250);
});
