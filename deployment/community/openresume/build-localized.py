"""Build EN/ES static OpenResume from exact inputs, retaining the reviewed runtime.
No deployment. Requires a clean disposable checkout and the two named local images.
Downloads are limited to npm ci; both application builds run without networking.
"""
from pathlib import Path
import argparse, hashlib, json, os, shutil, subprocess

REVISION = '4f8255a2c763479837f69f1dccf2a3338730cd79'
LOCK = '7c14dfed7e978f23e2d041473c7c2457b970e2a9462783468711fbf50ba54384'
BUILDER = 'node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1'
RUNTIME = 'utilibre-openresume:security-20261011-nginx1305-tiff472-libs20261021-nginx1306-cb20261028-expat210-20261103'
RUNTIME_ID = 'sha256:5eee758b3f300245f9f6b13a3c11fda380f43112d5a82fbc5930177c20a4a900'
HERE = Path(__file__).resolve().parent

def run(args, **kw):
    return subprocess.run(args, check=True, timeout=1200, **kw)

def capture(args, **kw):
    return subprocess.check_output(args, text=True, **kw).strip()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--tag', default='utilibre-openresume:cv-es-20261106')
    args = parser.parse_args()
    src = args.source.resolve()
    assert capture(['git', 'rev-parse', 'HEAD'], cwd=src) == REVISION
    assert not capture(['git', 'status', '--porcelain'], cwd=src), 'Use a clean disposable source checkout'
    assert hashlib.sha256((src/'package-lock.json').read_bytes()).hexdigest() == LOCK
    assert capture(['docker', 'image', 'inspect', RUNTIME, '--format', '{{.Id}}']) == RUNTIME_ID
    assert shutil.disk_usage(src).free > 3 * 1024**3, 'Need 3 GiB staging headroom'
    for name in ['privacy-static.patch', 'spanish-workflow.patch']:
        run(['git', 'apply', '--check', str(HERE/name)], cwd=src)
        run(['git', 'apply', str(HERE/name)], cwd=src)
    shutil.copyfile(HERE/'ResumePDFIcon.tsx', src/'src/app/components/Resume/ResumePDF/common/ResumePDFIcon.tsx')
    cache = src.parent/(src.name+'-npm-cache'); cache.mkdir(exist_ok=False)
    common = ['docker', 'run', '--rm', '--user', f'{src.stat().st_uid}:{src.stat().st_gid}', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '4g', '--cpus', '2', '--pids-limit', '256', '--read-only', '--tmpfs', '/tmp:rw,nosuid,size=256m', '-e', 'NEXT_TELEMETRY_DISABLED=1', '-e', 'NODE_OPTIONS=--max-old-space-size=3072', '-v', f'{src}:/app', '-w', '/app']
    os.chown(cache, src.stat().st_uid, src.stat().st_gid)
    run(common + ['-e', 'npm_config_cache=/cache', '-v', f'{cache}:/cache', BUILDER, 'npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'])
    for language in ['en', 'es']:
        run(common + ['--network', 'none', '-e', f'NEXT_PUBLIC_UTILIBRE_LANGUAGE={language}', BUILDER, 'npm', 'run', 'build'])
        (src/'out').rename(src/f'out-{language}')
    shutil.copytree(src/'out-en', src/'out')
    shutil.copytree(src/'out-es', src/'out/es')
    # Only the builder has been translated. Do not advertise other pages as Spanish.
    for page in (src/'out/es').glob('*'):
        if page.is_file() and page.suffix in {'.html', '.txt'} and page.stem not in {'resume-builder','404'}:
            page.unlink()
    run(['docker', 'build', '--network', 'none', '--build-arg', f'RUNTIME_IMAGE={RUNTIME}', '-f', str(HERE/'Dockerfile.localized'), '-t', args.tag, str(src)])
    receipt = {'revision': REVISION, 'lockSha256': LOCK, 'builder': BUILDER, 'runtime': RUNTIME_ID, 'image': capture(['docker', 'image', 'inspect', args.tag, '--format', '{{.Id}}']), 'patches': {n: hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['privacy-static.patch','spanish-workflow.patch']}, 'deployed': False}
    (src.parent/(src.name+'-build.json')).write_text(json.dumps(receipt, indent=2)+'\n')
