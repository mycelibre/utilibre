#!/usr/bin/env python3
"""Reject mutable/symlinked operator backup inputs; never inspect user content.

This is an ownership prerequisite, not a validator for arbitrary tar archives.
Restore only archives produced by the trusted native backup procedure.
"""
import os
from pathlib import Path
import stat
import sys


def protected(path, *, parent=False):
    info = path.lstat()
    if info.st_uid not in {0, os.geteuid()}:
        raise ValueError('Backup input must be owned by the operator or root')
    if not (stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)):
        raise ValueError('Backup input must contain regular files/directories only')
    # Root-owned sticky ancestors such as /tmp cannot replace our owned child.
    sticky_parent = parent and info.st_uid == 0 and stat.S_ISDIR(info.st_mode) and info.st_mode & stat.S_ISVTX
    if info.st_mode & 0o022 and not sticky_parent:
        raise ValueError('Backup input is writable by another user/group')


def check(raw, snapshot):
    if '..' in Path(raw).parts:
        raise ValueError('Use a direct backup path without parent traversal')
    path = Path(os.path.abspath(raw))
    for ancestor in reversed(path.parents):
        protected(ancestor, parent=True)
    protected(path)
    if not path.is_dir():
        raise ValueError('Backup input directory required')
    if snapshot:
        count = 0
        for directory, dirs, files in os.walk(path, followlinks=False):
            for name in dirs + files:
                count += 1
                if count > 4096:
                    raise ValueError('Unexpected number of core snapshot entries')
                protected(Path(directory) / name)
        if not (path / 'SHA256SUMS').is_file():
            raise ValueError('Completed snapshot checksum manifest required')


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3 or sys.argv[1] not in {'directory', 'snapshot'}:
            raise ValueError('Usage: check-backup-input.py directory|snapshot PATH')
        check(sys.argv[2], sys.argv[1] == 'snapshot')
    except (OSError, ValueError) as error:
        # Do not print protected filenames or content in a shared terminal/log.
        print('Backup ownership check failed: ' + (str(error) if isinstance(error, ValueError) else type(error).__name__), file=sys.stderr)
        sys.exit(1)
