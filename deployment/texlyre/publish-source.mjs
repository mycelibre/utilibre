import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,cpSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const source=process.argv[2]||'/opt/utilibre/evaluation-src/texlyre-20261011';
const busy=process.argv[3]||'/opt/utilibre/evaluation-src/texlyre-busytex-1.4.0';
for(const [path,revision] of [[source,'0b5ebfd3dbcd2d3647dc777e8de9cbe0692b7950'],[busy,'1d9ba827ad0da2c85d05da2ada26a4debf6df81e']]) {
  if(execFileSync('git',['rev-parse','HEAD'],{cwd:path,encoding:'utf8'}).trim()!==revision)throw Error('Unexpected source revision');
}
const stage=mkdtempSync('/opt/utilibre/texlyre-source-');
for(const [path,name] of [[source,'texlyre'],[busy,'texlyre-busytex']]) {
  mkdirSync(`${stage}/${name}`);
  execFileSync('tar',['-cf',`${stage}/${name}.tar`,'--exclude=.git','--exclude=node_modules','--exclude=dist','--exclude=public/core','--exclude=public/assets/fonts','--exclude=public/assets/grammars','.'],{cwd:path});
  execFileSync('tar',['-xf',`${stage}/${name}.tar`,'-C',`${stage}/${name}`]);
}
cpSync(fileURLToPath(new URL('.',import.meta.url)),`${stage}/texlyre/utilibre-integration`,{recursive:true});
cpSync(`${source}/public/core/busytex/versions.txt`,`${stage}/texlyre/utilibre-integration/compiler-versions.txt`);
cpSync(fileURLToPath(new URL('../../docs/records/texlyre-2026-10-11.md',import.meta.url)),`${stage}/texlyre/utilibre-integration/REVIEW.md`);
execFileSync('tar',['-czf',`${stage}/texlyre-utilibre.tar.gz`,'texlyre','texlyre-busytex'],{cwd:stage});
renameSync(`${stage}/texlyre-utilibre.tar.gz`,'/opt/utilibre/toolbox-public/texlyre-utilibre.tar.gz');
console.log('Published modified TeXlyre source, BusyTeX wrapper, dependency pins and integration.');
