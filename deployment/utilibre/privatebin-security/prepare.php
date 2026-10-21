<?php
// Preserve the reviewed Markdown sanitizer restriction on release 2.1.0.
// No encryption, storage, expiry or upload changes. Keep translation attributes.
$path = '/var/www/js/privatebin.js';
$js = file_get_contents($path);
if (hash('sha256', $js) !== 'b7af82651a022c1a14f8c8b4dcbe9369edd669e39a8550664c5c32d830032bf3') {
    throw new RuntimeException('PrivateBin source changed; review the backport');
}
$old = "ALLOWED_ATTR: ['href'],\n        USE_PROFILES:";
// This release's DOMPurify HTML profile overrides ALLOWED_ATTR. Explicitly
// forbid the three presentation/identity attributes too; native-browser tests
// must prove the restriction, not just the presence of upstream's setting.
$js = str_replace($old, "ALLOWED_ATTR: ['href'],\n        FORBID_ATTR: ['class', 'style', 'id'],\n        USE_PROFILES:", $js, $count);
if ($count !== 1) throw new RuntimeException('Unexpected sanitizer');
// Exact backport of upstream 0250510c15a052943e0f718df468ec08607dfb1d.
// Native 2.1.0 dereferences absent optional controls when discussion=false.
foreach (['remove', 'add'] as $operation) {
    $old = "            openDiscussionOption.classList.$operation('hidden');\n            password.classList.$operation('hidden');";
    $new = "            if (openDiscussionOption) {\n                openDiscussionOption.classList.$operation('hidden');\n            }\n            if (password) {\n                password.classList.$operation('hidden');\n            }";
    $js = str_replace($old, $new, $js, $count);
    if ($count !== 1) throw new RuntimeException('Unexpected optional-control state');
}
$js = str_replace('if (openDiscussionDefault || !burnAfterReadingDefault) {',
    'if (openDiscussionOption && (openDiscussionDefault || !burnAfterReadingDefault)) {', $js, $count);
if ($count !== 1) throw new RuntimeException('Unexpected discussion reset');
if (hash('sha256', $js) !== 'e2cb643bce9faef8fee1a6d4149cce0da08913c17508f5eece35bd7b7a1e4191') {
    throw new RuntimeException('Unexpected patched PrivateBin output');
}
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
