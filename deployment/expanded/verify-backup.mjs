// Restore into an isolated, disposable container; no production volumes or network.
import { execFileSync } from 'node:child_process';
import { openSync, closeSync, realpathSync, writeFileSync } from 'node:fs';
const target = realpathSync(process.argv[2] || '');
const resumeOnly = process.argv.includes('--resume-only');
if (!/^\/opt\/utilibre\/expanded-backups\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(target)) throw Error('Pass an exact expanded-backups snapshot directory');
execFileSync('sha256sum', ['--check', 'SHA256SUMS'], { cwd: target, stdio: 'inherit' });
const name = `utilibre-restore-check-${process.pid}`;
const image = 'postgres@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
let created = false;
try {
  docker('run', '-d', '--name', name, '--network', 'none', '--memory', '512m', '--cpus', '1', '--pids-limit', '128', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/var/lib/postgresql/data:rw,nosuid,nodev,size=256m', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', image);
  created = true;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try { docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'); ready = true; break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw Error('Restore container did not become ready');
  for (const db of resumeOnly ? ['resume'] : ['resume', 'penpot']) {
    docker('exec', name, 'createdb', '-U', 'postgres', db);
    const fd = openSync(`${target}/${db}.dump`, 'r');
    try { execFileSync('docker', ['exec', '-i', name, 'pg_restore', '-U', 'postgres', '-d', db, '--no-owner', '--no-acl', '--exit-on-error'], { stdio: [fd, 'pipe', 'pipe'] }); }
    finally { closeSync(fd); }
    const count = docker('exec', name, 'psql', '-U', 'postgres', '-d', db, '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'").trim();
    if (Number(count) < 1) throw Error(`No tables restored for ${db}`);
    console.log(`${db}: restored ${count} tables`);
  }
  // Extract only a known SQLite database into a private temporary directory.
  // TemporaryDirectory cleans up only this newly created rehearsal directory.
  if (!resumeOnly) execFileSync('python3', ['-c', `import tarfile,tempfile,sqlite3,os,sys
with tempfile.TemporaryDirectory(prefix='utilibre-sqlite-restore-') as d:
 with tarfile.open(sys.argv[1]) as t:
  for name in ['wakapi/wakapi.db','actual/server-files/account.sqlite']:
   if name not in t.getnames():
    if name.startswith('wakapi/'): raise RuntimeError('Missing Wakapi database')
    continue
   p=os.path.join(d,name.replace('/','-'))
   with open(p,'wb') as f: f.write(t.extractfile(name).read())
   c=sqlite3.connect(p)
   assert c.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
   if name.startswith('wakapi/'):
    assert c.execute("SELECT is_admin FROM users WHERE id='utilibre-admin'").fetchone()==(1,)
   c.close()
   print(name+': restored SQLite integrity check passed')`, `${target}/files.tar.gz`], { stdio: 'inherit' });
  writeFileSync(`${target}/RESTORE-VERIFIED.txt`, `${new Date().toISOString()}\n${resumeOnly ? 'Resume-only PostgreSQL restore passed.' : 'PostgreSQL restore and SQLite integrity checks passed.'} File archive extraction is not a full end-user workflow test.\n`, { mode: 0o600 });
  console.log('Restore check passed. Backup is still on this VM, not off-site.');
} finally {
  if (created) docker('rm', '-f', name);
}
