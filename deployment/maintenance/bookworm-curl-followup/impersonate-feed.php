<?php
// Full native GithubTrending → Atom journey against a fictional local HTTPS peer.
require '/app/lib/bootstrap.php';require '/app/lib/config.php';
$container=require '/app/lib/dependencies.php';
$container['http_client']=fn()=>new class implements HttpClient {
 public function request(string $url,array $config=[]):Response {
  if(parse_url($url,PHP_URL_HOST)!=='github.com')throw new Exception('Unexpected fixture host');
  $config['curl_options'][CURLOPT_CONNECT_TO]=['github.com:443:localhost:18443'];
  $config['curl_options'][CURLOPT_CAINFO]='/ca.pem';
  $config['curl_options'][CURLOPT_NOPROXY]='*';
  $config['retries']=0;$config['timeout']=5;
  return (new CurlHttpClient())->request($url,$config);
 }
};
$result=(new RssBridge($container))->main(Request::fromCli(['action'=>'display','bridge'=>'GithubTrending','language'=>'python','format'=>'Atom']));
if($result->getCode()!==200)throw new Exception('Native synthetic bridge response failed: '.$result->getCode().' '.strip_tags($result->getBody()));
$xml=simplexml_load_string($result->getBody());
if(!$xml||count($xml->entry)!==1||(string)$xml->entry[0]->title!=='fictional / example')throw new Exception('Native feed content mismatch');
echo "RSSBRIDGE_FICTIONAL_GITHUB_HTTPS_TO_ATOM_PASSED\n";
