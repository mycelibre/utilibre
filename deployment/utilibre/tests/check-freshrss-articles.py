#!/usr/bin/env python3
"""Exact-image native article export/import, entirely fictional and network-none."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time

REPO = Path(__file__).resolve().parents[3]
IMAGE = 'sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d'
PGIMAGE = 'sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73'
os.umask(0o077)
REPORT = Path(tempfile.mkdtemp(prefix='freshrss-articles-', dir='/opt/utilibre/reports'))
TOKEN = secrets.token_hex(5)
NAME = 'utilibre-freshrss-articles-' + TOKEN
PG = NAME + '-db'
CREATED = []


def run(*args, input=None, timeout=90):
    result = subprocess.run(args, input=input, capture_output=True, timeout=timeout)
    if result.returncode:
        (REPORT / 'failure.txt').write_bytes(result.stderr + b'\n' + result.stdout)
        raise RuntimeError('Native fixture command failed; private evidence: ' + str(REPORT))
    return result.stdout


def docker(*args, **kwargs):
    return run('docker', *args, **kwargs)


def cli(*args):
    return docker('exec', '-u', 'www-data', NAME, 'php', '/var/www/FreshRSS/cli/' + args[0], *args[1:])


def php(code):
    return docker('exec', '-i', '-u', 'www-data', NAME, 'php', input=('<?php\n' + code).encode())


def snapshot(user):
    code = """require '/var/www/FreshRSS/cli/_cli.php';
cliInitUser(USER);
$s=new FreshRSS_Export_Service(USER);
foreach($s->generateAllFeedEntries(-1) as $content) echo $content;
""".replace('USER', json.dumps(user))
    return json.loads(php(code))


def normalize(item):
    result = {k: item.get(k) for k in ['guid', 'title', 'author', 'summary', 'content', 'published', 'alternate']}
    result['categories'] = sorted(item.get('categories', []))
    return result


def main():
    try:
        docker('run', '-d', '--name', PG, '--network', 'none', '--memory', '256m', '--cpus', '0.5',
               '--pids-limit', '64', '--log-driver', 'none', '--tmpfs', '/var/lib/postgresql/data:rw,size=128m',
               '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', PGIMAGE)
        CREATED.append(PG)
        for _ in range(40):
            try:
                docker('exec', PG, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres')
                break
            except RuntimeError:
                time.sleep(.25)
        else:
            raise RuntimeError('Fictional database did not start')
        docker('exec', PG, 'createdb', '-h', '127.0.0.1', '-U', 'postgres', 'freshrss')
        docker('run', '-d', '--name', NAME, '--network', 'container:' + PG, '--memory', '384m', '--cpus', '0.5',
               '--pids-limit', '64', '--log-driver', 'none', '--security-opt', 'no-new-privileges:true',
               '--entrypoint', 'sh', '--tmpfs', '/var/www/FreshRSS/data:rw,size=64m,uid=33,gid=33',
               IMAGE, '-c', 'php /var/www/FreshRSS/cli/prepare.php; chown -R www-data:www-data /var/www/FreshRSS/data; sleep 600')
        CREATED.append(NAME)
        for _ in range(20):
            if docker('exec', NAME, 'sh', '-c', 'test -d /var/www/FreshRSS/data/users && echo ready || true').strip():
                break
            time.sleep(.1)
        cli('do-install.php', '--default-user', 'fixturea', '--base-url', 'http://127.0.0.1:8080',
            '--language', 'en', '--auth-type', 'form', '--environment', 'silent', '--disable-update',
            '--db-type', 'pgsql', '--db-host', '127.0.0.1', '--db-user', 'postgres', '--db-base', 'freshrss', '--db-prefix', 'fixture_')
        fixture = {'password': secrets.token_urlsafe(24), 'users': ['fixturea', 'fixtureb', 'fixturec']}
        for user in fixture['users']:
            cli('create-user.php', '--user', user, '--password', fixture['password'], '--language', 'en', '--no-default-feeds')
        code = """require '/var/www/FreshRSS/cli/_cli.php';
cliInitUser('fixturea');
$fd=FreshRSS_Factory::createFeedDao(); $ed=FreshRSS_Factory::createEntryDao(); $td=FreshRSS_Factory::createTagDao();
$feed=$fd->addFeed(['url'=>'https://fixture.example.invalid/articles.xml','kind'=>0,'category'=>1,'name'=>'Fictional archive feed','website'=>'https://fixture.example.invalid/','description'=>'No remote feed is requested','lastUpdate'=>time(),'error'=>0]);
if (!$feed) throw new Exception('fixture feed');
$tag1=$td->addTag(['name'=>'Archive fixture']); $tag2=$td->addTag(['name'=>'Lectura útil']);
for ($i=1;$i<=53;$i++) {
 $read=!in_array($i,[2,3,52],true); $star=in_array($i,[1,3,51],true);
 $entry=new FreshRSS_Entry($feed,'urn:utilibre:article-fixture:'.$i,'Fictional article '.str_pad((string)$i,2,'0',STR_PAD_LEFT),'Fictional Author', '<p>Fictional body '.$i.' with <strong>formatting</strong>.</p>', 'https://fixture.example.invalid/article/'.$i,1791500000+$i,$read,$star,['source-topic']);
 $entry->_id((string)(1791500000000000+$i));
 if (!$ed->addEntry($entry->toArray(),false)) throw new Exception('fixture entry');
 if (in_array($i,[1,2,52],true)) $td->tagEntry($tag1,$entry->id());
 if ($i===1) $td->tagEntry($tag2,$entry->id());
}
echo $feed;
"""
        fixture['feedId'] = int(php(code))
        (REPORT / 'fixture.json').write_text(json.dumps(fixture))
        source = snapshot('fixturea')
        assert len(source['items']) == 53
        (REPORT / 'source-all-articles.json').write_text(json.dumps(source, ensure_ascii=False, indent=2))
        docker('exec', '-d', '-u', 'www-data', NAME, 'php', '-S', '127.0.0.1:8080', '-t', '/var/www/FreshRSS/p')
        pid = docker('inspect', '-f', '{{.State.Pid}}', NAME).decode().strip()
        run('nsenter', '-t', pid, '-n', 'node', str(REPO / 'deployment/utilibre/tests/check-freshrss-articles-browser.mjs'), str(REPORT), timeout=120)
        source_by_guid = {x['guid']: normalize(x) for x in source['items']}
        observations = {}
        for user, expected in [('fixtureb', 50), ('fixturec', 52)]:
            imported = snapshot(user)
            assert len(imported['items']) == expected, (user, len(imported['items']))
            for item in imported['items']:
                assert normalize(item) == source_by_guid[item['guid']], (user, item['guid'])
            observations[user] = {'count': len(imported['items']), 'content_read_favourite_labels_equal': True,
                                  'guids': [x['guid'] for x in imported['items']]}
            (REPORT / (user + '-imported.json')).write_text(json.dumps(imported, ensure_ascii=False, indent=2))
        assert 'urn:utilibre:article-fixture:53' not in observations['fixturec']['guids']
        # Repeated native import must not duplicate articles or their labels.
        docker('cp', str(REPORT / 'selected-feed.json'), NAME + ':/tmp/feed-fixture.json')
        docker('exec', NAME, 'chown', 'www-data:www-data', '/tmp/feed-fixture.json')
        cli('import-for-user.php', '--user', 'fixtureb', '--filename', '/tmp/feed-fixture.json')
        again = snapshot('fixtureb')
        assert len(again['items']) == 50
        assert all(normalize(x) == source_by_guid[x['guid']] for x in again['items'])
        observations['reimport'] = {'count': 50, 'no_duplicate_or_changed_state': True}
        # The supported operator CLI can request a larger positive per-feed bound.
        archive = cli('export-zip-for-user.php', '--user', 'fixturea', '--max-feed-entries=100')
        (REPORT / 'native-cli-all.zip').write_bytes(archive)
        import io, zipfile
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            feeds = [json.loads(z.read(n)) for n in z.namelist() if n.startswith('feed_')]
            assert len(feeds) == 1 and len(feeds[0]['items']) == 53
        observations['operator_cli_all'] = {'feed_count': 53, 'option': '--max-feed-entries=100', 'not_a_web_control': True, 'unlimited_export_claimed': False}
        for user in fixture['users'][1:]:
            cli('delete-user.php', '--user', user)
        (REPORT / 'result.json').write_text(json.dumps({'passed': True, 'version': '1.29.1', 'backend': 'PostgreSQL',
            'image': IMAGE, 'database_image': PGIMAGE, 'source_count': 53, 'observations': observations,
            'no_production_data_or_real_feed': True, 'native_imported_users_deleted': True,
            'source_default_account_disposed_with_fixture': True}, indent=2) + '\n')
        (REPORT / 'failure.txt').unlink(missing_ok=True)
        print('PASS:', REPORT)
    finally:
        for name in reversed(CREATED):
            subprocess.run(['docker', 'rm', '-f', '-v', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        removed = all(subprocess.run(['docker', 'inspect', name], stdout=subprocess.DEVNULL,
                                     stderr=subprocess.DEVNULL).returncode != 0 for name in CREATED)
        (REPORT / 'cleanup.json').write_text(json.dumps({'cleanup_verified': removed, 'created_containers_removed': CREATED,
            'network': 'none; app shares fixture database namespace', 'host_ports': [],
            'production_data_mounted': False, 'fixture_state_tmpfs': True}, indent=2) + '\n')
        assert removed, 'Disposable fixture containers must be removed'


if __name__ == '__main__':
    main()
