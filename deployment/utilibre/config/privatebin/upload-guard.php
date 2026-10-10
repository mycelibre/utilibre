<?php declare(strict_types=1);
// Small admission guard only; native PrivateBin retains encryption and storage.
// Never read, decrypt or log submitted data. Keep reads/deletions available.
function utilibreHasUploadHeadroom(float|false $available): bool
{
    return $available !== false && $available >= 5 * 1024 ** 3;
}
if (PHP_SAPI !== 'cli' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
    && !utilibreHasUploadHeadroom(@disk_free_space('/srv/data'))) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Retry-After: 300');
    echo json_encode(['status' => 1, 'message' => 'Uploads are temporarily paused because storage is low. Try later. / Las cargas están pausadas por falta de espacio. Probá más tarde.']);
    exit;
}
