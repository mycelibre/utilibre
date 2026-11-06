<?php
declare(strict_types=1);
if (getenv('UTILIBRE_SECURITY_DISPOSABLE') !== 'yes') exit(1);
require '/var/www/FreshRSS/cli/_cli.php';
cliInitUser('fictional');
$xml='<?xml version="1.0"?><rss version="2.0"><channel><title>Fictional feed</title><link>https://example.invalid/</link><description>Fictional only</description><item><guid>urn:fictional:one</guid><title>Fictional café</title><link>https://example.invalid/one</link><description>Unicode XML fixture</description></item></channel></rss>';
$feed=new SimplePie\SimplePie();
$feed->set_raw_data($xml); $feed->enable_cache(false);
if (!$feed->init() || $feed->get_item_quantity() !== 1 || $feed->get_item(0)?->get_title() !== 'Fictional café') throw new Exception('Native feed parser failed');
$id=FreshRSS_Factory::createFeedDao()->addFeed(['url'=>'https://example.invalid/fictional.xml','kind'=>0,'category'=>1,'name'=>'Fictional feed','website'=>'https://example.invalid/','description'=>'Synthetic XML fixture','lastUpdate'=>time(),'error'=>0]);
if (!$id) throw new Exception('Native feed storage failed');
$entry=new FreshRSS_Entry($id,'urn:fictional:one','Fictional café','Fictional Author','<p>Fictional body.</p>','https://example.invalid/one',time(),false,true);
$entry->_id((string)(int)(microtime(true)*1000000));
if (!FreshRSS_Factory::createEntryDao()->addEntry($entry->toArray(),false)) throw new Exception('Native article storage failed');
[$filename,$opml]=(new FreshRSS_Export_Service('fictional'))->generateOpml();
// FreshRSS 1.30.2+ streams exports to a temporary file to bound memory use.
if (version_compare(FRESHRSS_VERSION, '1.30.2', '>=')) {
    if (!is_file($opml)) throw new Exception('Native OPML temporary file missing');
    $exportPath = $opml;
    $opml = file_get_contents($exportPath);
    unlink($exportPath);
    if ($opml === false) throw new Exception('Native OPML temporary file unreadable');
}
$document=new DOMDocument();
if (!$document->loadXML($opml,LIBXML_NONET)) throw new Exception('OPML invalid');
$xpath=new DOMXPath($document);
if ($xpath->query('//outline[@xmlUrl="https://example.invalid/fictional.xml"]')->length !== 1) throw new Exception('OPML missing feed');
// New upstream sanitizer behavior: exercise rejection and legitimate content.
if (version_compare(FRESHRSS_VERSION, '1.30.2', '>=')) {
    foreach ([
        ['<a href="data:text/html,<script>alert(1)</script>">click</a>', 'href="data:'],
        ['<iframe src="data:text/html,<script>alert(1)</script>"></iframe>', 'src="data:'],
        ['<a href="javascript:alert(1)">click</a>', 'href="javascript:'],
        ['<img src="x" onerror="alert(1)">', 'onerror'],
    ] as [$input, $forbidden]) {
        if (str_contains(FreshRSS_SimplePieCustom::sanitizeHTML($input), $forbidden)) throw new Exception('Unsafe native sanitizer output');
    }
    if (FreshRSS_SimplePieCustom::sanitizeHTML('<p>Hello <b>world</b></p>') !== '<p>Hello <b>world</b></p>') throw new Exception('Legitimate markup lost');
    $image = '<img src="data:image/png;base64,iVBORw0KGgo=">';
    if (!str_contains(FreshRSS_SimplePieCustom::sanitizeHTML($image), 'src="data:image/png;')) throw new Exception('Local image lost');
    $subnets = (new ReflectionClass(FreshRSS_http_Util::class))->getConstant('PRIVATE_SUBNETS');
    if (!in_array('64:ff9b:1::/48', $subnets, true)) throw new Exception('NAT64 local-use guard missing');
}
echo "FRESHRSS_NATIVE_PASSED\n";
