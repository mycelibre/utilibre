<?php
// Pure fictional message handling and native login rendering; no mail delivery.
require '/var/www/anonaddy/vendor/autoload.php';
$app = require '/var/www/anonaddy/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['view.compiled' => '/tmp/views', 'session.driver' => 'array',
    'cache.default' => 'array', 'logging.default' => 'null']);
mkdir('/tmp/views');
$checks = 0;
function check($ok) { global $checks; if (!$ok) throw new RuntimeException('Native Addy regression failed'); $checks++; }
check(App\Helpers\CustomEmailValidator::isValid('fictional@example.invalid'));
check(!App\Helpers\CustomEmailValidator::isValid('not-an-address'));
check(!App\Helpers\CustomEmailValidator::isValid(''));
$clean = App\Mail\ForwardBannerStripper::stripText("Hello\n<!--banner-info-->Fictional old banner<!--banner-info-->\nReply");
check(str_contains($clean, 'Hello') && str_contains($clean, 'Reply') && !str_contains($clean, 'banner-info') && !str_contains($clean, 'old banner'));
$cipher = $app->make('encrypter');
$encrypted = $cipher->encryptString('Fictional private text');
check($encrypted !== 'Fictional private text' && $cipher->decryptString($encrypted) === 'Fictional private text');
$email = (new Symfony\Component\Mime\Email())->from('sender@example.invalid')->to('recipient@example.invalid')->subject('Fictional café')->text('Fictional message');
$mime = $email->toString();
check(str_contains($mime, 'Fictional message') && str_contains($mime, 'recipient@example.invalid'));
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('http://isolated.example.invalid/login', 'GET');
$response = $kernel->handle($request);
check($response->getStatusCode() === 200);
check(str_contains($response->getContent(), 'password') && str_contains($response->getContent(), '<form'));
$kernel->terminate($request, $response);
echo json_encode(['passed'=>true, 'checks'=>$checks, 'mailSent'=>false]), "\n";
