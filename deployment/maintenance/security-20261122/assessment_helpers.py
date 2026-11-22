"""Small package-inventory and comparison contracts; never approve findings."""


def installed_packages(blob):
    packages = {}
    for paragraph in blob.decode().split('\n\n'):
        fields = dict(line.split(': ', 1) for line in paragraph.splitlines()
                      if line and not line[0].isspace() and ': ' in line)
        status = fields.get('Status', '').split()
        if len(status) != 3 or status[1:] != ['ok', 'installed']:
            continue
        if status[0] not in ('install', 'hold'):
            raise ValueError('Review unexpected package selection')
        name = fields['Package']
        if name in packages:
            raise ValueError('Duplicate package requires architecture-aware review')
        packages[name] = {'installed': fields['Version'], 'selection': status[0]}
    return packages


def package_version(package):
    return ((str(package['Epoch']) + ':' if package.get('Epoch') else '')
            + package['Version'] + ('-' + package['Release'] if package.get('Release') else ''))


def finding_identity(finding, selected):
    """Compare vendor successors without losing severity or advisory changes."""
    target = finding['type'] if finding['type'] in ('alpine', 'debian', 'ubuntu') else finding['target']
    key = (finding['id'], finding['package'], finding['severity'], target)
    return key if finding['type'] == 'debian' and finding['package'] in selected else key + (finding['installed'],)
