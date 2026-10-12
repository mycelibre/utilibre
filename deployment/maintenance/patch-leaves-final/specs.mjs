// Same-application patch-only dependency overlays. Old pnpm directory labels are
// deliberately retained so upstream's relative symlinks remain intact.
export const output='/var/lib/utilibre-maintenance/patch-leaves-final-20261012';
export const packages={
 'js-yaml':{version:'4.3.2',integrity:'sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA=='},
 'source-map-js':{version:'1.2.2',integrity:'sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw=='},
 sharp:{version:'0.35.5',integrity:'sha512-Ywn4OnzGukp7CDMrp08RQ50YKmuwG47brZgIVPTvBaaAfQlRlygrRqSrxdCiL9M+LlzLBiJ68IR1QqvzHyjC7g=='},
 '@img/sharp-linux-x64':{version:'0.35.5',integrity:'sha512-SxFtLTeJInhAA9Q836kux2vZNeOBQEx658qvbboZScr0wIARym3IcGmW7KpVD5sbVg0Ojy+udFQdayYIZyoNog=='},
 '@img/sharp-linuxmusl-x64':{version:'0.35.5',integrity:'sha512-4KOphqB035HrVdqLZfCgMzzERrQkkzOwRhl4OAkRO1YCldbaFjySXMaK534Mo0V+LndnlJk+sbUyLeU0ULyD1A=='},
 '@img/sharp-wasm32':{version:'0.35.5',integrity:'sha512-Ptsga1su4tQx+LLF1ECS9U6nz5kmrXKo6XVbtR48Ke3ZRxxgaWBu7IDtEe1quo8hiupwm6WFqxVlXaSf7IINGQ=='},
 '@img/sharp-libvips-linux-x64':{version:'1.3.4',integrity:'sha512-GJ//SSXbnwSDes02umB3nDJLFcQzw8a18V8fyhqr6tV515tOEMdImjjxj1AoafMRz56F3PHgftnj1QEKSU1zkw=='},
 '@img/sharp-libvips-linuxmusl-x64':{version:'1.3.4',integrity:'sha512-6zXKeE/p39I1AmA3cJG35eyBGNqNddLnUXjhwBnsGjFPWqf5VKkDBEqaEkPDoTEtkxwi2vv8Tcr2mDyP4So7Fg=='},
};
export const specs=[
 {key:'admin',container:'utilibre-expanded-penpot-admin-console-1',base:'sha256:b19955812569217b6976e12997c25483f6d7f0d84cc7aa25983d30c476256ae4',candidate:'utilibre-penpot-admin:patch-leaves-20261012',runtime:'node',root:'/nitrate',paths:{'js-yaml':'/nitrate/apps/admin-console/node_modules/.pnpm/js-yaml@4.3.1/node_modules/js-yaml','source-map-js':'/nitrate/apps/admin-console/node_modules/.pnpm/source-map-js@1.2.1/node_modules/source-map-js'}},
 {key:'degoog',container:'utilibre-evaluation-degoog-1',base:'sha256:a61fd11271fd9f2f7f30debf7d7c7eafd5552be3218f8120aa264983ab11023c',candidate:'utilibre-degoog:1.0.0-patch-leaves-20261012',runtime:'bun',root:'/app',paths:{'source-map-js':'/app/node_modules/source-map-js'}},
 {key:'candlr',container:'utilibre-records-candlr-1',base:'sha256:e9b17d6f9445fc12fe0f41383327ba7e29b86c49ce633f7f07fdb291899c5a79',candidate:'utilibre-candlr:2.0.0-patch-leaves-20261012',runtime:'node',root:'/app',paths:Object.fromEntries(['source-map-js','sharp','@img/sharp-linux-x64','@img/sharp-linuxmusl-x64','@img/sharp-wasm32','@img/sharp-libvips-linux-x64','@img/sharp-libvips-linuxmusl-x64'].map(n=>[n,'/app/frontend/node_modules/'+n]))},
];
// Actual obsolete native filenames inspected in the predecessor and the pinned
// replacement archives. No deletion outside these six exact dependency files.
specs.find(s=>s.key==='candlr').removedFiles=[
 '/app/frontend/node_modules/@img/sharp-linux-x64/lib/sharp-linux-x64-0.35.4.node',
 '/app/frontend/node_modules/@img/sharp-linuxmusl-x64/lib/sharp-linuxmusl-x64-0.35.4.node',
 '/app/frontend/node_modules/@img/sharp-wasm32/lib/sharp-wasm32-0.35.4.node.js',
 '/app/frontend/node_modules/@img/sharp-wasm32/lib/sharp-wasm32-0.35.4.node.wasm',
 '/app/frontend/node_modules/@img/sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.6',
 '/app/frontend/node_modules/@img/sharp-libvips-linuxmusl-x64/lib/libvips-cpp.so.8.18.6',
];
