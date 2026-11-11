<?php
declare(strict_types=1);
if (getenv('UTILIBRE_SECURITY_DISPOSABLE') !== 'yes') exit(1);
require '/var/www/FreshRSS/cli/_cli.php';
$user = 'utilibrerestore123456789abc';
cliInitUser($user);
$dao = FreshRSS_Factory::createFeedDao();
$id = $dao->addFeed([
    'url' => 'http://127.0.0.1:8000/feed.xml', 'kind' => 0,
    'category' => 1, 'name' => 'Fictional permission test feed',
    'website' => 'https://example.invalid/', 'description' => 'Synthetic only',
    'lastUpdate' => 0, 'error' => 0,
]);
if (!$id) throw new Exception('Native feed creation failed');
$entry = new FreshRSS_Entry($id, 'urn:fixture:permissions', 'Fictional café',
    'Fictional Author', '<p>Fictional saved article.</p>',
    'https://example.invalid/article', time(), false, true);
$entry->_id((string)(int)(microtime(true) * 1000000));
if (!FreshRSS_Factory::createEntryDao()->addEntry($entry->toArray(), false)) {
    throw new Exception('Native article save failed');
}
[$filename, $output] = (new FreshRSS_Export_Service($user))->generateOpml();
if (!is_file($output)) throw new Exception('Native export missing');
$xml = file_get_contents($output);
unlink($output);
$doc = new DOMDocument();
if (!$doc->loadXML($xml, LIBXML_NONET)) throw new Exception('Invalid native OPML');
if ((new DOMXPath($doc))->query('//outline[@xmlUrl="http://127.0.0.1:8000/feed.xml"]')->length !== 1) {
    throw new Exception('Export lost the subscription');
}
echo json_encode(['feedId' => $id, 'saveAndExportPassed' => true]), "\n";
