// Native production build, with supported air-gap configuration only.
import {execFileSync} from 'node:child_process';
const origin='https://pdf.utilibre.org/wasm';
const env={...process.env,HUSKY:'0',SIMPLE_MODE:'true',DISABLE_GITHUB_STARS:'true',VITE_USE_CDN:'false',SITE_URL:'https://pdf.utilibre.org',COMPRESSION_MODE:'o',NODE_OPTIONS:'--max-old-space-size=3072',DISABLE_TOOLS:'validate-signature-pdf',VITE_WASM_PYMUPDF_URL:origin+'/pymupdf/',VITE_WASM_GS_URL:origin+'/gs/',VITE_WASM_CPDF_URL:origin+'/cpdf/',VITE_TESSERACT_WORKER_URL:origin+'/ocr/worker.min.js',VITE_TESSERACT_CORE_URL:origin+'/ocr/core',VITE_TESSERACT_LANG_URL:origin+'/ocr/lang-data',VITE_TESSERACT_AVAILABLE_LANGUAGES:'eng,spa',VITE_OCR_FONT_BASE_URL:origin+'/ocr/fonts'};
try{execFileSync('npm',['run','build'],{cwd:'/opt/utilibre/src/bentopdf',env,maxBuffer:32*1024*1024,stdio:'pipe'});console.log('BentoPDF native production and localized-page build passed.');}
catch(e){console.error(String(e.stderr||e.message).slice(-1800));process.exitCode=1;}
