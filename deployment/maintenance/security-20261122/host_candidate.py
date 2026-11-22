"""Strict inventory-only projection; never changes the real dpkg database."""
from assessment_helpers import installed_packages


def project_status(blob, versions, controls):
    baseline = installed_packages(blob)
    assert set(versions) == set(controls)
    for name, (old, new) in versions.items():
        assert baseline[name]['installed'] == old and old != new
        assert controls[name]['Package'] == name and controls[name]['Version'] == new
        assert controls[name]['Architecture'] == 'amd64'
    paragraphs = []
    changed = set()
    for paragraph in blob.decode().split('\n\n'):
        lines = paragraph.splitlines()
        names = [line[9:] for line in lines if line.startswith('Package: ')]
        if names and names[0] in versions:
            name = names[0]
            assert len(names) == 1 and name not in changed
            assert sum(line.startswith('Version: ') for line in lines) == 1
            assert sum(line.startswith('Source: ') for line in lines) <= 1
            lines = [('Version: ' + versions[name][1]) if line.startswith('Version: ') else line
                     for line in lines if not line.startswith('Source: ')]
            if 'Source' in controls[name]:
                lines.append('Source: ' + controls[name]['Source'])
            paragraph = '\n'.join(lines)
            changed.add(name)
        paragraphs.append(paragraph)
    assert changed == set(versions)
    result = '\n\n'.join(paragraphs).encode()
    expected = {name: dict(value) for name, value in baseline.items()}
    for name, (_, new) in versions.items():
        expected[name]['installed'] = new
    assert installed_packages(result) == expected
    return result
