import {replaceImagePins} from '../language-final/release.mjs';
export const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
export function rollbackImageScalars(text,pairs,project){
 let out=replaceImagePins(text,pairs).text;
 if(project==='public-utility')for(const p of pairs){out=out.replace('${REDLIB_IMAGE:-'+p.from+'}','${REDLIB_IMAGE:-'+p.to+'}');out=out.split('\n').map(line=>line==='REDLIB_IMAGE='+p.from?'REDLIB_IMAGE='+p.to:line).join('\n');}
 return out;
}
export function exactDhiFinding(item,name,image,packageName,allowed){
 return item.status==='needs-review'&&item.scope==='runtime-image'&&item.type==='debian'&&item.artifact===image&&item.package===packageName&&allowed.has(item.id)&&Boolean(item.fixed)&&Array.isArray(item.containers)&&item.containers.length===1&&item.containers[0]===name;
}
