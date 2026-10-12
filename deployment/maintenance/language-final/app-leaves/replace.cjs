const fs=require('node:fs'),assert=require('node:assert/strict');
const [target,name,old,current]=process.argv.slice(2);
const allowed={
 '/app/node_modules/mysql2':'mysql2',
 '/usr/app/node_modules/mysql2':'mysql2',
 '/usr/src/app/node_modules/.pnpm/mysql2@3.15.3/node_modules/mysql2':'mysql2',
 '/app/node_modules/.pnpm/adm-zip@0.6.0/node_modules/adm-zip':'adm-zip',
};
assert.equal(allowed[target],name);assert(!fs.lstatSync(target).isSymbolicLink());
assert.equal(JSON.parse(fs.readFileSync(target+'/package.json')).version,old);
const source='/opt/utilibre-app-reviewed-leaves/node_modules/'+name;
assert.equal(JSON.parse(fs.readFileSync(source+'/package.json')).version,current);
fs.rmSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true});
if(name==='mysql2')fs.symlinkSync('/opt/utilibre-app-reviewed-leaves/node_modules',target+'/node_modules');
assert.equal(JSON.parse(fs.readFileSync(target+'/package.json')).version,current);
fs.mkdirSync('/usr/local/share/utilibre-language',{recursive:true});
fs.writeFileSync('/usr/local/share/utilibre-language/app-leaf.json',JSON.stringify({target,name,old,current},null,2)+'\n');
