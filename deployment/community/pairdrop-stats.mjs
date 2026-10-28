// Test-side WebRTC observation only; no application, network or address logging.
// https://developer.mozilla.org/en-US/docs/Web/API/RTCTransportStats/selectedCandidatePairId
export function selectedIceModes(reports) {
  return reports.flatMap(rows => {
    const byId = new Map(rows.map(row => [row.id, row]));
    const selected = new Set(rows.filter(row => row.type === 'transport')
      .map(row => row.selectedCandidatePairId).filter(Boolean));
    return rows.filter(row => row.type === 'candidate-pair' && row.state === 'succeeded'
      && (selected.size ? selected.has(row.id) : row.nominated === true))
      .flatMap(row => {
        const local = byId.get(row.localCandidateId), remote = byId.get(row.remoteCandidateId);
        if (local?.type !== 'local-candidate' || remote?.type !== 'remote-candidate'
          || !local.candidateType || !remote.candidateType) return [];
        return [{ local: local.candidateType, remote: remote.candidateType }];
      });
  });
}

export async function waitForIceModes(read, { timeoutMs = 5000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  do {
    const modes = selectedIceModes(await read());
    if (modes.length) return modes;
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, deadline - Date.now())));
  } while (Date.now() <= deadline);
  throw Error('Selected WebRTC candidate statistics were not available before the deadline');
}
