"""Small, fail-closed build adaptation for LiberaForms 4.11.1 (AGPL-3.0+).

Disable optional activity measurement, not native answers, permissions, consent
versions or encrypted key backups. No runtime middleware or replacement engine.
"""
from pathlib import Path
import re

root = Path('/app/liberaforms')

def replace(file, old, new, count=1):
    path = root / file
    text = path.read_text()
    assert text.count(old) == count, f'Upstream changed: {file}'
    path.write_text(text.replace(old, new))

# Preserve upstream credit and prominently offer the matching complete source.
replace('templates/footer.html', '<small>AGPLv3</small>',
    '<small>AGPLv3 · <a href="/utilibre-source/liberaforms-utilibre.tar.gz">Source / Código fuente</a></small>')
replace('templates/public_form/partials/footer.html', '<div class="ds-form-footer">',
    '<div class="ds-form-footer"><p><small><a href="/utilibre-source/liberaforms-utilibre.tar.gz">Source / Código fuente · AGPLv3</a></small></p>')

replace('models/form.py',
    '        actor = actor if actor else flask_login.current_user.username\n'
    '        FormLog(username=actor, form_id=self.id, message=message).save()',
    '        # Utilibre: do not persist a history of document/user actions.\n'
    '        return None')
replace('models/user.py', 'self.last_login = self.created', 'self.last_login = None')
replace('views/user_landing.py', 'user.last_login = datetime.now(timezone.utc)',
    '# Utilibre: no login-activity timestamp collection.', count=2)
replace('views/moderator.py', 'chart_data=chart_data.get_user_statistics(user),',
    'chart_data={},')
replace('templates/form/partials/options/advanced/api-endpoint.html',
    '          logCopyKeyAction()',
    '          // Utilibre: key copying does not send an activity event.')
replace('templates/moderator/inspect-user.html',
    "{% include 'moderator/partials/user-form-stats.html' %}",
    '{# Utilibre: optional user-activity statistics disabled. #}')

def remove_items(file, markers, expected):
    path = root / file
    text = path.read_text()
    removed = 0
    def item(match):
        nonlocal removed
        if any(marker in match.group() for marker in markers):
            removed += 1
            return ''
        return match.group()
    text = re.sub(r'<li\b[^>]*>(?:(?!</?li\b).)*</li>', item, text, flags=re.S)
    assert removed == expected, f'Upstream navigation changed: {file}'
    path.write_text(text)

remove_items('templates/base-backend.html',
    ['/user/statistics', 'site_bp.stats', 'site_bp.server_logs'], 3)
remove_items('templates/moderator/inspect-user.html', ['user.get_last_login()'], 1)
# Backend denies these optional routes as well; remove their remaining links.
for file in ['templates/form/partials/options/form-options.html', 'templates/answers/history.html']:
    path = root / file
    text, count = re.subn(r'<a\b[^>]*form_bp\.list_log[^>]*>.*?</a>', '', path.read_text(), flags=re.S)
    assert count == 1, f'Upstream log link changed: {file}'
    path.write_text(text)
