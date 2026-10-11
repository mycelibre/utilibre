<?php declare(strict_types=1);
// Small admission guard only; native PrivateBin retains encryption and storage.
// Never read, decrypt or log submitted data. The marker is deployment metadata,
// not user content. Compose also refuses to create a missing bind source.
function utilibreHasUploadHeadroom(float|false $available): bool
{
    return $available !== false && $available >= 1024 ** 3;
}
function utilibreTemporaryStorageReady(string $directory): bool
{
    return @file_get_contents($directory . '/.utilibre-temporary-volume', false, null, 0, 64)
        === "utilibre-privatebin-temporary-v1\n";
}
if (PHP_SAPI !== 'cli') {
    $ready = utilibreTemporaryStorageReady('/srv/data');
    $lowSpace = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
        && !utilibreHasUploadHeadroom(@disk_free_space('/srv/data'));
    // A missing volume also fails the health check. On a mounted low-space
    // volume, reads and native deletion remain available.
    if (!$ready || $lowSpace) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        header('Retry-After: 300');
        echo json_encode(['status' => 1, 'message' => $ready
            ? 'Uploads are temporarily paused because storage is low. Try later. / Las cargas están pausadas por falta de espacio. Probá más tarde.'
            : 'Temporary storage is unavailable. Try later. / El almacenamiento temporal no está disponible. Probá más tarde.']);
        exit;
    }
}
