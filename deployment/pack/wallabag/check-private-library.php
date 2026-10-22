<?php
// Native application regression, not a production bootstrap or browser audit.
// The fixed adapter supplies empty tmpfs state and disables all networking.
declare(strict_types=1);
require '/app/vendor/autoload.php';
require '/app/app/AppKernel.php';

use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Wallabag\Entity\Entry;
use Wallabag\Entity\InternalSetting;
use Wallabag\Entity\User;

// The upstream BrowserKit test model uses independent file-backed test sessions,
// avoiding PHP CLI's single global session across the two simulated clients.
// Controllers, authentication, access voters and export services stay native.
class IsolatedKernel extends AppKernel {
    public function getProjectDir(): string { return '/app'; }
    public function registerContainerConfiguration(Symfony\Component\Config\Loader\LoaderInterface $loader): void {
        parent::registerContainerConfiguration($loader);
        $loader->load(function (Symfony\Component\DependencyInjection\ContainerBuilder $container): void {
            $container->loadFromExtension('framework', ['test' => true,
                'session' => ['storage_factory_id' => 'session.storage.factory.mock_file']]);
        });
    }
}

$checks = 0;
function check(bool $condition, string $message): void {
    global $checks;
    if (!$condition) throw new RuntimeException($message);
    ++$checks;
}
check(getenv('UTILIBRE_ISOLATED_REGRESSION') === '1'
    && getenv('DATABASE_URL') === 'sqlite:////app/data/db/isolated-regression.sqlite'
    && getenv('WALLABAG_BASE_URL') === 'http://isolated.example.invalid'
    && getenv('APP_ENV') === 'prod'
    && getenv('MAILER_DSN') === 'null://null', 'Not the isolated regression environment');
check(!file_exists('/app/data/db/isolated-regression.sqlite'), 'Existing database preserved');
if (!is_dir('/app/data/db')) mkdir('/app/data/db', 0700);

$kernel = new IsolatedKernel('prod', false);
$kernel->boot();
$container = $kernel->getContainer();
$em = $container->get('doctrine')->getManager();
// Native metadata creates a synthetic schema only. This does not test upgrades.
(new Doctrine\ORM\Tools\SchemaTool($em))->createSchema($em->getMetadataFactory()->getAllMetadata());
foreach ($container->getParameter('wallabag.default_internal_settings') as $item) {
    $setting = new InternalSetting();
    $setting->setName($item['name']);
    $setting->setSection($item['section']);
    $setting->setValue($item['value']);
    $em->persist($setting);
}
$em->flush();
$app = new Application($kernel);
$app->setAutoExit(false);
$password = 'Fictional-only-regression-password-47';
foreach (['fixture-a', 'fixture-b'] as $username) {
    $status = $app->run(new ArrayInput(['command' => 'fos:user:create',
        'username' => $username, 'email' => $username.'@example.invalid',
        'password' => $password, '--no-interaction' => true]), new BufferedOutput());
    check($status === 0, 'Native account creation failed');
}
$owner = $em->getRepository(User::class)->findOneBy(['username' => 'fixture-a']);
$entry = new Entry($owner);
$entry->setTitle('Fictional private reading example');
$entry->setUrl('https://fictional.example.invalid/article');
$entry->setContent('<p>Fictional article: tres saludos, hola hola hola.</p>');
$entry->setLanguage('es');
$entry->setMimetype('text/html');
$em->persist($entry);
$em->flush();
$id = $entry->getId();
check($id > 0, 'Synthetic article was not saved');
$other = new Entry($em->getRepository(User::class)->findOneBy(['username' => 'fixture-b']));
$other->setTitle('Another fictional reading example');
$other->setUrl('https://fictional.example.invalid/second');
$other->setContent('<p>Second account example: fictional flowers.</p>');
$other->setLanguage('en');
$other->setMimetype('text/html');
$em->persist($other);
$em->flush();
$em->getConnection()->close();
$kernel->shutdown();

function browser(): KernelBrowser {
    return new KernelBrowser(new IsolatedKernel('prod', false), ['HTTP_HOST' => 'isolated.example.invalid']);
}
function login(KernelBrowser $client, string $username, string $password): void {
    $page = $client->request('GET', 'http://isolated.example.invalid/login');
    check($client->getResponse()->getStatusCode() === 200, 'Login page failed');
    $form = $page->filterXPath('//form')->first()->form();
    $form['_username'] = $username;
    $form['_password'] = $password;
    $client->submit($form);
    check($client->getResponse()->isRedirect(), 'Native login did not redirect');
    $client->request('GET', 'http://isolated.example.invalid/');
    check($client->getResponse()->getStatusCode() === 200,
        'Native login/home failed for '.$username.': '.$client->getResponse()->getStatusCode()
        .' '.$client->getResponse()->headers->get('Location', ''));
}
$a = browser();
login($a, 'fixture-a', $password);
$a->request('GET', '/view/'.$id);
check($a->getResponse()->getStatusCode() === 200
    && str_contains($a->getResponse()->getContent(), 'tres saludos'), 'Owner cannot read saved content');
$a->request('GET', '/export/'.$id.'.json');
check($a->getResponse()->getStatusCode() === 200, 'Owner JSON export failed');
$export = json_decode($a->getResponse()->getContent(), true, 32, JSON_THROW_ON_ERROR);
check(is_array($export) && str_contains(json_encode($export), 'tres saludos'), 'Export lost article content');
// Re-open the native JSON output, not a fabricated application-format fixture.
file_put_contents('/tmp/fictional-export.json', json_encode($export, JSON_THROW_ON_ERROR));
check(json_decode(file_get_contents('/tmp/fictional-export.json'), true, 32, JSON_THROW_ON_ERROR) === $export,
    'Downloaded JSON did not round-trip');

$b = browser();
login($b, 'fixture-b', $password);
foreach (['/view/'.$id, '/export/'.$id.'.json'] as $path) {
    $b->request('GET', $path);
    check(in_array($b->getResponse()->getStatusCode(), [403, 404], true), 'Other account gained article access');
    check(!str_contains($b->getResponse()->getContent(), 'tres saludos'), 'Denial exposed article content');
}
$b->request('GET', '/export/all.json');
check($b->getResponse()->getStatusCode() === 200, 'Second account cannot export its own library');
check(str_contains($b->getResponse()->getContent(), 'fictional flowers'), 'Second account export lost its content');
check(!str_contains($b->getResponse()->getContent(), 'tres saludos'), 'Library export crossed account boundary');

$anonymous = browser();
foreach (['/view/'.$id, '/export/'.$id.'.json'] as $path) {
    $anonymous->request('GET', $path);
    check($anonymous->getResponse()->isRedirect()
        && str_ends_with($anonymous->getResponse()->headers->get('Location', ''), '/login'),
        'Anonymous access was not sent to sign-in');
    check(!str_contains($anonymous->getResponse()->getContent(), 'tres saludos'), 'Anonymous response leaked article');
}
echo json_encode(['passed' => true, 'checks' => $checks, 'accounts' => 2,
    'scope' => 'Native HTTP kernel/form authentication, persistence, private read and JSON export; BrowserKit test sessions; synthetic tmpfs only',
    'notTested' => ['real browser', 'reverse proxy and media policy', 'article fetching', 'schema migration', 'account recovery']])."\n";
