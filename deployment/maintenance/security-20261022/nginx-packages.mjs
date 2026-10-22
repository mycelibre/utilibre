// Official NGINX Alpine packages. apk additionally verifies their vendor
// signatures using the key already present in the frozen predecessor image.
export const nginxPackages=[
 ['nginx-1.30.6-r1.apk','adf7c4e1f63ac1fecc9ece00a2baef39c7daa485052f3ef6e52f135cf33b074c'],
 ['nginx-module-geoip-1.30.6-r1.apk','d219d7088f793e880580271b9aa71512b2ca1cbfc879f65341a6f7990c89a77d'],
 ['nginx-module-image-filter-1.30.6-r1.apk','787935f12421501d35fe64448496d5293784860ddcd8169a0a0f620eddc44f7f'],
 ['nginx-module-njs-1.30.6.1.0.2-r1.apk','2125d32819b765ac4d45e4ccc4308bd5698c13252b500c5bd401400dc1cc3051'],
 ['nginx-module-xslt-1.30.6-r1.apk','ee7213140fe37a9b9863ac928d237274acc1ef76a7efaf672350942c069ddd69'],
];
export const nginxPackageNames=['nginx','nginx-module-geoip','nginx-module-image-filter','nginx-module-njs','nginx-module-xslt'];
