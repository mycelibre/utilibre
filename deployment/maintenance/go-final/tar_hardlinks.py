"""Compare tar hardlinks by target content; preserve symbolic-link semantics."""
def resolve_hardlinks(records):
    result = dict(records)
    for name, value in records.items():
        seen = {name}
        while value.startswith('hardlink:'):
            relative = value[len('hardlink:'):]
            if '..' in relative.split('/') or '\0' in relative:
                raise ValueError('Invalid tar hardlink path')
            target = '/' + relative.removeprefix('./').lstrip('/')
            if target in seen or target not in records:
                raise ValueError('Invalid tar hardlink target')
            seen.add(target)
            value = records[target]
        if records[name].startswith('hardlink:'):
            if len(value) != 64 or any(c not in '0123456789abcdef' for c in value):
                raise ValueError('Hardlink must resolve to regular-file content')
            result[name] = value
    return result
