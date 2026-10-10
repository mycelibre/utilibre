"""Django's supported settings override; no game/authentication implementation."""
from family_chess.settings import *  # noqa: F403

DATABASES['default']['NAME'] = '/data/chess.sqlite3'
DATABASES['default']['OPTIONS']['init_command'] = 'PRAGMA journal_mode=WAL; PRAGMA max_page_count=65536;'
STATIC_ROOT = '/app/staticfiles'
LANGUAGES = [('en', 'English'), ('es', 'Español'), ('zh-hans', 'Chinese (Simplified)')]
LOGGING = {
    'version': 1, 'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler', 'level': 'WARNING'}},
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_HSTS_SECONDS = 31536000
DATA_UPLOAD_MAX_MEMORY_SIZE = 16384
FILE_UPLOAD_MAX_MEMORY_SIZE = 16384
SESSION_COOKIE_NAME = 'fc_session'

# Native HTTPS CSRF needs same-origin referrers; no referrer is sent outside.
SECURE_REFERRER_POLICY = 'same-origin'
