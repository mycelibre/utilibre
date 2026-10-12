const fs=require('node:fs'),assert=require('node:assert/strict');
const spec=JSON.parse(fs.readFileSync(__dirname+'/npm-images.json')).find(x=>x.key===process.argv[2]);
assert(spec);
const target='/usr/local/lib/node_modules/npm';
assert(!fs.lstatSync(target).isSymbolicLink());
assert.equal(require(target+'/package.json').version,spec.oldNpm);
const replacement='/tmp/utilibre-reviewed-npm';
assert.equal(require(replacement+'/package.json').version,'11.21.0');
assert.equal(require(replacement+'/node_modules/brace-expansion/package.json').version,'5.0.11');
assert.equal(require(replacement+'/node_modules/undici/package.json').version,'6.28.1');
const semver=require(target+'/node_modules/semver');
assert(semver.satisfies(process.version,require(replacement+'/package.json').engines.node));
// Optional unused companion removal is exact-file/hash bound. Its absence and
// native optional-feature state are checked separately before release.
for(const [file,hash] of Object.entries(spec.removeUnused||{})){
 assert.equal(file,'/usr/bin/cloudflared');assert(fs.lstatSync(file).isFile());
 assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash);
 fs.unlinkSync(file);
}
fs.rmSync(target,{recursive:true});fs.cpSync(replacement,target,{recursive:true});fs.rmSync(replacement,{recursive:true});
// Supported npm settings: startup/version checks and advisory/funding lookups
// must not send background requests. Fleet security scanning is independent.
const settings='/usr/local/etc/npmrc';fs.mkdirSync('/usr/local/etc',{recursive:true});
const original=fs.existsSync(settings)?fs.readFileSync(settings,'utf8'):'';
fs.writeFileSync(settings,original+'\n# Utilibre: build/runtime package CLI has no unsolicited remote checks.\nupdate-notifier=false\naudit=false\nfund=false\n');
fs.mkdirSync('/usr/local/share/utilibre-language',{recursive:true});
fs.writeFileSync('/usr/local/share/utilibre-language/npm-update.json',JSON.stringify({old:spec.oldNpm,current:'11.21.0',braceExpansion:'5.0.11',undici:'6.28.1',applicationChanged:false,removedUnused:spec.removeUnused||{}},null,2)+'\n');
