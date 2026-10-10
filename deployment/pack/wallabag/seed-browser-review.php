<?php
// Synthetic isolated rehearsal only. Refuse any other database/environment.
if (getenv('DATABASE_URL') !== 'sqlite:////app/data/db/review-test.sqlite' || getenv('WALLABAG_BASE_URL') !== 'http://127.0.0.1:33177') {
    throw new RuntimeException('Not the isolated review database');
}
require '/app/vendor/autoload.php';
(new Symfony\Component\Dotenv\Dotenv())->bootEnv('/app/.env');
$kernel = new AppKernel('prod', false);
$kernel->boot();
$em = $kernel->getContainer()->get('doctrine')->getManager();
$user = $em->getRepository(Wallabag\Entity\User::class)->findOneByUsername('admin');
$user->setGoogleAuthenticatorSecret('JBSWY3DPEHPK3PXP'); // Public test fixture.
$user->setGoogleAuthenticator(true);
$user->setBackupCodes([]);
$entry = $em->getRepository(Wallabag\Entity\Entry::class)->findOneBy(['title' => 'Fictional Utilibre repair check']);
if (!$entry) {
    $entry = new Wallabag\Entity\Entry($user);
    $entry->setTitle('Fictional Utilibre repair check');
    $entry->setUrl('https://fictional.example.invalid/article');
    $entry->setContent('<p>Fictional local article. Tres saludos: hola, hola, hola.</p><img src="https://external.example.invalid/tracking.png" alt="Synthetic blocked image"><iframe src="https://external.example.invalid/frame"></iframe>');
    $entry->setLanguage('es');
    $entry->setMimetype('text/html');
    $em->persist($entry);
}
foreach (['download_images_enabled', 'share_public', 'matomo_enabled', 'store_article_headers'] as $name) {
    $setting = $em->getRepository(Wallabag\Entity\InternalSetting::class)->findOneByName($name);
    if ($setting) $setting->setValue('0');
}
$em->flush();
echo json_encode(['entryId' => $entry->getId(), 'syntheticOnly' => true])."\n";
