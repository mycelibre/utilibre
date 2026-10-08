// Additional upstream runtimes for the existing OmniTools distribution.
// Run in the build directory after prepare-omnitools-assets.mjs (p2).
import {readFile,writeFile,mkdir,readdir,cp,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const lock=JSON.parse(await readFile(new URL('./omnitools-runtime-lock.json',import.meta.url),'utf8'));
const temp=await mkdtemp('/tmp/utilibre-omni-runtime-');
for(const item of lock){
 const response=await fetch(item.url,{signal:AbortSignal.timeout(60000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),item.integrity);
 await writeFile(`${temp}/${item.id}.tgz`,bytes);await mkdir(`${temp}/${item.id}`);
 execFileSync('tar',['-xzf',`${temp}/${item.id}.tgz`,'--strip-components=1','-C',`${temp}/${item.id}`]);
 await mkdir(`vendor/${item.id}`,{recursive:true});
 await cp(`${temp}/${item.id}/${item.path}`,`vendor/${item.id}`,{recursive:true});
 for(const name of ['LICENSE','LICENSE.txt','LICENSE.md','package.json'])try{await cp(`${temp}/${item.id}/${name}`,`vendor/${item.id}/${name}`)}catch(e){if(e.code!=='ENOENT')throw e}
}
const replacements=[
 ['https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm/','https://tools.utilibre.org/vendor/ffmpeg/esm/'],
 ['https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs','https://tools.utilibre.org/vendor/monaco/vs'],
 ['https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js','https://tools.utilibre.org/vendor/image-compression/browser-image-compression.js'],
];
let translationSettings=0;
async function patch(dir){for(const ent of await readdir(dir,{withFileTypes:true})){
 const file=dir+'/'+ent.name;if(ent.isDirectory()){await patch(file);continue}if(!/\.(js|html)$/.test(file))continue;
 let text=await readFile(file,'utf8'),before=text;
 // Documented Filerobot setting: use bundled translations, never its backend.
 if(text.includes('"useBackendTranslations",!0'))translationSettings++;
 text=text.replaceAll('"useBackendTranslations",!0','"useBackendTranslations",!1');
 for(const [from,to]of replacements)text=text.replaceAll(from,to);
 text=text.replace(/https:\/\/unpkg\.com\/@ffmpeg\/core@\$\{\w+\}\/dist\/umd\/ffmpeg-core\.js/g,'https://tools.utilibre.org/vendor/ffmpeg/umd/ffmpeg-core.js');
 text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js@v?\$\{\w+\}\/dist\/worker\.min\.js/g,'https://tools.utilibre.org/vendor/tesseract/worker.min.js');
 // Native Tesseract worker defaults. The pinned worker's template literals
 // resolve core variants relative to this directory; no remote fallback.
 text=text.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/tesseract\.js-core@\$\{[^}]+\}/g,'https://tools.utilibre.org/vendor/tesseract-core');
 text=text.replaceAll('https://tessdata.projectnaptha.com','https://tools.utilibre.org/vendor/lang-data');
 if(text!==before)await writeFile(file,text);
}}
await patch('assets');await patch('vendor/tesseract');
assert.equal(translationSettings,1,'Review the native Filerobot translation setting');
for(const lang of ['eng','spa'])await cp(`vendor/lang-${lang}/4.0.0`, 'vendor/lang-data/4.0.0',{recursive:true});
// Changed immutable build assets receive new names, including worker imports.
const names=(await readdir('assets')).filter(n=>/\.(js|css)$/.test(n));
const map=new Map(names.map(n=>[n,n.replace('-utilibre-p2','-utilibre-p5')]));
for(const file of ['index.html',...names.map(n=>'assets/'+n)]){
 let value=await readFile(file,'utf8');for(const [old,n]of map)value=value.replaceAll(old,n);
 await writeFile(file,value);
}
const {rename}=await import('node:fs/promises');for(const [old,n]of map)if(old!==n)await rename('assets/'+old,'assets/'+n);
await writeFile('vendor/runtime-lock.json',JSON.stringify(lock,null,2)+'\n');
console.log('Mirrored pinned compression, FFmpeg, Monaco and OCR runtimes; no remote default assets.');
