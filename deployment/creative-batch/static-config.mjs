// Deployment-only glue: isolated origins sharing one read-only static file server.
import {writeFileSync,mkdirSync} from 'node:fs';
const root='/opt/utilibre/creative-batch';
const sites=[['openreel',3230],['floorplan',3231],['blockbench',3232],['graphite',3234],['jscad',3235],['grid',3236],['fossflow',3237],['vvveb',3238],['microstudio',3239]];
mkdirSync(root+'/sites',{recursive:true});
let conf=`worker_processes 1;\npid /tmp/nginx.pid;\nerror_log /dev/null crit;\nevents { worker_connections 512; }\nhttp {\ninclude /etc/nginx/mime.types;\naccess_log off;\nserver_tokens off;\nclient_body_temp_path /tmp/client;\nproxy_temp_path /tmp/proxy;\nfastcgi_temp_path /tmp/fastcgi;\nuwsgi_temp_path /tmp/uwsgi;\nscgi_temp_path /tmp/scgi;\n`;
for(const [name,port] of sites){
 mkdirSync(root+'/sites/'+name,{recursive:true});
 conf+=`server {\nlisten ${port};\nserver_name ${name}.utilibre.org;\nroot /srv/sites/${name};\nindex index.html;\nallow 10.10.1.3; allow 10.10.1.43; allow 127.0.0.1; allow 172.29.160.1; deny all;\nadd_header Referrer-Policy no-referrer always;\nadd_header X-Content-Type-Options nosniff always;\nadd_header Cache-Control "no-cache, no-transform" always;\nadd_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; media-src 'self' blob: data:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'" always;\n`;
 if(['openreel','grid'].includes(name))conf+='add_header Cross-Origin-Opener-Policy same-origin always;\nadd_header Cross-Origin-Embedder-Policy require-corp always;\n';
 if(['graphite','microstudio'].includes(name)){
  conf+='add_header X-Robots-Tag "noindex, nofollow" always;\ndefault_type text/plain;\nreturn 503 "This tool has not passed the release review. / Esta herramienta no ha pasado la revisión para publicarse. More tools / Más herramientas: https://utilibre.org/\\n";\n}\n';
  continue;
 }
 conf+='location /utilibre-source/ { alias /srv/source/'+name+'/; }\n';
 if(name==='fossflow')conf+='location = /api/storage/status { default_type application/json; return 200 \'{"enabled":false}\'; }\n';
 if(name==='floorplan')conf+='location = /editor { try_files /index.html =404; }\n';
 conf+='location ~ \\.(php|pl|coffee|map)$ { return 404; }\nlocation /api/ { return 404; }\nlocation / { try_files $uri $uri/ =404; limit_except GET { deny all; } }\n}\n';
}
writeFileSync(new URL('./static-nginx.conf',import.meta.url),conf.replaceAll('allow 172.29.160.1;', 'allow 172.29.160.1; allow 172.29.161.1;').replaceAll("frame-ancestors 'none'", "frame-ancestors 'self'")+'}\n');
console.log('Generated read-only static gateway; missing application files return 404, not a fake ready page.');
