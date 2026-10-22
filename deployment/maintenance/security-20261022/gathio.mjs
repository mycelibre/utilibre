// Unbundled server imports: preserve all application and OS bytes except these
// two exact dependencies. The native Gathio workflow remains a separate gate.
import {buildExactPackages} from '../js-closure/build.mjs';
export const output='/var/lib/utilibre-maintenance/security-20261022';
export const spec={key:'gathio',container:'utilibre-gathio-gathio-1',base:'sha256:0443d63cdfeded550ee322f227e4ab91e2d919b037036320bdb3f8e041f10089',candidate:'utilibre-gathio:1.6.7-dom-toml-security-20261022',roots:['/srv/gathio'],paths:{dompurify:['/srv/gathio/node_modules/.pnpm/dompurify@3.4.16/node_modules/dompurify'],toml:['/srv/gathio/node_modules/.pnpm/toml@5.0.0/node_modules/toml']}};
export const packages={
 dompurify:{version:'3.4.17',integrity:'sha512-B/pSlYVHQ58kqISD/yDjuJ1yfzI34m1gF4lAod2bwSRhiN4K5Cl3H8Af7hqB2PmTL911tdEudnnXn5FnhRoz0w=='},
 toml:{version:'5.0.1',integrity:'sha512-EqYNA/YvUNndrA2B3O2ojzLQoTQrBxeZ9UIjQwk8t10oe6n7dwclBwd9IdZQTOKwe6vWX+AXtl6IntXRbepdxQ=='},
};
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await buildExactPackages([spec],packages,output,['gathio']);
