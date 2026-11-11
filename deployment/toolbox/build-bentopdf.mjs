// Native production build, with supported air-gap configuration only.
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
const source=resolve(process.argv[2]||'/opt/utilibre/src/bentopdf-2.8.11');
assert(process.argv.length<=3,'Usage: build-bentopdf.mjs [reviewed-source-directory]');
// A detached checkout is required; the minimal Node builder needs no Git binary.
assert.equal(readFileSync(resolve(source,'.git/HEAD'),'utf8').trim(),'f638f8e4db66cb69dec35ca061ad89034dd62445');
for(const generated of ['dist','docs/.vitepress/dist'])assert(!existsSync(resolve(source,generated)), 'Use a clean disposable checkout; do not mix app and documentation build outputs');
const origin='https://pdf.utilibre.org/wasm';
const env={...process.env,HUSKY:'0',SIMPLE_MODE:'true',DISABLE_GITHUB_STARS:'true',VITE_USE_CDN:'false',SITE_URL:'https://pdf.utilibre.org',ALLOW_INDEXING:'true',COMPRESSION_MODE:'o',NODE_OPTIONS:'--max-old-space-size=3072',DISABLE_TOOLS:'validate-signature-pdf',VITE_WASM_PYMUPDF_URL:origin+'/pymupdf/',VITE_WASM_GS_URL:origin+'/gs/',VITE_WASM_CPDF_URL:origin+'/cpdf/',VITE_TESSERACT_WORKER_URL:origin+'/ocr/worker.min.js',VITE_TESSERACT_CORE_URL:origin+'/ocr/core',VITE_TESSERACT_LANG_URL:origin+'/ocr/lang-data',VITE_TESSERACT_AVAILABLE_LANGUAGES:'eng,spa',VITE_OCR_FONT_BASE_URL:origin+'/ocr/fonts'};
try{execFileSync('npm',['run','build'],{cwd:source,env,timeout:600000,stdio:'inherit'});console.log('BentoPDF native production and localized-page build passed.');}
catch(e){console.error(String(e.stderr||e.message).slice(-1800));process.exitCode=1;}
