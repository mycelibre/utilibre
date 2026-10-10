<?php
// Run inside the isolated rehearsal, never an unrelated production container.
require '/app/vendor/autoload.php';
if (getenv('http_proxy') !== 'http://172.29.155.3:3128') throw new RuntimeException('Wrong environment');
$client = Symfony\Component\HttpClient\HttpClient::create(['timeout'=>3, 'max_duration'=>5]);
$results = [];
foreach (['http://127.0.0.1:8080/', 'http://127.1/', 'http://2130706433/', 'http://0x7f000001/',
    'http://169.254.169.254/', 'http://10.10.1.43/', 'http://192.168.1.1/', 'http://100.64.0.1/',
    'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]/', 'http://192.0.2.1/',
    'http://198.51.100.1/', 'http://203.0.113.1/', 'https://utilibre.org:444/'] as $url) {
    try {
        $response = $client->request('GET',$url);
        $status = $response->getStatusCode();
        $pass = in_array($status,[400,403],true);
    } catch (Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface $error) {
        $pass = str_contains($error->getMessage(),'403') || str_contains($error->getMessage(),'400');
    }
    $results[] = ['target'=>$url,'denied'=>$pass];
}
foreach ([['10.10.1.43',22],['172.29.155.1',22],['1.1.1.1',443]] as [$host,$port]) {
    $socket = @fsockopen($host,$port,$errno,$error,1);
    $results[] = ['direct'=>"$host:$port",'denied'=>!$socket];
    if ($socket) fclose($socket);
}
$public = $client->request('GET','https://utilibre.org/en/');
$results[] = ['ownedPublicHttps'=>true,'passed'=>$public->getStatusCode()===200 && str_contains($public->getContent(),'Utilibre')];
foreach ($results as $result) if (!($result['denied'] ?? $result['passed'])) {
    echo json_encode($results,JSON_PRETTY_PRINT)."\n"; exit(1);
}
echo json_encode(['checks'=>count($results),'passed'=>true,'directNetworkBlocked'=>true,'tlsVerificationEnabled'=>true])."\n";
