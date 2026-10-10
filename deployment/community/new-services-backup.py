#!/usr/bin/env python3
"""Run installed scoped native backups serially. Same-VM copies; no automatic expiry."""
from pathlib import Path
import fcntl,subprocess,sys
root=Path(__file__).resolve().parent
with open('/run/lock/utilibre-community-backup.lock','w') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 failures=[]
 # Preserve the original Rallly/Pollaris/FMD/Kuma/Mumble/onion snapshots too.
 # Their existing helper uses native online dumps and isolated restore checks.
 node='/root/.nvm/versions/node/v24.14.0/bin/node'
 if subprocess.run([node,str(root/'scheduled-backup.mjs')]).returncode:
  failures.append('original-community')
 for service in ['opengist','linkding','vikunja','bytestash']:
  script=root/(service+'-backup.py')
  if not script.exists():continue
  result=subprocess.run([sys.executable,str(script)])
  if result.returncode:failures.append(service)
 script=root.parent/'calendar/gathio-backup.py'
 if script.exists():
  if subprocess.run([sys.executable,str(script)]).returncode:failures.append('gathio')
 script=root.parent/'razzia/backup.py'
 if script.exists():
  if subprocess.run([sys.executable,str(script)]).returncode:failures.append('razzia')
 if failures:raise SystemExit('Backup failed: '+', '.join(failures))
