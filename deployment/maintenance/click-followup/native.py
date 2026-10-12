"""Click/Apprise compatibility, fictional input, no notification delivery."""
import inspect
import json
import os
import tempfile
import importlib.metadata as metadata
import click
import click._termui_impl
from click.testing import CliRunner
import apprise
from apprise.cli import main

checks = []
assert metadata.version('click') == '8.3.3'
assert 'shell=True' not in inspect.getsource(click._termui_impl.Editor.edit_files)
checks.append('editor uses argument vector, not a shell')
runner = CliRunner()
for args, expected in [(['--help'], 'Usage:'), (['--version'], '1.10.0')]:
    result = runner.invoke(main, args)
    assert result.exit_code == 0, (args, result.output)
    assert expected in result.output
    checks.append('Apprise ' + args[0])
result = runner.invoke(main, ['--utilibre-invalid-option'])
assert result.exit_code == 2 and 'No such option' in result.output
checks.append('native invalid-option rejection')
notifications = apprise.Apprise()
assert notifications.add('json://127.0.0.1:9')
assert len(notifications) == 1
checks.append('Apprise parses a fictional local endpoint; never sent')

@click.command()
@click.option('--count', type=click.IntRange(1, 3), default=1)
@click.argument('label')
def fixture(count, label):
    for _ in range(count):
        click.echo(label)

result = runner.invoke(fixture, ['--count', '2', 'Ficción, ñ'])
assert result.exit_code == 0 and result.output == 'Ficción, ñ\nFicción, ñ\n'
assert runner.invoke(fixture, ['--count', '5', 'example']).exit_code == 2
checks.append('Unicode arguments, options and validation')
with tempfile.TemporaryDirectory(prefix='utilibre-click-') as directory:
    path = os.path.join(directory, 'fictional file with spaces.txt')
    with open(path, 'w', encoding='utf8') as output:
        output.write('Fictional local editing fixture\n')
    # /bin/true is an intentional no-op editor: validates quoting and return
    # handling without starting a shell or modifying any actual user file.
    click.edit(filename=path, editor='/bin/true')
    with click.open_file(path, encoding='utf8') as source:
        assert source.read() == 'Fictional local editing fixture\n'
checks.append('editor/file API with spaces, original preserved')
print(json.dumps({'passed': True, 'noDelivery': True, 'click': metadata.version('click'), 'apprise': metadata.version('apprise'), 'checks': checks}))
