export const specs=[
 ['grist','utilibre-records-grist-1','0244b2e92c341f9d5e4ff3c13f4b7594329c7dcf3e1bcfc21c6b9663f78a42f4','/grist /usr/local','utilibre-grist:1.7.21-expat-closure-20261012'],
 ['penpot-backend','utilibre-expanded-penpot-backend-1','0e6eb47f25fde0310f7b318144bf78c2bc068fb4f3a4f0edcaaebcc604eeae95','/opt','utilibre-penpot-backend:2.18.3-expat-closure-20261012'],
 ['kitchenowl','utilibre-kitchenowl-app-1','333bc47ed7d79a7740b3bfe99166a11fab1a497a2cfbb4849475061de59f0d98','/usr/src/kitchenowl /usr/local','utilibre-kitchenowl:expat-closure-20261012'],
 ['forms','utilibre-pack-forms-app-1','684c959c18f19a955f44ef19effdf2eef359d0f2d3a9e10259319f2fa22356f7','/app /usr/local','utilibre-liberaforms:4.11.1-expat-closure-20261012'],
 ['penpot-exporter','utilibre-expanded-penpot-exporter-1','a3102615b1349f141d787dd806bc3464a49d223a5336471b3e09b1bc74a6d8da','/opt','utilibre-penpot-exporter:2.18.3-expat-closure-20261012'],
 ['freshrss','utilibre-services-freshrss-1','a452bf8c4922fcd329dcaa13b83edfe25fe3b706c494e7ce37d6b2da43288d06','/var/www/FreshRSS /usr/local','utilibre-freshrss:expat-closure-20261012'],
 ['priviblur','utilibre-priviblur-priviblur-1','b12fd4045aae2c2c3cf41dca09a3a023ef37a9dc384eb4837a62f0bdeb05963c','/priviblur /usr/local','utilibre-priviblur:expat-closure-20261012'],
 ['rsshub','utilibre-services-rsshub-1','b38220476bbc16f3f6958b3bc89cd2455092c467e895e6a184a82d4bf20cde02','/app /usr/local','utilibre-rsshub:expat-closure-20261012'],
 ['breezewiki','utilibre-expanded-breezewiki-1','ff69e40bb993eb94a4ba99b1719fcf3dd6c2748a91e2d25648eed9dcc9e28d7e','/app /usr/local','utilibre-breezewiki:expat-closure-20261012'],
].map(([key,name,id,roots,candidate])=>({key,name,base:'sha256:'+id,roots,candidate}));
