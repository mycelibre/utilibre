// GNU patch does not interpret the function name after @@. Old HDF-EOS has
// repeated loop text: bind every upstream hunk to its named function first.
import assert from 'node:assert/strict';
export function anchorHdfHunks(patch,source){
 const lines=source.split('\n');let delta=0;
 return patch.replace(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@ (\w+)\([^\n]*\n([\s\S]*?)(?=^@@ |^diff --git |$(?![\s\S]))/gm,(whole,old,oldCount,next,newCount,name,body)=>{
  assert(['SWinqfields','SWnentries','GDnentries'].includes(name),'Unreviewed HDF function');
  const starts=lines.flatMap((line,i)=>line.startsWith(name+'(')?[i]:[]);assert.equal(starts.length,1,'Unique function definition');
  const start=starts[0],end=lines.findIndex((line,i)=>i>start&&line==='}');assert(end>start);
  const original=body.replace(/\n$/,'').split('\n').filter(l=>!l.startsWith('+')&&!l.startsWith('\\')).map(l=>l.slice(1));
  assert.equal(original.length,Number(oldCount));
  const matches=[];
  for(let i=start;i+original.length<=end+1;i++)if(original.every((l,n)=>l===lines[i+n]))matches.push(i);
  assert.equal(matches.length,1,'Unique hunk inside '+name);
  const at=matches[0]+1,result=whole.replace(/^@@ -\d+,\d+ \+\d+,\d+ @@/,`@@ -${at},${oldCount} +${at+delta},${newCount} @@`);
  delta+=Number(newCount)-Number(oldCount);return result;
 });
}
