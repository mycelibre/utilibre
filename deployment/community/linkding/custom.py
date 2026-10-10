# Native custom-settings hook; no upstream source changes.
# Only the private nginx gateway reaches the application port.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
# Native login form is disabled; the Django admin must not bypass OIDC.
AUTHENTICATION_BACKENDS = ['mozilla_django_oidc.auth.OIDCAuthenticationBackend']
