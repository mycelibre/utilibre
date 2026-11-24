"""Deployment boundary for Wikimore's native Flask application."""
import base64
import hashlib
import logging
import re

from flask import abort, request, send_from_directory

logging.disable(logging.CRITICAL)
from wikimore.app import app  # noqa: E402


@app.before_request
def request_limit():
    if request.method not in ('GET', 'HEAD', 'POST'):
        abort(405)
    if request.method == 'POST' and request.path != '/search':
        abort(405)
    if len(request.full_path) > 2048 or (request.content_length or 0) > 4096:
        abort(413)


@app.after_request
def privacy_headers(response):
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if request.path == '/proxy':
        response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
        response.headers['Cache-Control'] = 'public, max-age=3600'
    elif response.is_streamed or response.direct_passthrough:
        # Source archives and other streamed responses must stay streamed.
        response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
        response.headers['Cache-Control'] = 'no-store'
    elif request.path.startswith('/static/'):
        response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
    else:
        scripts = re.findall(r'<script(?:\s[^>]*)?>(.*?)</script>',
                             response.get_data(as_text=True), flags=re.S | re.I)
        hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode() + "'"
                  for s in scripts]
        response.headers['Content-Security-Policy'] = (
            "default-src 'none'; script-src 'self' " + ' '.join(hashes) + "; "
            "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
            "connect-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
        )
        if not request.path.startswith('/static/'):
            response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/healthz')
def health():
    return 'ok\n', 200, {'Content-Type': 'text/plain'}


@app.get('/utilibre-source/wikimore-utilibre.tar.gz')
def source():
    return send_from_directory('/source', 'wikimore-utilibre.tar.gz', as_attachment=True)
