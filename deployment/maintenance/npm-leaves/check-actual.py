#!/usr/bin/env python3
"""Actual's native UI against a disposable isolated server; no real budgets."""
import argparse
from pathlib import Path
import json
import os
import socket
import subprocess
import tempfile
import time
ROOT=Path(__file__).resolve().parents[3]
parser=argparse.ArgumentParser(); parser.add_argument('--image',default='utilibre-actual:leaves-security-20261011'); args=parser.parse_args()
assert args.image in ['utilibre-actual:proxyaddr-security-20261011','utilibre-actual:leaves-security-20261011','utilibre-actual:privacy-rollback-20261011','utilibre-cache-expanded-actual:4.3.0-20261012']
report=Path(tempfile.mkdtemp(prefix='actual-leaves-native-',dir='/opt/utilibre/reports'))
cid=None; forwarder=None
try:
 cid=subprocess.check_output(['docker','run','-d','--rm','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','1g','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,size=128m,mode=1777','--tmpfs','/data:rw,nosuid,size=128m,uid=1000,gid=1000',args.image],text=True).strip()
 pid=json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]['State']['Pid']
 with socket.socket() as s: s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
 forwarder=subprocess.Popen(['socat',f'TCP4-LISTEN:{port},bind=127.0.0.1,reuseaddr,fork',rf'EXEC:nsenter -t {pid} -n socat STDIO TCP4\:127.0.0.1\:5006'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 base=f'http://127.0.0.1:{port}'
 for _ in range(60):
  if subprocess.run(['curl','-fsS','--max-time','1',base],capture_output=True).returncode==0: break
  time.sleep(.5)
 else: raise RuntimeError('Native server not ready')
 env={**os.environ,'ACTUAL_TEST_URL':base,'ACTUAL_TEST_REPORT':str(report),'ACTUAL_TEST_IMAGE':args.image}
 subprocess.run(['node',str(ROOT/'deployment/maintenance/npm-leaves/check-actual.mjs')],env=env,check=True)
 print(json.dumps({'report':str(report),'image':args.image,'productionChanged':False}))
finally:
 if forwarder: forwarder.terminate(); forwarder.wait(timeout=10)
 if cid: subprocess.run(['docker','stop',cid],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
