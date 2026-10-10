"""Run with ak shell. Add only Vikunja's native static extra_settings_links claim."""
import json,os
from pathlib import Path
from django.db import transaction
from authentik.providers.oauth2.models import OAuth2Provider,ScopeMapping
NAME='Utilibre Vikunja catalog links'
EXPRESSION='return {"extra_settings_links": {"utilibre_en": {"text": "More tools from Utilibre", "url": "https://utilibre.org/en/"}, "utilibre_es": {"text": "Más herramientas de Utilibre", "url": "https://utilibre.org/es/"}}}'
with transaction.atomic():
 provider=OAuth2Provider.objects.get(name='Utilibre vikunja',client_id='utilibre-vikunja')
 fields={f.name:getattr(provider,f.attname)for f in provider._meta.concrete_fields}
 before=list(provider.property_mappings.values_list('pk',flat=True))
 mapping,created=ScopeMapping.objects.get_or_create(name=NAME,defaults={'scope_name':'profile','expression':EXPRESSION})
 assert mapping.scope_name=='profile' and mapping.expression==EXPRESSION
 assert not OAuth2Provider.objects.filter(property_mappings=mapping).exclude(pk=provider.pk).exists()
 private=Path('/data/private/vikunja-catalog-links-before.json')
 if not private.exists():
  with os.fdopen(os.open(private,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600),'w')as f:json.dump({'provider':provider.pk,'previousMappingIds':[str(x)for x in before],'addedMappingId':str(mapping.pk),'createdMapping':created},f)
 provider.property_mappings.add(mapping)
 provider.refresh_from_db()
 assert fields=={f.name:getattr(provider,f.attname)for f in provider._meta.concrete_fields}
 assert set(provider.property_mappings.values_list('pk',flat=True))==set(before)|{mapping.pk}
print('Only the Vikunja-specific static catalog mapping was added; provider fields and existing mappings are unchanged.')
