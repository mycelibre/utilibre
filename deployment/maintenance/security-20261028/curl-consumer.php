<?php
// Installed PHP libcurl consumer; all destinations are a synthetic loopback peer.
$body="fictional transfer\n";$c=curl_init();
curl_setopt_array($c,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>5,CURLOPT_NOPROXY=>'*',CURLOPT_FOLLOWLOCATION=>true,CURLOPT_MAXREDIRS=>3,CURLOPT_ENCODING=>'',CURLOPT_CAINFO=>'/ca.pem']);
foreach(['/', '/redirect', '/gzip', '/brotli'] as $path){curl_setopt($c,CURLOPT_URL,'http://localhost:18080'.$path);if(curl_exec($c)!==$body)throw new Exception('Transfer failed');}
curl_setopt_array($c,[CURLOPT_URL=>'http://localhost:18080/post',CURLOPT_POSTFIELDS=>'fictional=utilibre']);if(curl_exec($c)!=='fictional=utilibre')throw new Exception('POST failed');
curl_setopt_array($c,[CURLOPT_HTTPGET=>true,CURLOPT_URL=>'https://localhost:18443/']);if(curl_exec($c)!==$body)throw new Exception('TLS failed');
curl_setopt($c,CURLOPT_URL,'https://127.0.0.1:18443/');if(curl_exec($c)!==false||curl_errno($c)!==60)throw new Exception('TLS name must fail');
curl_setopt($c,CURLOPT_URL,'http://localhost:18080/bad-brotli');if(curl_exec($c)!==false||curl_errno($c)!==61)throw new Exception('Invalid Brotli must fail');
curl_setopt($c,CURLOPT_URL,'http://localhost:18080/missing');if(curl_exec($c)!=='missing'||curl_getinfo($c,CURLINFO_RESPONSE_CODE)!==404)throw new Exception('404 failed');
echo json_encode(['passed'=>true,'checks'=>9,'version'=>curl_version()],JSON_THROW_ON_ERROR),"\n";
