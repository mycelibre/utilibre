// Generate a pinned MIT source derivative, not an alias masquerading as node-ip.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {root,run,hash,save,floor} from './common.mjs';
const d=root+'/tracker';fs.mkdirSync(d,{recursive:true});floor();
const url='https://registry.npmjs.org/bittorrent-tracker/-/bittorrent-tracker-11.2.3.tgz';
const integrity='sha512-i9pWOf1YAQWyTjDnpWwcTfEYDi5XwqD6f48pKmIHByb7x2XU86CqK+IsyMy1buKkDZ3rDKht2jIeKCZf1Dmd8g==';
const r=await fetch(url);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length<2*1024**2);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),integrity);fs.writeFileSync(d+'/upstream.tgz',bytes);
assert(run('tar',['-tzf',d+'/upstream.tgz']).trim().split('\n').every(p=>p.startsWith('package/')&&!p.split('/').includes('..')));
const source=d+'/source';fs.mkdirSync(source,{recursive:true});assert(!fs.existsSync(source+'/package'),'Source already prepared');run('tar',['--no-same-owner','-xzf',d+'/upstream.tgz','-C',source]);
const file=source+'/package/lib/server/parse-udp.js';let t=fs.readFileSync(file,'utf8');
for(const[a,b]of [["import ipLib from 'ip'","import ipaddr from 'ipaddr.js'"],['ipLib.toString(ip)','ipaddr.fromByteArray(Array.from(msg.subarray(84, 88))).toString()']]){assert.equal(t.split(a).length,2);t=t.replace(a,b)}fs.writeFileSync(file,t);
const p=source+'/package/package.json',meta=JSON.parse(fs.readFileSync(p));assert.equal(meta.version,'11.2.3');assert.equal(meta.dependencies.ip,'^2.0.1');delete meta.dependencies.ip;meta.dependencies['ipaddr.js']='2.5.0';meta.version='11.2.3-utilibre.1';fs.writeFileSync(p,JSON.stringify(meta,null,2)+'\n');
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/bittorrent-tracker-11.2.3-utilibre.1.tgz','-C',source,'package']);
const patched=fs.readFileSync(d+'/bittorrent-tracker-11.2.3-utilibre.1.tgz');
save(d+'/source.json',{date:new Date().toISOString(),url,integrity,upstreamSha256:hash(bytes),version:meta.version,license:meta.license,archiveSha256:hash(patched),archiveIntegrity:'sha512-'+createHash('sha512').update(patched).digest('base64'),bytes:patched.length,changes:['Two-line UDP IPv4 decoder adaptation to existing ipaddr.js 2.5.0','Remove node-ip; explicit maintained dependency; local derivative version'],passed:true});
console.log(fs.readFileSync(d+'/source.json','utf8'));
