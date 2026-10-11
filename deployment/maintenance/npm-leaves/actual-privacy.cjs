// Exact 26.10.0 distribution patch: suppress unsolicited release/news requests.
// Upstream has per-browser display preferences, not a server-wide egress switch.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
const web='/app/node_modules/@actual-app/web/build';
const changes=[];
function patch(path,beforeSha,old,next){const text=fs.readFileSync(path,'utf8');assert.equal(sha(text),beforeSha,path);assert.equal(text.split(old).length,2,path+' replacement occurrence');const output=text.replace(old,next);fs.writeFileSync(path,output);changes.push({path,beforeSha256:beforeSha,afterSha256:sha(output)});return sha(output);}
const news=patch(web+'/static/js/index.C1M3OSSF.js','ff3d5824e0751bd4470dbfec09bb018db538bf707de1b7376594e9a1a4a3cd3d',
 'async function fetchNewsFeed(){if(isPlaywright)return newsFeedFixture;',
 'async function fetchNewsFeed(){return {schemaVersion:1,entries:[]};if(isPlaywright)return newsFeedFixture;');
const versions=patch(web+'/static/js/months.CGSICdiJ.chunk.js','f51ed8db449f8562ea0951116ffd2abc1eb63254502acb2c30886c98295b4e13',
 'async function getLatestVersion(){if(isPlaywright)',
 'async function getLatestVersion(){return `unknown`;if(isPlaywright)');
patch('/app/chunks/app-BgMEdvse.js','9301191f73c12b47b8d7af6c83b05e8732072dc98f06694cdcfe1dceede26778',
 'var connectSrc = isDev ? "\'self\' ws: wss: http: https:" : "http: https:";',
 'var connectSrc = "\'self\' https://auth.utilibre.org";');
// Workbox owns caching. Change the two native precache revisions, not user data.
const worker=web+'/sw.js';let text=fs.readFileSync(worker,'utf8');const beforeSha=sha(text);
assert.equal(beforeSha,'e271c13886d5367559a19030f09bf1d305549567d95a7b06dc4b6b27522a5f59');
for(const [file,revision] of [['index.C1M3OSSF.js',news],['months.CGSICdiJ.chunk.js',versions]]){
 const old=`{url:"static/js/${file}",revision:null}`;assert.equal(text.split(old).length,2);
 text=text.replace(old,`{url:"static/js/${file}",revision:"${revision}"}`);
}
// Refresh cached navigation headers as well as the patched bundles. Otherwise
// Workbox could retain an index response carrying the old broad connection CSP.
const navigation='{url:"index.html",revision:"3f718aa80d8ed39ed415540d7283dbf4"}';
assert.equal(text.split(navigation).length,2);
text=text.replace(navigation,'{url:"index.html",revision:"utilibre-privacy-20261011"}');
fs.writeFileSync(worker,text);changes.push({path:worker,beforeSha256:beforeSha,afterSha256:sha(text)});
fs.writeFileSync('/opt/utilibre-reviewed-leaves/privacy-patch.json',JSON.stringify({application:'26.10.0',changes},null,2)+'\n');
