import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const file = '/opt/utilibre/community-data/pollaris-private/admin.json';
let exists = false;
try { await readFile(file); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (exists) {
  console.log('Existing Pollaris administrator credentials preserved.');
} else {
  const credentials = { username: 'admin@utilibre.org', password: randomBytes(32).toString('base64url') };
  const php = `require '/app/vendor/autoload.php';
    (new Symfony\\Component\\Dotenv\\Dotenv())->bootEnv('/app/.env');
    $credentials = json_decode(file_get_contents('php://stdin'), true, flags: JSON_THROW_ON_ERROR);
    $application = new Symfony\\Bundle\\FrameworkBundle\\Console\\Application(new App\\Kernel('prod', false));
    $application->setAutoExit(false);
    $input = new Symfony\\Component\\Console\\Input\\ArrayInput(['command'=>'app:user:create', '--username'=>$credentials['username'], '--password'=>$credentials['password']]);
    $input->setInteractive(false);
    exit($application->run($input));`;
  execFileSync('docker', ['exec', '-i', 'utilibre-pollaris-pollaris-1', 'php', '-r', php], {
    input: JSON.stringify(credentials), stdio: ['pipe', 'pipe', 'pipe'],
  });
  await writeFile(file, JSON.stringify(credentials), { mode: 0o600, flag: 'wx' });
  console.log('Pollaris administrator created for admin@utilibre.org; credentials stored privately, not printed.');
}
