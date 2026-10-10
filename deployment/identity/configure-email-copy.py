"""Select two native email templates; change no account, token or flow settings.

Run in the pinned identity container after mounting email-templates at /templates.
This renders fictional messages locally and sends no email.
"""
import json
from datetime import timedelta
from pathlib import Path
from django.db import transaction
from django.forms.models import model_to_dict
from django.template.loader import render_to_string
from django.utils import timezone, translation
from authentik.stages.email.models import EmailStage, get_template_choices

templates = {
    'utilibre-invitation-verify-email': 'email/utilibre-account-confirmation.html',
    'utilibre-recovery-email': 'email/utilibre-password-reset.html',
}
choices = {value for value, _label in get_template_choices()}
assert set(templates.values()) <= choices, 'Native template mount is unavailable'
fixture = {'url': 'https://identity.example.invalid/fictional?token=not-a-real-token',
           'expires': timezone.now() + timedelta(minutes=30)}
for language in ['en', 'es', 'es-gt']:
    with translation.override(language):
        for template in templates.values():
            rendered = render_to_string(template, fixture)
            assert fixture['url'] in rendered
            assert 'id="confirm"' in rendered
            if language.startswith('es'):
                assert ('Confirmá' in rendered or 'Restablecé' in rendered)
                assert 'Usá' in rendered or 'usá' in rendered
                assert 'copia y pega' not in rendered and 'Usa el' not in rendered
                if 'password-reset' in template:
                    assert 'ignorá' in rendered and 'minut' in rendered
            assert '<script' not in rendered

backup = Path('/data/utilibre-copy-backups')
backup.mkdir(mode=0o700, exist_ok=True)
with transaction.atomic():
    stages = list(EmailStage.objects.select_for_update().filter(name__in=templates))
    assert len(stages) == 2
    previous = [{'name': stage.name, 'template': stage.template} for stage in stages]
    destination = backup / ('email-templates-' + timezone.now().strftime('%Y%m%dT%H%M%SZ') + '.json')
    destination.write_text(json.dumps(previous, indent=2) + '\n')
    destination.chmod(0o600)
    for stage in stages:
        before = model_to_dict(stage)
        stage.template = templates[stage.name]
        stage.save(update_fields=['template'])
        stage.refresh_from_db()
        assert model_to_dict(stage) == {**before, 'template': templates[stage.name]}
print(json.dumps({'result': 'passed', 'changedFields': ['template'],
                  'stages': 2, 'fictionalRenders': 6, 'emailsSent': 0,
                  'backup': str(destination)}))
