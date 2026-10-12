import assert from 'node:assert/strict';
import fs from 'node:fs';
import {root,hash,save} from './common.mjs';
const d=root+'/nltk',rev='cbc98458b43de5f792f0382583c16df39e5c5117';fs.mkdirSync(d+'/upstream',{recursive:true});
const files=['nltk/data.py','nltk/pathsec.py','nltk/tag/perceptron.py','nltk/classify/maxent.py','nltk/parse/transitionparser.py','nltk/test/unit/test_pathsec_sweep_tag.py','nltk/test/unit/test_maxent_ne_save_security.py','nltk/test/unit/test_pickle_allowlist_security.py','LICENSE.txt'];const rows=[];
for(const name of files){const selected=/maxent/.test(name)?'2a92b71827d754ae8920261e7ed0c4bb283ab2d7':/transitionparser|pickle_allowlist/.test(name)?'a44a7af69bca87e92d9c4a701fcbbe4512e8d450':rev;const url='https://raw.githubusercontent.com/nltk/nltk/'+selected+'/'+name,r=await fetch(url);assert(r.ok,name);const b=Buffer.from(await r.arrayBuffer());assert(b.length<1024**2);const out=d+'/upstream/'+name;fs.mkdirSync(new URL('.', 'file://'+out).pathname,{recursive:true});fs.writeFileSync(out,b);rows.push({name,url,sha256:hash(b),bytes:b.length});}
save(d+'/upstream.json',{date:new Date().toISOString(),revision:rev,license:'Apache-2.0; perceptron MIT notice retained',files:rows});
