"""Restrict script relocation to its one top-level directory assignment."""
import re


def relocate_directory(code, directory):
    result, count = re.subn(r'^HERE ?= ?Path\(__file__\)\.resolve\(\)\.parent$',
                            'HERE = Path(' + repr(str(directory)) + ')', code, flags=re.M)
    assert count == 1, 'Expected one top-level adapter directory; nested source strings stay intact'
    compile(result, '<relocated-adapter>', 'exec')
    return result
