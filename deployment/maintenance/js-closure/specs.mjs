export const output='/var/lib/utilibre-maintenance/js-closure-20261012';
export const packages={
 'deepmerge-ts':{version:'8.0.2',integrity:'sha512-uqbvqLUMrc6p0MO+WBRtTxY55hmyh94WRwI5a++PZe54X+bfVh59FSN7uWCBCW1CCVjzjnrwzfI8zidE2obMMw=='},
 nodemailer:{version:'10.1.0',integrity:'sha512-fXW8AulB25aOTuwfRYV6lqHyfz2VM4rr4SGXH03mE7x5znEUpzL5mu6anARUpZN7744Ziwkmr4AxSLPJsBQspg=='},
 'basic-ftp':{version:'6.2.3',integrity:'sha512-T7GYtQ2eKJUN5YORG7A8u2WfB9JMN0a4/wl3MI64qq2qTRfa3FXzoNq0DDojZDkDyStcL+TkfKsz4JHEZx5kGQ=='},
 'image-size':{version:'2.0.4',integrity:'sha512-QRUkFFsRV/6fuESxb9Vkq+a0LkSrgKXuc2NEqfikiXxxN/G3tjWt5EVUlMaImRBZRZK/jRBEbYvpPYZL8t08Zw=='},
 'ip-address':{version:'10.7.4',integrity:'sha512-DWBMKyeM25D70nrIiTkgQth59/G+naKOTep6huF9j+GmeK3DMD60Zvxg5d5qQnz+38AHgou6ean2LECX+lrKDg=='},
};
export const specs=[
 {key:'wishlist',container:'utilibre-wishlist-app-1',base:'sha256:02d052af839b69b2b2d518eb324b47a8b54281ad94fe479908d625acb0341805',candidate:'utilibre-wishlist:0.67.1-js-closure-20261012',roots:['/usr/src/app'],paths:{'deepmerge-ts':['/usr/src/app/node_modules/.pnpm/deepmerge-ts@7.1.5/node_modules/deepmerge-ts'],nodemailer:['/usr/src/app/node_modules/.pnpm/nodemailer@9.1.1/node_modules/nodemailer']}},
 {key:'spliit',container:'utilibre-spliit-app-1',base:'sha256:2241940862a6099577960cb14a0f5472b73873e844b02d1d4211755e97e952f2',candidate:'utilibre-spliit:1.29.0-js-closure-20261012',roots:['/usr/app'],paths:{'deepmerge-ts':['/usr/app/node_modules/deepmerge-ts']}},
 {key:'rallly',container:'utilibre-community-rallly-1',base:'sha256:81af1c55c521e38bc8bdeb5ceaf223c7c3aef8f2c5821754b089af06f9e3e702',candidate:'utilibre-rallly:4.15.4-js-closure-20261012',roots:['/app'],paths:{'deepmerge-ts':['/app/node_modules/deepmerge-ts']}},
 {key:'kuma',container:'utilibre-community-uptime-kuma-1',base:'sha256:48efff64a859d5e40ce9d4d57d8d4416df8cf73a70f577b1c6cdfb6d0d0bd898',candidate:'utilibre-kuma:2.5.6-js-closure-20261012',roots:['/app'],paths:{nodemailer:['/app/node_modules/nodemailer']}},
 {key:'grist',container:'utilibre-records-grist-1',base:'sha256:3673ebe336af73f2e301aeea50b8552a6226357d5a370ee95aec27e1b6f9574f',candidate:'utilibre-grist:1.7.21-js-closure-20261012',roots:['/grist','/opt/utilibre-grist-reviewed-leaves','/usr/local/lib/node_modules/npm'],paths:{'basic-ftp':['/grist/node_modules/basic-ftp'],'image-size':['/grist/node_modules/image-size'],'ip-address':['/grist/node_modules/ip-address','/opt/utilibre-grist-reviewed-leaves/node_modules/ip-address','/usr/local/lib/node_modules/npm/node_modules/ip-address']}},
 {key:'rsshub',container:'utilibre-services-rsshub-1',base:'sha256:7fbae7dd2b7bb954b8f5cda4c7244e17e6fb6e016c5b425d215f3f04909f7382',candidate:'utilibre-rsshub:js-closure-20261012',roots:['/app'],paths:{'basic-ftp':['/app/node_modules/.pnpm/basic-ftp@5.3.1/node_modules/basic-ftp']}},
];
