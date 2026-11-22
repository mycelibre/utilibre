"""Validate native inventory without discarding duplicate scanner versions."""
from assessment_helpers import package_version


def validate_inventory(records, expected, inherited_extras):
    observed = {}
    for record in records:
        observed.setdefault(record['Name'], set()).add(package_version(record))
    if observed.keys() != expected.keys():
        raise ValueError('Scanner package names differ from native inventory')
    if not inherited_extras.keys() <= expected.keys():
        raise ValueError('Unrecognized inherited package')
    extras = {}
    for name, installed in expected.items():
        allowed = set(inherited_extras.get(name, []))
        if installed in allowed or observed[name] != {installed} | allowed:
            raise ValueError('Missing native version or unexpected scanner version: ' + name)
        if allowed:
            extras[name] = sorted(allowed)
    return dict(expected), extras
