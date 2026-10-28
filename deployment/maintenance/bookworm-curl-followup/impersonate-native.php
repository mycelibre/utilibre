<?php
// Real installed PHP extension and RSS-Bridge HTTP client, synthetic input only.
require '/app/lib/bootstrap.php';
function check($ok,$message){if(!$ok)throw new Exception($message);}
$version=curl_version();check($version['ssl_version']==='BoringSSL','Impersonation TLS preserved');
$client=new CurlHttpClient();
$config=['timeout'=>5,'retries'=>0,'curl_options'=>[CURLOPT_CAINFO=>'/ca.pem',CURLOPT_NOPROXY=>'*']];
foreach(['http://localhost:18080/','http://localhost:18080/redirect','http://localhost:18080/gzip','https://localhost:18443/'] as $url){
 $r=$client->request($url,$config);check($r->getCode()===200&&$r->getBody()==="fictional transfer\n",'Native GET/redirect/gzip/TLS');
}
$post=$config;$post['curl_options'][CURLOPT_POSTFIELDS]='fictional=utilibre';
check($client->request('http://localhost:18080/post',$post)->getBody()==='fictional=utilibre','Native POST');
check($client->request('http://localhost:18080/missing',$config)->getCode()===404,'Native 404');
$rejected=0;
foreach(['https://127.0.0.1:18443/','smb://127.0.0.1/fictional','smbs://127.0.0.1/fictional','http://localhost:18080/redirect-smb'] as $url){
 try{$client->request($url,$config);}catch(HttpException $e){
  check(str_contains($e->getMessage(),'SSL')||stripos($e->getMessage(),'protocol')!==false||str_contains($e->getMessage(),'Unsupported URL scheme'),'Expected TLS/protocol rejection for synthetic '.$url.': '.$e->getMessage());$rejected++;
 }
}
check($rejected===4,'Native unsupported protocols and wrong TLS name rejected');
$browser=json_decode($client->request('https://localhost:18443/browser',$config)->getBody(),true,512,JSON_THROW_ON_ERROR);
check(str_contains($browser['userAgent'],'Chrome/131.'),'Original chrome131 profile');
check(str_contains($browser['brands'],'131'),'Original browser headers');
check($browser['protocol']==='2.0','Native HTTP/2 actually negotiated');
// A preloaded vendored TLS implementation must not break PHP OpenSSL consumers.
$key=random_bytes(32);$iv=random_bytes(12);$encrypted=openssl_encrypt('fictional','aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag);
check(openssl_decrypt($encrypted,'aes-256-gcm',$key,OPENSSL_RAW_DATA,$iv,$tag)==='fictional','PHP OpenSSL retained');
echo json_encode(['version'=>$version,'checks'=>12,'http2Negotiated'=>true,'chrome131Preserved'=>true,'unsupportedProtocolsRejected'=>true,'phpOpenSslPassed'=>true],JSON_THROW_ON_ERROR),"\n";
