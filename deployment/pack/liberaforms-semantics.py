"""Template-only accessibility and public homepage metadata, LiberaForms 4.11.1."""
from pathlib import Path

root = Path('/app/liberaforms/templates')

def replace(file, old, new):
    path = root / file
    text = path.read_text()
    assert text.count(old) == 1, f'Review changed template: {file}'
    path.write_text(text.replace(old, new))

# The home link is already named; its adjacent site name supplies the brand.
replace('base-landing.html', '<img src="/logo.png" height="38"/>',
        '<img src="/logo.png" height="38" alt="" aria-hidden="true"/>')
replace('base-backend.html', '<img src="/logo.png" height="38">',
        '<img src="/logo.png" height="38" alt="" aria-hidden="true">')
# Reuse the configured public site description and Jinja's HTML escaping.
replace('base-landing.html', '<title>{{ g.site.name }}</title>',
        '<title>{{ g.site.name }}</title>\n'
        '  <meta name="description" content="{{ g.site.get_short_description() }}">')
