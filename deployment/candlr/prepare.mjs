import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const source=process.argv[2]||'/opt/utilibre/evaluation-src/candlr-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!=='c8ac0eb11703e92c6daa3ad7908f2f219265e1a3')throw Error('Unexpected Candlr source');
const file='frontend/src/pages/about.astro';
const text=execFileSync('git',['show','HEAD:'+file],{cwd:source,encoding:'utf8'});
if(!text.includes('if (currentVersion !== "dev")'))throw Error('Update check changed');
writeFileSync(source+'/'+file,text.replace('if (currentVersion !== "dev")','if (currentVersion !== "dev" && process.env.UTILIBRE_DISABLE_UPDATE_CHECK !== "true")'));
const original=p=>execFileSync('git',['show','HEAD:'+p],{cwd:source,encoding:'utf8'});
let settings=original('frontend/src/pages/settings.astro');
// Keep element IDs for upstream event wiring but make unsupported controls inert.
settings=settings.replace(/<details class="group pb-5 border-b">[\s\S]*?<\/details>/g,block=>
 /id="(?:ntfy|discord|telegram|pushover|gotify|webpush)-enabled"/.test(block)?block.replace('<details ','<details hidden inert '):block);
settings=settings.replace('Click a channel to configure it.','Email reminders are available here. External notification providers and address-book sync are disabled on this instance.');
settings=settings.replace(/<section class="card p-6">\s*<h2 class="text-sm font-medium mb-1">Address book sync<\/h2>/,'<section hidden inert class="card p-6"><h2 class="text-sm font-medium mb-1">Address book sync</h2>');
writeFileSync(source+'/frontend/src/pages/settings.astro',settings);
let events=original('frontend/src/pages/events.astro');
events=events.replace('id="form-image-url"','disabled aria-label="Remote image URLs are unavailable; choose a local image file" id="form-image-url"').replace('id="form-image-url-btn"','disabled id="form-image-url-btn"');
writeFileSync(source+'/frontend/src/pages/events.astro',events);
console.log('Candlr automatic upstream version request disabled through the instance environment setting.');
