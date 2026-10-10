#!/usr/bin/env python3
"""Write a concrete, unactivated gateway config; no network or runtime changes."""
from pathlib import Path

recipe = Path(__file__).resolve().parent
config = (recipe / 'nginx.conf').read_text()
config = config.replace('    # This pilot has no published port. A production edge route is not enabled.\n',
                        '    # Prepared for the separate edge; not enabled by the evaluation compose.\n')
config = config.replace('    listen 1337;', '    listen 8080;')
config = config.replace('server_name projects.invalid;', 'server_name projects.utilibre.org;')
config = config.replace('ws://projects.invalid:1337', 'wss://projects.utilibre.org')
config = config.replace('  access_log off;', '''  access_log off;
  set_real_ip_from 10.10.1.3;
  real_ip_header X-Forwarded-For;
  real_ip_recursive on;''')
config = config.replace('proxy_set_header Host $http_host;',
                        'proxy_set_header Host projects.utilibre.org;')
config = config.replace('proxy_set_header X-Forwarded-Host $http_host;',
                        'proxy_set_header X-Forwarded-Host projects.utilibre.org;')
config = config.replace('proxy_set_header X-Forwarded-Proto $scheme;',
                        'proxy_set_header X-Forwarded-Proto https;')
(recipe / 'nginx-production.conf').write_text(config)
print('Prepared nginx-production.conf; no public listener or edge route enabled.')
