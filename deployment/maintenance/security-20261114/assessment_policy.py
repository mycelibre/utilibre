"""Finite candidate comparison rules; these do not approve or suppress findings."""
GIT_IDS = frozenset(('CVE-2026-105437', 'CVE-2026-111760', 'CVE-2026-114466'))


def identity(row, mode='native'):
    if mode not in ('native', 'python', 'headers', 'git'):
        raise ValueError('Unsupported assessment mode')
    target = row['type'] if row['type'] in ('debian', 'alpine', 'ubuntu') else row['target']
    result = tuple(row.get(k, '') for k in ('id', 'package', 'severity', 'type')) + (target,)
    version_review = (mode == 'headers' and row['package'] == 'linux-libc-dev') or (mode == 'git' and row['package'] == 'git')
    return result if version_review else result + (row['installed'],)


def git_assessment(before, after, installed):
    """Only the separately built/tested maintenance release may await backport review."""
    if installed != '1:2.54.1+utilibre1':
        raise ValueError('Unsupported Git candidate')
    if {v['id'] for v in before} != GIT_IDS or not {v['id'] for v in after} <= GIT_IDS:
        raise ValueError('Changed Git advisory set requires review')
    return len(after)  # Retain actual raw count, including duplicate DHI metadata.
