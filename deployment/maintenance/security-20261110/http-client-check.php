<?php
// Ordinary same-origin HTTP client compatibility; MockHttpClient does no I/O.
declare(strict_types=1);
require '/app/vendor/autoload.php';
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\HttpClient\ScopingHttpClient;
$checks = 0;
$check = function ($condition) use (&$checks) {
    if (!$condition) { throw new RuntimeException('Ordinary HTTP compatibility check '.($checks + 1).' failed'); }
    ++$checks;
};
$observed = [];
$mock = new MockHttpClient(function ($method, $url, $options) use (&$observed) {
    $observed[] = [$method, $url, $options];
    return new MockResponse('{"result":"fictional"}', ['http_code' => 200, 'response_headers' => ['content-type: application/json']]);
});
$client = ScopingHttpClient::forBaseUri($mock, 'https://fictional.example.invalid/api/', ['headers' => ['X-Example' => 'local-fixture'], 'timeout' => 3]);
foreach (['item', './item', '/api/item', 'https://fictional.example.invalid/api/item'] as $url) {
    $response = $client->request('GET', $url);
    $check($response->getStatusCode() === 200);
    $check($response->toArray() === ['result' => 'fictional']);
    $last = $observed[count($observed)-1];
    $check($last[1] === 'https://fictional.example.invalid/api/item');
    $check(in_array('X-Example: local-fixture', $last[2]['headers'], true));
}
$response = $client->request('POST', 'item', ['json' => ['name' => 'fictional']]);
$check($response->toArray() === ['result' => 'fictional']);
$last = $observed[count($observed)-1];
$check($last[0] === 'POST' && json_decode($last[2]['body'], true) === ['name' => 'fictional']);
$response = $client->request('GET', 'item', ['query' => ['page' => 2]]);
$check($response->getContent() === '{"result":"fictional"}');
$check($observed[count($observed)-1][1] === 'https://fictional.example.invalid/api/item?page=2');
$client->reset();
echo json_encode(['passed' => true, 'normalChecks' => $checks,
    'sourceSha256' => hash_file('sha256', '/app/vendor/symfony/http-client/ScopingHttpClient.php'),
    'network' => 'none', 'credentialLeakReproduction' => false], JSON_THROW_ON_ERROR)."\n";
