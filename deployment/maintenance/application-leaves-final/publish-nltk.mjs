import fs from 'node:fs';import {root,here,run,save,hash} from './common.mjs';
if(process.argv.includes('--weka-oct28')){
 const d='/var/lib/utilibre-maintenance/security-20261028/nltk',src=new URL('../security-20261028/',import.meta.url).pathname,out=d+'/offer';
 fs.mkdirSync(out,{recursive:true});
 const input=JSON.parse(fs.readFileSync(src+'nltk-inputs.json')),s=input.rows[0],b=JSON.parse(fs.readFileSync(d+'/kitchenowl/build.json'));
 if(!b.passed||b.base!==s.base)throw Error('Missing exact candidate');
 for(const n of ['nltk-inputs.json','nltk-weka.patch','nltk-check.py','dnspython.mjs'])fs.copyFileSync(src+n,out+'/'+n);
 fs.copyFileSync(root+'/nltk/upstream/LICENSE.txt',out+'/LICENSE.txt');
 fs.copyFileSync(d+'/upstream.patch',out+'/upstream.patch');
 const c=run('docker',['create','--entrypoint','/bin/true',s.base]).trim();
 try{run('docker',['cp',c+':'+s.site+'/nltk/classify/weka.py',out+'/original-weka.py']);}finally{run('docker',['rm',c]);}
 const c2=run('docker',['create','--entrypoint','/bin/true',b.imageId]).trim();
 try{run('docker',['cp',c2+':'+s.site+'/nltk/classify/weka.py',out+'/patched-weka.py']);}finally{run('docker',['rm',c2]);}
 if(hash(fs.readFileSync(out+'/original-weka.py'))!==s.files[0].beforeSha256||hash(fs.readFileSync(out+'/patched-weka.py'))!==s.files[0].afterSha256)throw Error('Source mismatch');
 fs.writeFileSync(out+'/README.txt','Exact Weka model-path backport from NLTK 6a17606293fe9d3ea1006f99dd3fed2e2b25d519. Apache-2.0. Only import context adapted. Earlier NLTK backports remain in security-nltk-model-paths-20261012-source.tar.gz. Full replay helpers and fixtures: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261028 . No production data.\n');
 const filename='security-nltk-weka-20261028-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
 run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(d+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);
 save(d+'/source-offer.json',{date:new Date().toISOString(),published:true,filename,archive,sha256:hash(fs.readFileSync(archive)),bytes:fs.statSync(archive).size});
 process.exit(0);
}
const d=root+'/nltk',out=d+'/offer';fs.mkdirSync(out,{recursive:true});
for(const n of ['original','upstream','context/nltk'])fs.cpSync(d+'/'+n,out+'/'+n,{recursive:true});
for(const n of ['backport.patch','backport.json','upstream.json'])fs.copyFileSync(d+'/'+n,out+'/'+n);
for(const n of ['nltk-acquire.mjs','nltk-backport.py','nltk-stage.mjs','nltk-native.py','nltk-check.mjs','nltk-release.mjs','common.mjs','python-manifest.py'])fs.copyFileSync(here+n,out+'/'+n);
const filename='security-nltk-model-paths-20261012-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',d+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(d+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);const b=fs.readFileSync(archive);
save(d+'/source-offer.json',{date:new Date().toISOString(),published:true,filename,url:'https://tools.utilibre.org/utilibre-source/'+filename,sha256:hash(b),bytes:b.length,scope:'Exact original/patched modules, immutable upstream sources and notices, mechanical backport and isolated verification/release recipes. No production configuration or data.'});
