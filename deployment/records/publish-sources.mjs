// No secrets or saved data enter source offers. Archive only pinned Git trees.
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
const repo='/home/ubuntu/freetools';
const out='/opt/utilibre/records/public';mkdirSync(out,{recursive:true});
const items=[['candlr','c8ac0eb11703e92c6daa3ad7908f2f219265e1a3'],['bookplate','47e53a7aec56aa9e76d4cf425deb48102e4a2fd7']];
const selected=process.argv.slice(2);if(selected.some(id=>!items.some(([key])=>key===id)))throw Error('Unknown source offer');
for(const [id,revision] of items.filter(([id])=>!selected.length||selected.includes(id))){
 const source='/opt/utilibre/evaluation-src/'+id+'-20261011';
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==revision)throw Error('Source mismatch');
 const stage=mkdtempSync('/opt/utilibre/records-source-');
 execFileSync('git',['archive','--format=tar','--prefix='+id+'/', '--output='+stage+'/source.tar',revision],{cwd:source});
 execFileSync('tar',['-xf',stage+'/source.tar','-C',stage]);
 mkdirSync(stage+'/'+id+'/utilibre');
 copyFileSync(repo+'/deployment/'+id+'/prepare.mjs',stage+'/'+id+'/utilibre/prepare.mjs');
 if(id==='bookplate')copyFileSync(repo+'/deployment/bookplate/security-package-lock.json',stage+'/'+id+'/utilibre/security-package-lock.json');
 if(id==='candlr'){copyFileSync(repo+'/deployment/candlr/Dockerfile',stage+'/'+id+'/utilibre/Dockerfile');copyFileSync(repo+'/deployment/candlr/security-package-lock.json',stage+'/'+id+'/utilibre/security-package-lock.json');}
 writeFileSync(stage+'/'+id+'/utilibre/BUILD.txt',`Upstream ${revision}. Utilibre privacy packaging, 11 October 2026.\nRun prepare.mjs against a Git checkout at this exact commit, then use ${id==='candlr'?'utilibre/Dockerfile':'Dockerfile'} to build. The original tree is included; prepare.mjs records all modifications. Production secrets and saved content are not build inputs.\n`);
 if(existsSync(out+'/'+id+'-utilibre.tar.gz'))copyFileSync(out+'/'+id+'-utilibre.tar.gz',stage+'/previous-source.tar.gz');
 execFileSync('tar',['-czf',out+'/'+id+'-utilibre.tar.gz','-C',stage,id]);
}
if(!selected.length)writeFileSync(out+'/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="description" content="Source code and privacy packaging for Utilibre records services."><title>Source code · Utilibre</title><h1>Source code / Código fuente</h1><p>Upstream notices and build instructions are included. No account data is included.</p><ul><li><a href="candlr-utilibre.tar.gz">Candlr 2.0.0 + privacy patch (GPL-3.0)</a></li><li><a href="bookplate-utilibre.tar.gz">Bookplate 1.1.0 + privacy patch (Apache-2.0)</a></li></ul><p><a href="https://utilibre.org/">Utilibre</a></p>');
console.log('Published source offers without secrets or saved data.');
