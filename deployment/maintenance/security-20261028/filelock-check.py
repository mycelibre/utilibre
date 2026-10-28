"""Native locking and bounded planted-sidefile regression; tmpfs fixtures only."""
import sys,json,asyncio,sqlite3,os,tempfile
from pathlib import Path
from importlib.metadata import version
from contextlib import closing
import filelock
from huggingface_hub.utils import WeakFileLock
assert version('filelock')==sys.argv[1]
fixed=sys.argv[2]=='fixed';normal=0
with tempfile.TemporaryDirectory(prefix='utilibre-filelock-') as temp:
    p=Path(temp)
    for klass in [filelock.FileLock,filelock.SoftFileLock]:
        name=p/(klass.__name__+'.lock');a=klass(name,timeout=0);b=klass(name,timeout=0)
        with a:
            assert a.is_locked
            with a: assert a.lock_counter==2
            normal+=1
            try:
                b.acquire(timeout=0);raise AssertionError('contender acquired')
            except filelock.Timeout: normal+=1
        with b: assert b.is_locked
        normal+=1
    async def async_check():
        a=filelock.AsyncFileLock(p/'async.lock',timeout=0)
        async with a: assert a.is_locked
        assert not a.is_locked
    asyncio.run(async_check());normal+=1
    with WeakFileLock(p/'hub.lock'):
        (p/'fictional.txt').write_text('fictional local cache')
    assert (p/'fictional.txt').read_text()=='fictional local cache';normal+=1
    for mode in ['read','write']:
        with closing(filelock.ReadWriteLock(p/(mode+'.db'),is_singleton=False,timeout=0)) as a:
            with (a.read_lock() if mode=='read' else a.write_lock()): pass
        normal+=1
    shared=p/'shared';shared.mkdir();shared.chmod(0o777)
    db=shared/'lock.db';wal=Path(str(db)+'-wal');wal.mkdir();(wal/'entry').write_text('fictional sentinel')
    blocked=False
    try:
        with closing(filelock.ReadWriteLock(db,is_singleton=False,timeout=0)) as lock:
            with lock.write_lock(): pass
    except sqlite3.OperationalError: blocked=True
    assert (wal/'entry').read_text()=='fictional sentinel'
    assert blocked != fixed
    assert normal==10
print(json.dumps({'passed':True,'normalChecks':normal,'version':version('filelock'),'plantedWalBlocksLock':blocked,'sidefilePreserved':True,'huggingFaceConsumer':True,'network':'none','limits':'Linux tmpfs; no Windows, distributed filesystem or hostile-ancestor claim'}))
