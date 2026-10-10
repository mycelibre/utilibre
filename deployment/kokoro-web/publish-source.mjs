import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const recipe=fileURLToPath(new URL('./',import.meta.url));
const stage=mkdtempSync('/opt/utilibre/kokoro-source-');
try{
 for(const [name,source,revision] of [
  ['kokoro-web','/opt/utilibre/src/kokoro-web','2cb9d771a549870e7220783a53bdb2e99ed2f421'],
  ['espeak-ng','/opt/utilibre/src/kokoro-espeak-source','4870adfa25b1a32b4361592f1be8a40337c58d6c']]){
  execFileSync('git',['archive','--format=tar','--prefix='+name+'/','--output',stage+'/'+name+'.tar',revision],{cwd:source});
  execFileSync('tar',['-xf',stage+'/'+name+'.tar','-C',stage]);
 }
 mkdirSync(stage+'/kokoro-web/utilibre');
 cpSync(recipe,stage+'/kokoro-web/utilibre/kokoro-web',{recursive:true});
 cpSync(stage+'/espeak-ng',stage+'/kokoro-web/utilibre/espeak-ng',{recursive:true,verbatimSymlinks:true});
 writeFileSync(stage+'/kokoro-web/utilibre/BUILD.txt','Kokoro Web0.1.3-p1, MIT application; eSpeak NG1.52.0 GPL-3.0-or-later; Kokoro82M model/voices Apache-2.0; ONNX Runtime MIT and bundled dependency notices. The original sources are included with their exact local patches. Apply local-source.patch and phonemizer-source.patch using git apply --unidiff-zero in the respective source directories. README.md gives the pinned compiler/model hashes, build commands, native tests, privacy settings and limitations. Scripts have git revision guards when used with git checkouts; the archive itself contains the pinned source plus patches. No API server, credentials, private data, downloaded model duplication or inference endpoint is included. Model/licence assets are served at the application path and identified by model-manifest.json.\n');
 execFileSync('tar',['-czf',stage+'/kokoro-web-utilibre.tar.gz','-C',stage,'kokoro-web']);
 renameSync(stage+'/kokoro-web-utilibre.tar.gz','/opt/utilibre/toolbox-public/kokoro-web-utilibre.tar.gz');
}finally{rmSync(stage,{recursive:true,force:true});}
