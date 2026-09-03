"""Production-only Healthchecks settings applied by the Utilibre deployment."""

from .settings import *  # noqa: F403

# TLS terminates at the trusted Caddy edge. These flags prevent browsers from
# ever returning authentication or CSRF cookies over a plaintext connection.
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
