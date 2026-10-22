import {buildExactPackages} from '../js-closure/build.mjs';
export const output='/var/lib/utilibre-maintenance/security-20261022/redirects';
export const specs=[
 {key:'actual',container:'utilibre-expanded-actual-1',base:'sha256:076ec34cdf63809e131f4b6a023f845bc5e739869296e983809397ce64e66dc3',candidate:'utilibre-actual:redirects1161-security-20261022',roots:['/app'],paths:{'follow-redirects':['/app/node_modules/follow-redirects']}},
 {key:'kuma',container:'utilibre-community-uptime-kuma-1',base:'sha256:38451727e85fa87336c13298a9dfab813ac02a1a009888102533e4cd79ee12f4',candidate:'utilibre-kuma:redirects1161-security-20261022',roots:['/app'],paths:{'follow-redirects':['/app/node_modules/follow-redirects']}},
 {key:'grist-redirects',container:'utilibre-records-grist-1',base:'sha256:08e77e0e54b20fb2d20621028f25c062d6e6750a45ea8409e5a3dd504fc9ea48',candidate:'utilibre-grist:1.7.21-redirects1161-security-20261022',roots:['/grist'],paths:{'follow-redirects':['/grist/node_modules/follow-redirects']}},
];
export const packages={'follow-redirects':{version:'1.16.1',integrity:'sha512-FNvFGzoMLWmE6Yj9spb/zjd7yiNCHiAW9/Tg9CXrQ8wuu32HtlJOwWO11OJafl5FfY3DxTdQ0vj42zU1kvv5jg=='}};
if(process.argv[1]===new URL(import.meta.url).pathname)await buildExactPackages(specs,packages,output,process.argv.slice(2));
