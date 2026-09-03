import { handleRegexWorkerRequest, type RegexWorkerRequest } from './regex-worker';

self.addEventListener('message', (event: MessageEvent<RegexWorkerRequest>) => {
  self.postMessage(handleRegexWorkerRequest(event.data));
});
