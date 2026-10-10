<?php
// Native installer, using an in-memory answer stream instead of CLI secrets.
// Refuse any existing schema; this is never an upgrade/reset command.
require '/app/vendor/autoload.php';
require '/app/app/AppKernel.php';
$owner = json_decode(stream_get_contents(STDIN), true, 8, JSON_THROW_ON_ERROR);
if (getenv('APP_ENV') !== 'prod' || getenv('DATABASE_URL') !== 'sqlite:////app/data/db/wallabag.sqlite'
    || $owner['email'] !== 'admin@utilibre.org' || $owner['username'] !== 'admin'
    || !preg_match('/^[A-Za-z0-9_-]{40}$/D', $owner['password'])) throw new RuntimeException('Unexpected bootstrap input');
$db = new PDO('sqlite:/app/data/db/wallabag.sqlite');
if ($db->query("SELECT count(*) FROM sqlite_master WHERE type='table'")->fetchColumn() > 0) throw new RuntimeException('Existing schema preserved; bootstrap refused');
$db = null;
$kernel = new AppKernel('prod', false);
$application = new Symfony\Bundle\FrameworkBundle\Console\Application($kernel);
$application->setAutoExit(false);
$input = new Symfony\Component\Console\Input\ArrayInput(['command'=>'wallabag:install','--env'=>'prod','--no-debug'=>true]);
$stream = fopen('php://memory', 'r+');
fwrite($stream, "n\ny\nadmin\n".$owner['password']."\nadmin@utilibre.org\n");
rewind($stream); $input->setStream($stream);
$output = new Symfony\Component\Console\Output\BufferedOutput();
$status = $application->run($input, $output);
if ($status !== 0) throw new RuntimeException('Native installer failed; sensitive output suppressed');
$db = new PDO('sqlite:/app/data/db/wallabag.sqlite');
if ((int)$db->query('SELECT count(*) FROM wallabag_user')->fetchColumn() !== 1
    || $db->query('SELECT username FROM wallabag_user')->fetchColumn() !== 'admin') throw new RuntimeException('Unexpected account state');
echo "Native production schema and owner account created; registration closed.\n";
