#!/usr/bin/env python3
"""Read-only artifact inventory; optional unattended-upgrades protection refresh.

No package installation, container lifecycle, release approval or user data.
Unknown/local images remain review-only; this is not a scanner or a clearance.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / 'deployment/maintenance/protected-host-packages.json'
BLACKLIST = Path('/etc/apt/apt.conf.d/99-utilibre-protected-packages')
PACKAGE = re.compile(r'^[a-z0-9][a-z0-9+.-]*(?::[a-z0-9-]+)?$')


def command(args):
    value = subprocess.run(args, capture_output=True, text=True, timeout=60, check=False)
    if value.returncode:
        raise RuntimeError(f'{Path(args[0]).name} inventory failed; private output withheld')
    return value.stdout


def protected_packages(installed, policy):
    if policy.get('schemaVersion') != 1 or not isinstance(policy.get('packages'), dict):
        raise ValueError('Unsupported host protection policy')
    for name, recipe in policy['packages'].items():
        if not PACKAGE.fullmatch(name) or not isinstance(recipe, str) or not recipe.endswith('.mjs'):
            raise ValueError('Invalid host protection entry')
    result = []
    for line in installed.splitlines():
        fields = line.split('\t')
        if len(fields) != 3 or not PACKAGE.fullmatch(fields[0]):
            raise ValueError('Invalid installed package inventory')
        name, version, status = fields
        if status != 'installed':
            continue
        base = name.split(':')[0]
        if 'utilibre' in version or base in policy['packages']:
            result.append({'package': name, 'version': version,
                           'reason': 'local-version' if 'utilibre' in version else 'reviewed-native-package',
                           'recipe': policy['packages'].get(base)})
    if not result:
        raise ValueError('No protected packages discovered; refusing to erase protection')
    return sorted(result, key=lambda row: row['package'])


def installed_protection():
    policy = json.loads(POLICY.read_text())
    for recipe in policy['packages'].values():
        path = ROOT / 'deployment/maintenance' / recipe
        if not path.is_file() or ROOT not in path.resolve().parents:
            raise ValueError('Protected package recipe is unavailable')
    inventory = command(['dpkg-query', '-W', '-f=${binary:Package}\t${Version}\t${db:Status-Status}\n'])
    return protected_packages(inventory, policy)


def blacklist_text(rows):
    # Unattended Upgrades matches Python regexes. Protect all architectures.
    names = sorted({row['package'].split(':')[0] for row in rows})
    # Character classes avoid APT's non-JSON treatment of backslashes.
    patterns = ['^' + ''.join(char if char.isalnum() else '[' + char + ']' for char in name)
                + r'(:[a-z0-9-]+)?$' for name in names]
    return ('// Generated before apt-daily-upgrade; reviewed repairs require manual release.\n'
            'Unattended-Upgrade::Package-Blacklist {\n'
            + ''.join('  ' + json.dumps(pattern) + ';\n' for pattern in patterns) + '};\n')


def write_blacklist(rows):
    if os.geteuid() != 0:
        raise RuntimeError('Root is required to refresh unattended-upgrades protection')
    if BLACKLIST.is_symlink():
        raise RuntimeError('Protection configuration must not be a symlink')
    fd, temporary = tempfile.mkstemp(prefix='.utilibre-protection-', dir=BLACKLIST.parent)
    try:
        os.fchmod(fd, 0o644)
        with os.fdopen(fd, 'w') as output:
            output.write(blacklist_text(rows))
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, BLACKLIST)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def runtime_inventory():
    ids = command(['docker', 'ps', '-q']).split()
    if not ids:
        raise RuntimeError('No running containers discovered')
    # Exact safe fields only. Never inspect expanded environments or full config.
    template = ('{"name":{{json .Name}},"image":{{json .Image}},"reference":{{json .Config.Image}},'
                '"project":{{json (index .Config.Labels "com.docker.compose.project")}},'
                '"service":{{json (index .Config.Labels "com.docker.compose.service")}},'
                '"composeFiles":{{json (index .Config.Labels "com.docker.compose.project.config_files")}}}')
    rows = []
    for line in command(['docker', 'inspect', '--format', template, *ids]).splitlines():
        row = json.loads(line)
        project = row['project'] or ''
        if not (project == 'public-utility' or project.startswith('utilibre-')):
            continue
        row['updateMode'] = 'review-only'
        if project == 'public-utility' and row['service'] == 'searxng':
            row['updateMode'] = 'guarded-upstream-updater; live identity and patch checks required'
        rows.append(row)
    if not rows:
        raise RuntimeError('No Utilibre runtime artifacts discovered')
    return sorted(rows, key=lambda row: row['name'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write-unattended-blacklist', action='store_true',
                        help='Refresh only APT protection; does not install or update packages')
    parser.add_argument('--host-only', action='store_true')
    args = parser.parse_args()
    rows = installed_protection()
    if args.write_unattended_blacklist:
        write_blacklist(rows)
        print(json.dumps({'protectedPackages': len(rows), 'configuration': str(BLACKLIST),
                          'note': 'Manual apt/dpkg is not blocked; use reviewed releases.'}))
        return
    print(json.dumps({'date': datetime.now(timezone.utc).isoformat(), 'hostPackages': rows,
                      'containers': [] if args.host_only else runtime_inventory(),
                      'policy': 'Repository generic update helpers refuse swaps/rebuilds except guarded SearXNG. Direct administrative commands remain possible.',
                      'limitations': 'Inventory only; not evidence that patches still apply or upstream fixed them.'}, indent=2))


if __name__ == '__main__':
    main()
