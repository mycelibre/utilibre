// Rebuild from pinned upstream + reviewable patches. No production DB mounted.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, cp, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const upstream='/opt/utilibre/src/wallabag-repair-20261009';
const revision='496db5b457755bbf7d46f314716c8aad1b80fcfb';
const build=await mkdtemp('/opt/utilibre/wallabag-build-');
const run=(c,args,opts={})=>execFileSync(c,args,{stdio:'inherit',...opts});
assert.equal(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),revision);
const archive=execFileSync('git',['-C',upstream,'archive',revision],{maxBuffer:100*1024**2});
execFileSync('tar',['-xf','-','-C',build],{input:archive});
run('git',['apply','--check',resolve(here,'app-hardening.patch')],{cwd:build});
run('git',['apply',resolve(here,'app-hardening.patch')],{cwd:build});
await mkdir(`${build}/review`);
for(const name of ['Dockerfile','php-fpm.conf','nginx.conf','custom.css']) await cp(resolve(here,name),`${build}/review/${name}`);
// Build assets from the reviewed lockfile; no lifecycle hooks or telemetry plugin.
run('corepack',['yarn','install','--frozen-lockfile','--ignore-scripts','--non-interactive'],{cwd:build});
run('corepack',['yarn','run','build:prod'],{cwd:build});
const base=['run','--rm','--pull=never','--memory=768m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges',
  '-e','COMPOSER_HOME=/tmp/composer','-e','COMPOSER_ALLOW_SUPERUSER=1','-v',`${build}:/app`,'utilibre-wallabag-review:20261009'];
run('docker',[...base,'/usr/local/bin/composer','install','--no-dev','--no-scripts','--no-plugins','--prefer-dist','--no-interaction','--no-progress']);
run('node',[resolve(here,'apply-otphp-backport.mjs'),build]);
run('docker',[...base,'/usr/local/bin/composer','dump-autoload','--no-dev','--no-scripts','--optimize','--no-interaction']);
// The FOS routing JS is copied from the exact same locked dependency.
await cp(`${upstream}/web/bundles`,`${build}/web/bundles`,{recursive:true});
await writeFile(`${build}/.dockerignore`,'node_modules\nvar\ndata\ntests\n.git\n');
run('docker',['build','--target','app','-t','utilibre-wallabag:496db5b-p1','-f',`${build}/review/Dockerfile`,build]);
run('docker',['build','--target','web','-t','utilibre-wallabag-web:496db5b-p1','-f',`${build}/review/Dockerfile`,build]);
console.log(`Build source retained: ${build}`);
