import {execFileSync} from 'node:child_process';
import {writeFileSync,cpSync,mkdirSync} from 'node:fs';
const root='/opt/utilibre/evaluation-src/openreel-20261011';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!=='c9340465e5d37e684cc25bdbe746c4ccd45e165c')throw Error('Unexpected source');
const get=p=>execFileSync('git',['show','HEAD:'+p],{cwd:root,encoding:'utf8'}),put=(p,s)=>writeFileSync(root+'/'+p,s);
let analytics=get('apps/web/src/hooks/useAnalytics.ts');
put('apps/web/src/hooks/useAnalytics.ts',`// Utilibre: analytics are not compiled into this build.
type EventProperties = Record<string,string|number|boolean|null>;
const noop = (_event:string,_properties?:EventProperties) => {};
export function useAnalytics(){return {track:noop,identify:noop,isEnabled:false};}
`+analytics.slice(analytics.indexOf('export const AnalyticsEvents')));
put('apps/web/index.html',get('apps/web/index.html').replace(/<link rel="preconnect"[^>]*>/g,'').replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g,'<link href="/fonts/google-fonts.css" rel="stylesheet">'));
put('packages/core/src/video/decode-worker.ts',get('packages/core/src/video/decode-worker.ts').replaceAll('https://esm.sh/mediabunny@1.25.3','mediabunny'));
put('packages/core/src/media/ffmpeg-fallback.ts',get('packages/core/src/media/ffmpeg-fallback.ts').replace('https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm','/ffmpeg'));
let assets=get('apps/web/src/components/editor/AssetsPanel.tsx');
assets=assets.replace(/  \{\s*value: "ai",[\s\S]*?\n  \},/,'');
assets=assets.replace('onKieAI={item.type === "image"','onKieAI={false && item.type === "image"');
put('apps/web/src/components/editor/AssetsPanel.tsx',assets);
let editor=get('apps/web/src/components/editor/EditorInterface.tsx');
editor=editor.replace('const chatVisible = panels.agentChat?.visible ?? false;','const chatVisible = false; // Hosted cloud assistant disabled.').replace(', ["chat", "AI"]','');
put('apps/web/src/components/editor/EditorInterface.tsx',editor);
put('apps/web/src/components/editor/EditorActionRail.tsx',get('apps/web/src/components/editor/EditorActionRail.tsx').replace(/      <RailButton\s+label="AI Editor chat"[\s\S]*?\/>/,'').replace('Search tools, effects, or ask AI','Search tools and effects'));
mkdirSync(root+'/apps/web/public/ffmpeg',{recursive:true});
cpSync(root+'/packages/core/node_modules/@ffmpeg/core/dist/esm',root+'/apps/web/public/ffmpeg',{recursive:true});
console.log('OpenReel analytics removed, bundled fonts/FFmpeg, cloud generation entry disabled.');
