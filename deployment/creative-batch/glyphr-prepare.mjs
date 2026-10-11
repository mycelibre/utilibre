import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const source=process.argv[2]||'/opt/utilibre/evaluation-src/glyphr-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='e12bb922f74a2e410c5ac580eebcb485aff0ad51')throw Error('Unexpected Glyphr source');
const original=p=>execFileSync('git',['show','HEAD:'+p],{cwd:source,encoding:'utf8'});
let app=original('src/app/app.js');
app=app.replace('telemetry: true, // Load google analytics','telemetry: false, // Utilibre: no visitor analytics');
app=app.replace(/\n\t\tif \(this.settings.telemetry && !dev.mode\) \{\n\t\t\taddTelemetry\(\);\n\t\t\}/,'');
app=app.replace(/\/\*\*\n \* Conditionally load Google Telemetry\n \*\/\nfunction addTelemetry\(\) \{[\s\S]*?\n\}\n/,'');
if(app.includes('googletagmanager')||app.includes('addTelemetry('))throw Error('Telemetry removal incomplete');
writeFileSync(source+'/src/app/app.js',app);
for(const file of ['src/app/menu.js','src/edit_canvas/events_keyboard.js']){
 writeFileSync(source+'/'+file,original(file).replace(/window.open\('https?:\/\/(?:www\.)?glyphrstudio.com\/app\/?', '_blank'\)/g,"window.open('/', '_blank')"));
}
const manifest=JSON.parse(original('src/manifest.json'));manifest.start_url='/';manifest.scope='/';
writeFileSync(source+'/src/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const index=original('src/index.html').replace('<title>Glyphr Studio v2</title>','<title>Glyphr Studio · Utilibre</title>\n<meta name="description" content="Edit and export fonts in your browser with Glyphr Studio, hosted by Utilibre.">');
writeFileSync(source+'/src/index.html',index);
console.log('Glyphr analytics removed; application launch links and manifest stay on this origin.');
