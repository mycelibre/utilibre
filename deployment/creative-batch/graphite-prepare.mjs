import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const root='/opt/utilibre/evaluation-src/graphite-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!=='7477cd2fab315494e4c2613bc446c707733e6e7b')throw Error('Unexpected source');
const get=p=>execFileSync('git',['show','HEAD:'+p],{cwd:root,encoding:'utf8'}),put=(p,s)=>writeFileSync(root+'/'+p,s);
const url='https://graphite.utilibre.org/fonts/catalog.json';
let fonts=get('editor/src/messages/portfolio/fonts/utility_types.rs').replaceAll('https://api.graphite.art/font-list',url);
fonts=fonts.replace('format!("https://fonts.googleapis.com/css2?display=swap&family={name}:{italic}wght@{weight}&text={name}")','String::from("https://graphite.utilibre.org/fonts/preview.css")');
put('editor/src/messages/portfolio/fonts/utility_types.rs',fonts);
put('frontend/src/service-worker.js',get('frontend/src/service-worker.js').replaceAll('https://api.graphite.art/font-list',url));
put('node-graph/nodes/gstd/src/platform_application_io.rs',get('node-graph/nodes/gstd/src/platform_application_io.rs'));
// Native feature selection omits the optional Rust-GPU shader compiler; no new renderer.
put('tools/cargo-run/src/frontend.rs',get('tools/cargo-run/src/frontend.rs').replace('.args_if(native, ["--no-default-features", "--features", "native"])','.args_if(native, ["--no-default-features", "--features", "native"])\n\t\t\t.args_if(!native, ["--no-default-features", "--features", "web,gpu"])'));
mkdirSync(root+'/frontend/public/fonts',{recursive:true});
writeFileSync(root+'/frontend/public/fonts/catalog.json',JSON.stringify({items:[{family:'Lato',variants:['regular'],files:{regular:'https://graphite.utilibre.org/fonts/Lato-Regular.ttf'}}]}));
writeFileSync(root+'/frontend/public/fonts/preview.css','@font-face{font-family:Lato;src:url(Lato-Regular.ttf);font-weight:400;font-style:normal}');
console.log('Graphite: locally served font catalog; native web+gpu feature selection.');
