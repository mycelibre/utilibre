import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
const source='/opt/utilibre/evaluation-src/vvvebjs-20261011',dest='/opt/utilibre/creative-batch/sites/vvveb';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='1acbab7ebfe3e7b004f1f18c039d26550fc04bd8')throw Error('Unexpected source');
mkdirSync(dest,{recursive:true});
for(const name of ['css','fonts','html','img','js','libs','media'])cpSync(source+'/'+name,dest+'/'+name,{recursive:true});
cpSync(source+'/LICENSE',dest+'/LICENSE');cpSync(source+'/favicon.ico',dest+'/favicon.ico');
// Upstream ImageInput references an undefined element during ordinary selection.
// Use its native Input.element collection; prevent the optional PHP upload path.
let inputs=readFileSync(source+'/libs/builder/inputs.js','utf8');
inputs=inputs.replace('let ImageInput = { ...Input, ...{','let ImageInput = { ...Input, ...{\n    init: function(data) { return this.render("imageinput", data); },');
const broken='element.querySelector(\'input[type="text"]\').value = value;';
if(!inputs.includes(broken))throw Error('Review upstream ImageInput before updating');
inputs=inputs.replace(broken,'this.element[0].querySelector(\'input[type="text"]\').value = value;');
inputs=inputs.replace('onUpload: function(event, node) {','onUpload: function(event, node) {\n        alert("Server image uploads are disabled on this installation. / Las subidas de imágenes al servidor están desactivadas.");\n        return;');
writeFileSync(dest+'/libs/builder/inputs.js',inputs);
// Compile upstream's bundled Bootstrap styles for the native component palette.
const sass=process.env.UTILIBRE_SASS_JS||'/opt/utilibre/evaluation-src/graphite-20261011/frontend/node_modules/sass/sass.js';
if(JSON.parse(readFileSync(new URL('./package.json','file://'+sass),'utf8')).version!=='1.99.0')throw Error('Use the reviewed Sass 1.99.0 build tool');
execFileSync(process.execPath,[sass,'--no-source-map','--style=compressed',source+'/scss/bootstrap/bootstrap.scss',dest+'/css/bootstrap.min.css'],{stdio:['ignore','ignore','pipe']});
let html=readFileSync(source+'/editor.html','utf8');
// Supported editor page/component configuration; no save/upload PHP backend.
for(const name of ['plugin-google-fonts','plugin-ai-assistant','plugin-aos','components-widgets','components-embeds','oembed','plugin-media','sections-bootstrap4','blocks-bootstrap4'])html=html.replace(new RegExp('<script[^>]+src="libs/builder/'+name+'\\.js"[^>]*><\\/script>','g'),'');
html=html.replace(/<script[^>]+src="libs\/media\/openverse.js"[^>]*><\/script>/g,'');
html=html.replace(/<script[^>]+src="demo\/landing\/[^\"]+"[^>]*><\/script>/g,'');
html=html.replace(/let defaultPages = \{[\s\S]*?\n\tlet pages = defaultPages;/,'let defaultPages = { practice: { name: "practice", filename: "practice.html", file: "practice.html", url: "practice.html", title: "Fictional workshop / Taller ficticio" } };\nlet pages = defaultPages;');
html=html.replace('</head>','<meta name="description" content="Edit a local HTML page with VvvebJs and download it. No publishing, cloud AI, remote fonts or server uploads."><style>.save-btn, [data-vvveb-action="save"], [data-vvveb-action="saveAjax"], [data-vvveb-action="newPage"], #ai-assistant-btn, #media-modal, #new-page-modal {display:none!important}</style></head>');
html=html.replace('<title>VvvebJs</title>','<title>VvvebJs · Utilibre</title>');
writeFileSync(dest+'/index.html',html);
writeFileSync(dest+'/editor.html',html);
writeFileSync(dest+'/practice.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fictional workshop</title><link rel="stylesheet" href="css/bootstrap.min.css"></head><body><main class="container py-5"><h1>Fictional workshop / Taller ficticio</h1><p>This is fictional practice content. Replace this paragraph in the editor.</p><section><h2>Bring an idea</h2><p>Practice, discuss and keep a copy of your work.</p></section></main></body></html>`);
console.log('VvvebJs native static editor prepared with a local example; remote plugins and server save disabled.');
