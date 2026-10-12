import assert from 'node:assert/strict';
import {eligible} from '../xserver-followup/dhi-policy.mjs';
export const xserverDhiReview='xserver-followup-20261012/dhi-review.json';
export function xserverDhiStatus(file,item){
 assert.equal(file,xserverDhiReview);assert(eligible({...item,status:'needs-review'}),'Only exact DHI Xvfb version/role and three proved CVEs');return 'mitigated';
}
