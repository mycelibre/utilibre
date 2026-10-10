<?php
// Only explicitly named synthetic accounts. Never reset a database or admin.
require '/app/vendor/autoload.php';
$data = json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
if (getenv('APP_ENV') !== 'prod' || !in_array($data['action'], ['seed','cleanup'], true)) throw new RuntimeException('Unexpected environment/action');
foreach (['a','b'] as $suffix) {
    if (!preg_match('/^qa-wallabag-[0-9]{10}-'.$suffix.'$/D', $data[$suffix])) throw new RuntimeException('Not a synthetic username');
}
$kernel = new AppKernel('prod', false); $kernel->boot();
$app = new Symfony\Bundle\FrameworkBundle\Console\Application($kernel); $app->setAutoExit(false);
$em = $kernel->getContainer()->get('doctrine')->getManager();
foreach (['a','b'] as $suffix) {
    $username = $data[$suffix];
    $user = $em->getRepository(Wallabag\Entity\User::class)->findOneBy(['username'=>$username]);
    if ($data['action'] === 'cleanup') {
        if (!$user || $user->getEmail() !== $username.'@example.invalid') throw new RuntimeException('Synthetic ownership check failed');
        $em->remove($user); continue;
    }
    if ($user) throw new RuntimeException('Existing account preserved');
    $input = new Symfony\Component\Console\Input\ArrayInput(['command'=>'fos:user:create','username'=>$username,'email'=>$username.'@example.invalid','password'=>$data['password'],'--env'=>'prod','--no-interaction'=>true]);
    $output = new Symfony\Component\Console\Output\BufferedOutput();
    if ($app->run($input,$output) !== 0) throw new RuntimeException('Native synthetic account creation failed');
}
if ($data['action'] === 'cleanup') { $em->flush(); echo "Synthetic accounts and their entries deleted.\n"; exit; }
$user = $em->getRepository(Wallabag\Entity\User::class)->findOneByUsername($data['a']);
$user->setGoogleAuthenticatorSecret('JBSWY3DPEHPK3PXP');
$user->setGoogleAuthenticator(true); $user->setBackupCodes([]);
$entry = new Wallabag\Entity\Entry($user);
$entry->setTitle('Fictional Utilibre production check');
$entry->setUrl('https://fictional.example.invalid/article');
$entry->setContent('<p>Fictional local article. Tres saludos: hola, hola, hola.</p><img src="https://external.example.invalid/tracking.png" alt="Synthetic blocked image"><iframe src="https://external.example.invalid/frame"></iframe>');
$entry->setLanguage('es'); $entry->setMimetype('text/html'); $em->persist($entry); $em->flush();
foreach (['download_images_enabled','share_public','matomo_enabled','store_article_headers'] as $name) {
    $setting=$em->getRepository(Wallabag\Entity\InternalSetting::class)->findOneByName($name);
    if ($setting && $setting->getValue() !== '0') throw new RuntimeException('Privacy setting not disabled: '.$name);
}
echo json_encode(['entryId'=>$entry->getId(),'syntheticOnly'=>true])."\n";
