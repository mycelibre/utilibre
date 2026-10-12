import fs from 'node:fs';import {root,here,run,save,hash} from './common.mjs';
const d=root+'/nltk',out=d+'/offer';fs.mkdirSync(out,{recursive:true});
for(const n of ['original','upstream','context/nltk'])fs.cpSync(d+'/'+n,out+'/'+n,{recursive:true});
for(const n of ['backport.patch','backport.json','upstream.json'])fs.copyFileSync(d+'/'+n,out+'/'+n);
for(const n of ['nltk-acquire.mjs','nltk-backport.py','nltk-stage.mjs','nltk-native.py','nltk-check.mjs','nltk-release.mjs','common.mjs','python-manifest.py'])fs.copyFileSync(here+n,out+'/'+n);
const filename='security-nltk-model-paths-20261012-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(d+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);const b=fs.readFileSync(archive);
save(d+'/source-offer.json',{date:new Date().toISOString(),published:true,filename,url:'https://tools.utilibre.org/utilibre-source/'+filename,sha256:hash(b),bytes:b.length,scope:'Exact original/patched modules, immutable upstream sources and notices, mechanical backport and isolated verification/release recipes. No production configuration or data.'});
