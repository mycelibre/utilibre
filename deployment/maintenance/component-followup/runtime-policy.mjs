export const rsshubRevision = 'a7d400051d8dc73c0a0a60197920df9d3f80b75c';
export const rsshubFix = '7f1c43094e8a82e4d8f036ff7d42568fed00699d';
export const rsshubDigest = 'e6b5eff9e25a0a344f683b6b7165c493e3b149d30b66973c0708d989a8106846';
export const trackerDigest = '87edbecf3ba6958d1420004d61864390566f1a0f9fd6ac3257c6b03961a18b51';
export function runtimePolicy(item, proof) {
  if (item.scope !== 'runtime-image' || !proof?.passed || proof.imageId !== item.artifact) return null;
  if (item.id === 'CVE-2021-21278' && item.package === 'rsshub' && item.installed === '1.0.0' &&
    proof.revision === rsshubRevision && proof.moduleCount === 4378 && proof.moduleDigest === rsshubDigest &&
    proof.removedModulesAbsent === true && proof.huxiuModuleCount === 8 && proof.huxiuUnsafeEvaluationAbsent === true &&
    proof.ancestry?.status === 'ahead' && proof.ancestry?.behind_by === 0 && proof.ancestry?.merge_base_commit?.sha === rsshubFix)
    return 'RSSHub uses non-semantic source revisions: deployed a7d400051d8dc73c0a0a60197920df9d3f80b75c descends from the exact 2021 repair 7f1c43094e8a82e4d8f036ff7d42568fed00699d. All 4378 compiled modules match the reviewed digest; removed routes are absent and the current eight Huxiu modules do not evaluate downloaded JavaScript. The package.json 1.0.0 string is not an affected release boundary. https://github.com/DIYgod/RSSHub/security/advisories/GHSA-pgjj-866w-fc5c';
  if (item.id === 'CVE-2024-29415' && item.package === 'ip' && item.installed === '2.0.1' &&
    proof.fileCount === 517 && proof.treeDigest === trackerDigest && proof.ipVersion === '2.0.1' &&
    proof.onlyIpImport === '/app/node_modules/bittorrent-tracker/lib/server/parse-udp.js' &&
    JSON.stringify(proof.ipApis) === '["toString"]' && proof.udpDisabled === true &&
    proof.classifierCalls === 0 && proof.websocketAnnouncements === 2 && proof.offerRoundtrip === true)
    return 'Exact reviewed WebSocket-only tracker dependency graph: node-ip is imported only by the disabled UDP parser, whose sole node-ip call is toString, not isPublic/isPrivate. Isolated native two-peer announcements and offer forwarding passed with classifier APIs replaced by throwing guards and UDP listeners absent. This bounds runtime reachability only: node-ip 2.0.1 is NOT repaired; the tracked source/dependency finding remains open. https://github.com/indutny/node-ip/issues/150';
  return null;
}
