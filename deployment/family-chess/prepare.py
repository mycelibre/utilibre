#!/usr/bin/env python3
"""Reproduce the pinned native app plus scoped settings and gettext resources."""
import json, pathlib, shutil, subprocess, sys, tarfile
import polib

recipe = pathlib.Path(__file__).resolve().parent
source = pathlib.Path('/opt/utilibre/src/family-chess')
output = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/opt/utilibre/build-family-chess')
pin = 'f6e50932df60c531933dab4e07c6642cfee55e2d'
assert subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip() == pin
output.mkdir(parents=True, exist_ok=True)
archive = output / 'upstream.tar'
subprocess.run(['git', '-C', str(source), 'archive', pin, '-o', str(archive)], check=True)
with tarfile.open(archive) as stream:
    stream.extractall(output, filter='data')
archive.unlink()
subprocess.run(['patch', '--batch', '--fuzz=0', '-p1', '-i', str(recipe / 'source.patch')], cwd=output, check=True)
po = polib.POFile()
po.metadata = {'Project-Id-Version': 'Family Chess Utilibre p1', 'Language': 'es',
               'Content-Type': 'text/plain; charset=UTF-8', 'Plural-Forms': 'nplurals=2; plural=(n != 1);'}
for original, translated in json.loads((recipe / 'spanish.json').read_text()).items():
    po.append(polib.POEntry(msgid=original, msgstr=translated))
locale = output / 'game/locale/es/LC_MESSAGES'
locale.mkdir(parents=True, exist_ok=True)
po.save(str(locale / 'django.po'))
po.save_as_mofile(str(locale / 'django.mo'))
shutil.copytree(recipe, output / 'utilibre', dirs_exist_ok=True)
print(output)
