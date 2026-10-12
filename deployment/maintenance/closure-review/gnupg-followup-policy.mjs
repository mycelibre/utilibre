import assert from 'node:assert/strict';
import {eligible} from '../gnupg-component-followup/policy.mjs';
export const gnupgReview='gnupg-component-followup-20261012/review.json';
export function gnupgFollowupStatus(file,item){
 assert.equal(file,gnupgReview);
 assert(eligible({...item,status:'needs-review'}),'Only the exact Penpot roles/packages/versions and tpm2daemon CVE are reviewed');
 return 'not-affected';
}
