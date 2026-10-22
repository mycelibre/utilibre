const fs=require('fs'),assert=require('node:assert/strict');
const key=process.argv[2],p=JSON.parse(fs.readFileSync('package.json'));
if(key==='spliit'){
 assert.equal(p.dependencies.next,'16.3.8');p.dependencies.next='16.4.1';
 p.overrides={...p.overrides,'mysql2':'3.23.1','deepmerge-ts':'8.0.2'};
}else if(key==='rallly'){
 assert.equal(p.version,'4.15.4');assert.equal(p.pnpm.overrides['next@16.3.0'],'16.3.8');
 p.pnpm.overrides={...p.pnpm.overrides,'next@16.3.0':'16.4.1','mysql2':'3.23.1','deepmerge-ts':'8.0.2','fast-xml-parser':'5.11.2'};
 const web=JSON.parse(fs.readFileSync('apps/web/package.json'));
 for(const [section,name] of [['dependencies','next'],['dependencies','@next/env'],['devDependencies','@next/bundle-analyzer']]){assert.equal(web[section][name],'16.3.8');web[section][name]='16.4.1';}
 fs.writeFileSync('apps/web/package.json',JSON.stringify(web,null,2)+'\n');
}else throw Error('Unsupported application');
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
