import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,here,run,json,hash,save} from './common.mjs';
const dir=root+'/tracker',out=dir+'/offer';fs.mkdirSync(out,{recursive:true});
for(const name of ['upstream.tgz','bittorrent-tracker-11.2.3-utilibre.1.tgz','source.json'])fs.copyFileSync(dir+'/'+name,out+'/'+name);
for(const name of ['tracker-prepare.mjs','tracker-stage.mjs','tracker-native.mjs','tracker-release.mjs','common.mjs'])fs.copyFileSync(here+name,out+'/'+name);
for(const name of ['package.json','package-lock.json','Dockerfile.tracker','tracker.mjs'])fs.copyFileSync('deployment/chitchatter/'+name,out+'/'+name);
const filename='security-tracker-ip-20261012-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',dir+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(dir+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);const b=fs.readFileSync(archive);
save(dir+'/source-offer.json',{date:new Date().toISOString(),published:true,filename,url:'https://tools.utilibre.org/utilibre-source/'+filename,sha256:hash(b),bytes:b.length});console.log(JSON.stringify(json(dir+'/source-offer.json')));
