import {denoSourceName,wheelSourceName} from './collect.mjs';

// These collectors reject empty inputs. A successful scanner process that
// recognizes no packages therefore leaves their coverage incomplete.
export function sourceScanStatus(source,result){
 const nonempty=(source.name===denoSourceName&&source.scope==='upstream-release-source-lock')
  ||(source.name===wheelSourceName&&source.scope==='runtime-wheel-metadata');
 return !nonempty||(Number.isSafeInteger(result?.packages)&&result.packages>0)?'checked':'incomplete';
}
