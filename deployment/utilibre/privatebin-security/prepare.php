<?php
// Backport upstream Markdown sanitization (2b5d85e, d0e3b0c) to release 2.0.6.
// No encryption, storage, expiry or upload changes. Keep translation attributes.
$path = '/var/www/js/privatebin.js';
$js = file_get_contents($path);
if (hash('sha256', $js) !== '0034ef9adf9e2690926cb7e8b07f06b83db4ae43416916d68ecffda3d03cad40') {
    throw new RuntimeException('PrivateBin source changed; review the backport');
}
$old = "ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|magnet):)/i,\n        USE_PROFILES:";
// This release's DOMPurify HTML profile overrides ALLOWED_ATTR. Explicitly
// forbid the three presentation/identity attributes too; native-browser tests
// must prove the restriction, not just the presence of upstream's setting.
$js = str_replace($old, "ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|magnet):)/i,\n        ALLOWED_ATTR: ['href'],\n        FORBID_ATTR: ['class', 'style', 'id'],\n        USE_PROFILES:", $js, $count);
if ($count !== 1) throw new RuntimeException('Unexpected sanitizer');
// Preserve the upstream filename and translation selector. The template adds
// a release query parameter to avoid stale bytes without breaking discovery.
file_put_contents($path, $js);
$configPath = '/srv/lib/Configuration.php';
$config = file_get_contents($configPath);
$sri = 'sha512-' . base64_encode(hash('sha512', $js, true));
$config = preg_replace("/'js\/privatebin\.js'\s*=>\s*'sha512-[^']+'/",
    "'js/privatebin.js' => '$sri'", $config, 1, $count);
if ($count !== 1) throw new RuntimeException('Unexpected script integrity table');
file_put_contents($configPath, $config);
