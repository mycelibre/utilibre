"""One-shot operator check: preserve native tmpfs bytes, never print their names."""
import hashlib, io, json, os, pathlib, resource, stat, subprocess, tarfile, time
# No regular-file board archive is created. Ordinary memory/tmpfs can still swap.
resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
LIMIT = 64 * 1024 * 1024

def run(*args, data=None):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        # Tool errors can contain a board path. Do not relay stderr or arguments.
        raise RuntimeError('Scoped operator command failed; private state suppressed')
    return result.stdout

def inspect(name):
    return json.loads(run('docker', 'inspect', name))[0]

def directory_fd(name):
    info = inspect(name)
    assert info['State']['Running'] and '/opt/app/server-data' in info['HostConfig']['Tmpfs']
    return os.open(f"/proc/{info['State']['Pid']}/root/opt/app/server-data", os.O_RDONLY | os.O_DIRECTORY)

def aggregate(fd):
    base = pathlib.Path(f'/proc/self/fd/{fd}')
    digest = hashlib.sha256(); count = total = 0
    for path in sorted(base.rglob('*')):
        meta = path.lstat()
        assert not stat.S_ISLNK(meta.st_mode)
        if stat.S_ISDIR(meta.st_mode): continue
        assert stat.S_ISREG(meta.st_mode)
        relative = path.relative_to(base).as_posix().encode()
        digest.update(len(relative).to_bytes(8, 'big')); digest.update(relative)
        digest.update(f'{stat.S_IMODE(meta.st_mode)}:{meta.st_uid}:{meta.st_gid}:{meta.st_size}:'.encode())
        with path.open('rb') as stream:
            for chunk in iter(lambda: stream.read(65536), b''): digest.update(chunk)
        count += 1; total += meta.st_size
        assert total <= LIMIT
    return {'files': count, 'bytes': total, 'sha256': digest.hexdigest()}

def archive(fd):
    before = aggregate(fd); buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w', format=tarfile.PAX_FORMAT) as tar:
        tar.add(f'/proc/self/fd/{fd}/.', arcname='.', recursive=True)
    assert aggregate(fd) == before
    assert buffer.tell() <= LIMIT + 1024 * 1024
    return buffer.getvalue(), before

def restore(name, data, expected):
    fd = directory_fd(name)
    try: assert aggregate(fd)['files'] == 0
    finally: os.close(fd)
    # Native history belongs to the same uid/gid; no alternate path or storage.
    run('docker','exec','-i',name,'tar','-xf','-','-C','/opt/app/server-data', data=data)
    fd = directory_fd(name)
    try: assert aggregate(fd) == expected
    finally: os.close(fd)

def connections(name):
    code = 'const fs=require("fs"); console.log(["/proc/net/tcp","/proc/net/tcp6"].flatMap(p=>fs.readFileSync(p,"utf8").trim().split("\\n").slice(1)).filter(s=>{const x=s.trim().split(/\\s+/);return x[1].endsWith(":1F90")&&x[3]==="01"}).length)'
    return int(run('docker','exec',name,'node','-e',code))

def ready(name):
    for _ in range(40):
        try:
            run('docker','exec',name,'node','-e',"fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))")
            return
        except RuntimeError: time.sleep(.25)
    raise RuntimeError('Startup did not become ready while ingress was closed')
