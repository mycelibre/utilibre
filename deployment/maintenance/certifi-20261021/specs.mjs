// Exact runtime inputs; this is not an unbounded package-upgrade policy.
export const output='/var/lib/utilibre-maintenance/certifi-20261021';
export const aiohttpPredecessors={beaverhabits:'uv',liberaforms:'pillow',kitchenowl:'pillow',authentik:''};
export const wheels=[
 {name:'certifi',version:'2026.10.19',file:'certifi-2026.10.19-py3-none-any.whl',sha256:'42d35340cc5b9ba78e818ddbff0c5b1c2b779de448a340fd1b989f5fa8670e1b',url:'https://files.pythonhosted.org/packages/c4/51/29046e48f693c54e5b7412216d447a1d8362c9653148d98c02cdf65fa733/certifi-2026.10.19-py3-none-any.whl'},
 {name:'pip',version:'26.2',file:'pip-26.2-py3-none-any.whl',sha256:'931c303696af6fa3417112103b1cad26890e5a07eccb5b99783700e33f2b8aad',url:'https://files.pythonhosted.org/packages/62/36/a3aed958d60531cb442b7ab4596cda7b3621cfb916f8ae1d6769795c7dc1/pip-26.2-py3-none-any.whl'},
];
export const specs=[
 ['radicale','0d70904a78e30a22b68b148b76d6c5ac5bdceaeecd5bc2318bd5067c5485026e','python','/usr/local/lib/python3.13/site-packages','2026.7.22',['utilibre-calendar-radicale-1']],
 ['candlr','168a1470310c86f24e995f1c2894ace97b81208a1426073ba13426c66030e39a','python','/usr/local/lib/python3.12/site-packages','2026.7.22',['utilibre-records-candlr-1']],
 ['beaverhabits','28388ff5aaee0df172c6859869f7e8f53e1a3987725ea4c567ffdfb651ba09f3','/app/.venv/bin/python','/app/.venv/lib/python3.13/site-packages','2026.6.17',['utilibre-beaverhabits-app-1']],
 ['13ft','2f9209f3e71d00fbdd20aff7e964ce127d2e6079deae23d7150cdf671e86c2bf','python','/usr/local/lib/python3.13/site-packages','2026.7.22',['utilibre-13ft-app-1']],
 ['liberaforms','37e9a53c7a16da1e50f1987ee59480f7f3ec7ea9b59b5ebd02e74c5d11ed6061','/app/venv/bin/python','/app/venv/lib/python3.13/site-packages','2024.7.4',['utilibre-pack-forms-app-1']],
 ['searxng','5ed0323b5f5f8701264ef65e239a2bd83cb57098f2b971fa30bf79c06eeae271','/usr/local/searxng/.venv/bin/python','/usr/local/searxng/.venv/lib/python3.14/site-packages','2026.7.22',['public-utility-searxng-1']],
 ['kitchenowl','7dac8811c08ac295bab6b658f3af27ee79d4d75864d7fa5cec3253a561d3837c','/opt/venv/bin/python','/opt/venv/lib/python3.14/site-packages','2026.7.22',['utilibre-kitchenowl-app-1']],
 ['unfurl','e43c0536d60ca0213720be31506a9b0dedd5d02f8a0412bd5537a8c856993dd1','python','/usr/local/lib/python3.13/site-packages','2026.7.22',['utilibre-unfurl-app-1']],
 ['linkding','e6f8af4beda6ff30a5b2b121d552e47f412cdc4e65f98f3ec29a34f1913ff62a','/etc/linkding/.venv/bin/python','/etc/linkding/.venv/lib/python3.13/site-packages','2025.11.12',['utilibre-linkding-linkding-1']],
 ['authentik','ee64d1a453b50531f6d2b9a7583e13a0a298667db2d747c4957c5aa33bc17674','/ak-root/.venv/bin/python','/ak-root/.venv/lib/python3.14/site-packages','2026.6.17',['utilibre-identity-server-1','utilibre-identity-worker-1']],
 ['simplelogin','fd27de8cc838e398183978ac4342b83fad4db46712c08ed5e4d05436d18ae15b','/code/.venv/bin/python','/code/.venv/lib/python3.12/site-packages','2026.7.22',['utilibre-simplelogin-web-1','utilibre-simplelogin-smtp-1','utilibre-simplelogin-jobs-1']],
 ['trip','fde6613d0c0ad65b1425294bb457ea6ed1e45e78a63b0845d7c22dde2ab424dc','python','/usr/local/lib/python3.12/site-packages','2026.7.22',['utilibre-trip-app-1']],
].map(([key,id,python,site,previous,containers])=>({key,base:'sha256:'+id,python,site,previous,containers,candidate:'utilibre-'+key+':certifi-20261021'}));
