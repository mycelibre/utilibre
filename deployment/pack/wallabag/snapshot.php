<?php
// Consistent native SQLite snapshot streamed directly to encryption.
// No plaintext backup remains in the service directory on normal completion.
if (getenv('DATABASE_URL') !== 'sqlite:////app/data/db/wallabag.sqlite') throw new RuntimeException('Unexpected database');
$lock = fopen('/app/data/db/.backup.lock', 'c');
if (!flock($lock, LOCK_EX | LOCK_NB)) throw new RuntimeException('Another Wallabag snapshot is running');
$target = tempnam('/app/data/db', '.snapshot-');
unlink($target);
try {
    $db = new PDO('sqlite:/app/data/db/wallabag.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA busy_timeout=5000');
    $db->exec('VACUUM INTO '.$db->quote($target));
    if (readfile($target) === false) throw new RuntimeException('Snapshot stream failed');
} finally {
    if (file_exists($target)) unlink($target);
    flock($lock, LOCK_UN); fclose($lock);
}
