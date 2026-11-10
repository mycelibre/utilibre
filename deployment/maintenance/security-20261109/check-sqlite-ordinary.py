"""Ordinary local SQLite compatibility checks. Only fictional, temporary data."""
import json
import sqlite3
import tempfile
from pathlib import Path

checks = 0


def check(condition):
    global checks
    assert condition
    checks += 1


with tempfile.TemporaryDirectory(prefix='utilibre-sqlite-ordinary-') as folder:
    db = sqlite3.connect(Path(folder) / 'fictional.db')
    check(db.execute('select sqlite_version()').fetchone()[0] == '3.46.1')
    db.execute('pragma foreign_keys=on')
    db.execute('create table category(id integer primary key, label text)')
    db.execute('create table item(id integer primary key, category integer references category(id), label text, amount real)')
    db.execute('insert into category values(1, ?)', ('Fictional workshop',))
    db.executemany('insert into item values(?, 1, ?, ?)', [(1, 'Papel', 3.5), (2, 'Lápices', 2.0)])
    db.commit()
    check(db.execute('select count(*) from item').fetchone()[0] == 2)
    check(db.execute('select sum(amount) from item').fetchone()[0] == 5.5)
    check(db.execute('select label from item where id=?', (2,)).fetchone()[0] == 'Lápices')
    db.execute('update item set amount=4 where id=1')
    db.rollback()
    check(db.execute('select amount from item where id=1').fetchone()[0] == 3.5)
    check(db.execute('select distinct category from item').fetchall() == [(1,)])
    check(db.execute('select count(*) from item join category on item.category=category.id').fetchone()[0] == 2)
    check(db.execute('pragma foreign_key_check').fetchall() == [])
    db.execute('create virtual table notes using fts5(text)')
    db.execute('insert into notes values(?)', ('fictional workshop notes',))
    check(db.execute("select text from notes where notes match 'workshop'").fetchone()[0] == 'fictional workshop notes')
    db.commit()
    check(db.execute('pragma integrity_check').fetchone()[0] == 'ok')
    saved = sqlite3.connect(Path(folder) / 'backup.db')
    db.backup(saved)
    check(saved.execute('select * from item order by id').fetchall() == db.execute('select * from item order by id').fetchall())
    check(saved.execute('pragma integrity_check').fetchone()[0] == 'ok')
    saved.close()
    db.close()
    restored = sqlite3.connect(Path(folder) / 'backup.db')
    check(restored.execute('select count(*) from item').fetchone()[0] == 2)
    restored.execute('delete from item where id=1')
    restored.commit()
    check(restored.execute('select count(*) from item').fetchone()[0] == 1)
    restored.close()
check(checks == 14)
print(json.dumps({'passed': True, 'checks': checks, 'backupRestore': True}))
