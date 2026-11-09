#!/usr/bin/env python3
"""Render installed footer code with fictional values, without Flask or a database."""
from pathlib import Path
from types import SimpleNamespace
import subprocess
from jinja2 import Environment, StrictUndefined
from markupsafe import Markup

out = Path('/var/lib/utilibre-maintenance/security-20261109/abuse-reporting/late')
web = out / 'web'
web.mkdir(exist_ok=True)
for css in ['main-frontend.css', 'main-landing.css']:
    (web / css).write_bytes(subprocess.check_output(['docker', 'exec', 'utilibre-pack-forms-app-1', 'cat', '/app/liberaforms/static/css/' + css]))

# Babel preserves explicitly safe substitutions such as the native site link.
translate = lambda text, **values: Markup(text) % values if values else text
environment = Environment(undefined=StrictUndefined, autoescape=True)
for language in ['en', 'es']:
    values = {
        'config': {'BASE_URL': 'https://forms.utilibre.org', 'ENABLE_RSS_FEED': False},
        'g': SimpleNamespace(bcp47_code=language, site=SimpleNamespace(name='Utilibre Forms', hostname='forms.utilibre.org', app_version=lambda: '4.11.1')),
        'current_user': SimpleNamespace(is_authenticated=False),
        'form': SimpleNamespace(is_e2ee_enabled=lambda: True),
        'openpgp_js': True, '_': translate,
    }
    for surface, filename in [('public', 'public-footer.html'), ('general', 'footer.html'), ('minimal', 'footer.html')]:
        arguments = {**values, **({'navbar': False} if surface == 'minimal' else {})}
        content = environment.from_string((out / 'forms' / filename).read_text()).render(**arguments)
        css = 'main-frontend.css' if surface == 'public' else 'main-landing.css'
        native_class = 'ds-liberaform' if surface == 'public' else 'container'
        (web / f'{surface}-{language}.html').write_text(
            f'<!doctype html><html lang="{language}"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<link rel="stylesheet" href="{css}"><body class="ds-frontend">'
            f'<main class="{native_class}"><h1>Fictional footer fixture</h1>'
            f'{content}</main></body></html>'
        )
