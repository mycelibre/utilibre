// Synthetic, networkless dependency contracts. No production accounts or mail.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const paths=JSON.parse(process.argv[2]),checks=[];
 for(const [name,locations] of Object.entries(paths))for(const location of locations){
  if(name==='deepmerge-ts'){
   const {deepmerge}=require(location);
   const source={nested:{a:1},labels:['a']};
   assert.deepEqual(deepmerge(source,{nested:{b:2},labels:['b']}),{nested:{a:1,b:2},labels:['a','b']});
   assert.deepEqual(source,{nested:{a:1},labels:['a']});
   const attack=JSON.parse('{"__proto__":{"polluted":true}}');deepmerge({},attack);assert.equal({}.polluted,undefined);
   checks.push('nested merge, arrays, input preservation and prototype isolation');
  }else if(name==='nodemailer'){
   const transport=require(location).createTransport({streamTransport:true,buffer:true,newline:'unix'});
   const result=await transport.sendMail({from:'fictional@example.invalid',to:'recipient@example.invalid',subject:'Fictional café',text:'Ficción; synthetic local stream only',attachments:[{filename:'fictional.txt',content:Buffer.from('sample')}]});
   const raw=result.message.toString();assert.match(raw,/multipart\/mixed/);assert.match(raw,/fictional\.txt/);assert.match(raw,/recipient@example.invalid/);
   assert.deepEqual(result.envelope.to,['recipient@example.invalid']);transport.close();checks.push('native email MIME, Unicode, attachment and recipient envelope; no network SMTP');
  }else if(name==='basic-ftp'){
   const ftp=require(location),client=new ftp.Client(500);
   assert.equal(typeof client.access,'function');assert.equal(typeof client.downloadTo,'function');assert.equal(typeof client.uploadFrom,'function');
   const parsed=ftp.parseList('-rw-r--r-- 1 fictional group 7 Oct 10 2026 fixture.txt\r\n');
   assert.equal(parsed.length,1);assert.equal(parsed[0].name,'fixture.txt');assert.equal(parsed[0].size,7);
   client.close();assert(client.closed);checks.push('FTP importer API, Unix listing and closure');
  }else if(name==='ip-address'){
   const {Address4,Address6}=require(location);
   assert.equal(new Address4('192.0.2.5').correctForm(),'192.0.2.5');
   assert.equal(new Address6('2001:db8::1').correctForm(),'2001:db8::1');
   assert.throws(()=>new Address4('999.2.3.4'));assert.throws(()=>new Address6('not-an-ip'));
   checks.push('native IPv4/IPv6 normalization and invalid input rejection');
  }else if(name==='image-size'){
   const {createRequire}=require('node:module'),r=createRequire('/grist/_build/app/server/lib/ActiveDoc.js');
   const {imageSizeFromFile}=r('image-size/fromFile');
   const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9i8AAAAASUVORK5CYII=','base64');
   const file='/tmp/fictional-image.png';fs.writeFileSync(file,bytes);
   const dimensions=await imageSizeFromFile(file);assert.equal(dimensions.width,1);assert.equal(dimensions.height,1);assert.equal(dimensions.type,'png');
   fs.writeFileSync('/tmp/invalid-image','not an image');await assert.rejects(imageSizeFromFile('/tmp/invalid-image'));
   checks.push('Grist caller-resolution Promise API, real PNG dimensions and malformed input rejection');
  }else throw Error('Unreviewed library');
 }
 console.log(JSON.stringify({passed:true,checks}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
