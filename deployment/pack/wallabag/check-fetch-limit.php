<?php
// Stop on Content-Length / progress; do NOT intentionally download the model.
require '/app/vendor/autoload.php';
if (class_exists(Symfony\Component\Dotenv\Dotenv::class)) (new Symfony\Component\Dotenv\Dotenv())->bootEnv('/app/.env');
$kernel = new AppKernel('prod', false);
$kernel->boot();
$client = $kernel->getContainer()->get(Wallabag\HttpClient\WallabagClient::class);
try {
    $response = $client->request('GET', 'https://transcribe.utilibre.org/models/Xenova/whisper-small/onnx/encoder_model_quantized.onnx');
    $response->getContent();
    throw new RuntimeException('Oversized fetch was not stopped');
} catch (Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface $error) {
    if (!str_contains($error->getMessage(), '2 MiB download limit')) throw $error;
    $bytes = $response->getInfo('size_download');
    if ($bytes > 2097152 + 65536) throw new RuntimeException('Downloaded beyond the bounded test');
    echo json_encode(['oversizeRejected'=>true,'downloadedBytes'=>$bytes])."\n";
}
