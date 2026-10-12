// Synthetic peer, no egress or request logging. Native HTTP/2, HTTP/1 and TLS.
import fs from 'node:fs';import http from 'node:http';import http2 from 'node:http2';import zlib from 'node:zlib';
function handler(req,res){
 let body='fictional transfer\n',code=200,headers={};
 if(req.url==='/redirect'){code=302;headers.location='/';body='';}
 if(req.url==='/redirect-smb'){code=302;headers.location='smb://127.0.0.1/fictional';body='';}
 if(req.url==='/missing'){code=404;body='missing';}
 if(req.url==='/gzip'){body=zlib.gzipSync(body);headers['content-encoding']='gzip';}
 if(req.url==='/browser'){body=JSON.stringify({userAgent:req.headers['user-agent'],brands:req.headers['sec-ch-ua'],protocol:req.httpVersion});headers['content-type']='application/json';}
 if(req.url.startsWith('/trending')){body='<html><body><article class="Box-row"><h2><a href="/fictional/example">fictional / example</a></h2><p>A fictional local feed item.</p></article></body></html>';headers['content-type']='text/html; charset=utf-8';}
 if(req.method==='POST'){
  const chunks=[];let size=0;req.on('data',b=>{size+=b.length;if(size>1024)req.destroy();else chunks.push(b);});
  req.on('end',()=>{const b=Buffer.concat(chunks);res.writeHead(200,{'content-length':b.length});res.end(b);});return;
 }
 headers['content-length']=Buffer.byteLength(body);res.writeHead(code,headers);res.end(body);
}
http.createServer(handler).listen(18080,'127.0.0.1');
http2.createSecureServer({allowHTTP1:true,key:fs.readFileSync('/fixture/key.pem'),cert:fs.readFileSync('/fixture/cert.pem')},handler).listen(18443,'127.0.0.1');
