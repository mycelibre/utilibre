// Use BentoPDF 2.8.8's native VITE_* air-gap configuration. No PDF/OCR engine changes.
// Build first with the environment documented in docs/service-pack.md, then run.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,mkdtemp,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const source='/opt/utilibre/src/bentopdf';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),'f96cd4e5166f3d51393dfe9f3c440b5bb77802f1');
const target='/opt/utilibre/pack-static/bentopdf-2.8.8-p3';
await mkdir(target,{recursive:true});await cp(`${source}/dist`,target,{recursive:true});
const temp=await mkdtemp('/opt/utilibre/bentopdf-assets-');
const manifest=[];
const locked=JSON.parse(await readFile(new URL('./bentopdf-runtime-lock.json',import.meta.url),'utf8'));
async function get(url,file,integrity){
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});assert(response.ok,`Asset HTTP ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());
 assert.equal(createHash('sha256').update(data).digest('hex'),locked.find(x=>x.url===url)?.sha256,'Reviewed runtime checksum changed');
 if(integrity)assert.equal('sha512-'+createHash('sha512').update(data).digest('base64'),integrity);
 await writeFile(file,data);manifest.push({url,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
async function extract(archive,dir){await mkdir(dir,{recursive:true});execFileSync('tar',['-xzf',archive,'--strip-components=1','-C',dir]);}
const wasm=target+'/wasm';
await extract(`${source}/bentopdf-airgap-bundle/bentopdf-pymupdf-wasm-0.11.16.tgz`,wasm+'/pymupdf');
await extract(`${source}/bentopdf-airgap-bundle/bentopdf-gs-wasm-0.1.1.tgz`,temp+'/gs');
await cp(temp+'/gs/assets',wasm+'/gs',{recursive:true});
await get('https://registry.npmjs.org/coherentpdf/-/coherentpdf-2.5.5.tgz',temp+'/cpdf.tgz','sha512-AAD3RG7lq2n34AtH352sbNDhJ82yfp2vFUp63/+Vu7snAqW0vyvY33XuhZdj6ubZUlFe1DNSSEaYcyc7+jTJ5Q==');
await extract(temp+'/cpdf.tgz',temp+'/cpdf');await cp(temp+'/cpdf/dist',wasm+'/cpdf',{recursive:true});
await mkdir(wasm+'/ocr/lang-data',{recursive:true});await mkdir(wasm+'/ocr/fonts',{recursive:true});
await cp(`${source}/node_modules/tesseract.js/dist/worker.min.js`,wasm+'/ocr/worker.min.js');
await cp(`${source}/node_modules/tesseract.js-core`,wasm+'/ocr/core',{recursive:true});
for(const [lang,integrity]of Object.entries({eng:'sha512-mbTumm6KQPUHyzTPQaF3ObXYnx0SqqfV2nabqFVQBwD6Kl7PhGSLSzOlfFTWy0P3BjghaSKA2W9GB19Jk+ZcTg==',spa:'sha512-9Ln+QKq/TNu4Hy4aOp5b4nXo9U0C6IqJMzNDpAJZe/fNtz6jXG9G/hQgR/Irxj+RGf0M7Xy1MNx1yl4wQUIfeg=='})){
 await get(`https://registry.npmjs.org/@tesseract.js-data/${lang}/-/${lang}-1.0.0.tgz`,`${temp}/${lang}.tgz`,integrity);
 await extract(`${temp}/${lang}.tgz`,`${temp}/${lang}`);
 await cp(`${temp}/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,`${wasm}/ocr/lang-data/${lang}.traineddata.gz`);
}
const fontBase='https://raw.githubusercontent.com/notofonts/noto-fonts/ffebf8c1ee449e544955a7e813c54f9b73848eac/';
await get(fontBase+'hinted/ttf/NotoSans/NotoSans-Regular.ttf',wasm+'/ocr/fonts/NotoSans-Regular.ttf');
await get(fontBase+'LICENSE',wasm+'/ocr/fonts/LICENSE');
await cp(`${source}/LICENSE`,target+'/LICENSE');
// The installed node-forge release has an unresolved signature-validation
// advisory. Use the upstream feature switch, without changing crypto code.
await writeFile(target+'/config.json',JSON.stringify({disabledTools:['validate-signature-pdf']})+'\n');
// Retain component license/source metadata with the shipped assets.
for(const [from,to]of [[temp+'/gs',wasm+'/gs'],[temp+'/cpdf',wasm+'/cpdf']]){
 for(const name of ['LICENSE','LICENSE.txt','LICENSE.md','package.json'])try{await cp(from+'/'+name,to+'/'+name)}catch(e){if(e.code!=='ENOENT')throw e}
}
let html=await readFile(target+'/index.html','utf8');
assert(html.includes('</body>'));html=html.replace('</body>','<footer style="padding:1rem;text-align:center"><a href="/utilibre-source/">Source and licenses · Código fuente y licencias</a> · <a href="https://utilibre.org/">Utilibre</a></footer></body>');
await writeFile(target+'/index.html',html);
await writeFile(target+'/asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared native air-gap assets at ${target}; download manifest included; build-only archives retained at ${temp}.`);
