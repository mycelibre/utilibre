// Finite same-branch PHP update. These inputs are the maintained application
// images, not their original upstream bases. No application upgrade/migration.
export const output='/var/lib/utilibre-maintenance/php-20261022';
export const advisories=['CVE-2026-109618','CVE-2026-109619'];
export const specs=[
 {key:'degoog',base:'sha256:3e8932490132625391ad0d086f0071e9393ea525767a4b58cf1d56a7d39674f2',containers:['utilibre-evaluation-degoog-1'],manager:'apk',branch:'3.22',origin:'php84',version:'8.4.27-r0',php:'php',roots:['/app','/etc/php84']},
 {key:'privatebin',base:'sha256:9816ec497b2c53e6f5f009db6f3a07a0d746afd224e99efbfc073370e7e01b17',containers:['utilibre-services-privatebin-1'],manager:'apk',branch:'3.24',origin:'php85',version:'8.5.12-r0',php:'php',roots:['/srv','/var/www','/etc/php85','/etc/nginx']},
 {key:'fourget',base:'sha256:b1046c28a464248f83ee55225048a91fd211b1d03e9543038702e93c9908a19d',containers:['utilibre-reader-evaluation-fourget-1'],manager:'apk',branch:'3.23',origin:'php84',version:'8.4.27-r0',php:'php',roots:['/var/www','/etc/php84','/etc/apache2']},
 {key:'freshrss',base:'sha256:9b74a8a1411fd8ad582be1badb0602b81ceeb215547e87d32b58a965399fc323',containers:['utilibre-services-freshrss-1'],manager:'deb',origin:'php8.4',version:'8.4.27-1~deb13u1',php:'php',roots:['/var/www/FreshRSS','/etc/php','/etc/apache2','/usr/local']},
 {key:'rssbridge',base:'sha256:3355783128dd59780c2f369fcb97eff7b92cbd41bc656f75997014c1fc76fd3d',containers:['utilibre-community-rssbridge-1'],manager:'deb',origin:'php8.2',version:'8.2.35-1~deb12u1',php:'php',roots:['/app','/etc/php','/etc/nginx','/usr/local']},
 {key:'wallabag',base:'sha256:377062036d58e98a69df2de531499219703a7b0129d51077cbd56e4a42040c7a',containers:['utilibre-wallabag-app-1'],manager:'apk',branch:'3.24',origin:'php84',version:'8.4.27-r0',php:'php',roots:['/app','/etc/php84']},
 {key:'translite',base:'sha256:30cd0dd055e0816e415e5c32766159a3e7ca41391963bc2d08efc03530c3b35a',containers:['utilibre-translite-translite-1'],manager:'apk',branch:'3.24',origin:'php85',version:'8.5.12-r0',php:'php',roots:['/app','/etc/php85']},
 {key:'binternet',base:'sha256:5cb3cb70b118ab460fb9aa1fae3f119c3a60298ce7446d3c9f88a0912d4c8ec2',containers:['utilibre-binternet-binternet-1','utilibre-binternet-onion-binternet-onion-1'],manager:'apk',branch:'3.23',origin:'php84',version:'8.4.27-r0',php:'php',roots:['/app','/etc/php84']},
 {key:'addy',base:'sha256:96ec9ebf8f30c67452d3df5f4061bc48de6213c0631bc8f8159347e3df205f25',containers:['utilibre-addy-app-1'],manager:'apk',branch:'3.23',origin:'php84',version:'8.4.27-r0',php:'php',roots:['/var/www','/etc/php84']},
 {key:'pollaris',base:'sha256:c0b42f11fe1db00c7beffc45e55c1dc1f7cf1d7919a89f821e3a8bdb4cd86c6d',containers:['utilibre-pollaris-pollaris-1','utilibre-pollaris-worker-1'],manager:'official-php',donor:'php@sha256:e4ec029f5afe6c8f8c0b5e5d75e27efcc3eefa462af81d9021f2a7311960c3c1',version:'8.5.12',php:'php',roots:['/app','/usr/local/etc']},
];
export const candidate=s=>'utilibre-'+s.key+':php-security-20261022';
