#!/usr/bin/env python3
"""Apply the reviewed patch once; never regenerate it from floating substitutions."""
import pathlib,subprocess,sys
recipe=pathlib.Path(__file__).resolve().parent
root=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/kokoro-web')
pin='2cb9d771a549870e7220783a53bdb2e99ed2f421'
assert subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()==pin
args=['git','-C',str(root),'apply','--unidiff-zero']
if subprocess.run(args+['--check',str(recipe/'local-source.patch')],capture_output=True).returncode==0:
 subprocess.run(args+[str(recipe/'local-source.patch')],check=True)
else:subprocess.run(args+['--reverse','--check',str(recipe/'local-source.patch')],check=True)
print('Pinned Kokoro source patch verified')
