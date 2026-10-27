"""Deployment policy around the complete upstream Flask application."""
import base64
import hashlib
import logging
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import nh3
from flask import abort, request, send_from_directory
from markupsafe import Markup
from structables.main import app
from structables.safe_http import validate_url

logging.disable(logging.CRITICAL)
app.config.update(MAX_CONTENT_LENGTH=4096, MAX_FORM_MEMORY_SIZE=4096)


def clean_attribute(tag, attr, value):
    if tag == 'img' and attr == 'src':
        # Only the existing, validated media endpoint can supply article images.
        parts = urlsplit(value)
        if parts.scheme or parts.netloc or parts.path != '/proxy/':
            return None
        urls = parse_qs(parts.query).get('url', [])
        if len(urls) != 1:
            return None
        try:
            validate_url(urls[0])
        except ValueError:
            return None
        except OSError:
            return None
    return value


@app.template_filter('clean_html')
def clean_html(value):
    return Markup(nh3.clean(str(value), url_schemes={'http', 'https'},
                           attribute_filter=clean_attribute, link_rel='noopener noreferrer'))


base = Path(app.root_path, 'templates/base.html').read_text()
hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(s.encode()).digest()).decode() + "'"
          for s in re.findall(r'<script>(.*?)</script>', base, flags=re.S)]
CSP = ("default-src 'none'; script-src " + ' '.join(hashes or ["'none'"]) + "; "
       "style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; "
       "connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; "
       "form-action 'self'; frame-ancestors 'none'")


@app.before_request
def request_boundary():
    search_post = request.method == 'POST' and request.path == '/search'
    if request.method not in ('GET', 'HEAD') and not search_post:
        abort(405)
    if len(request.full_path) > 2048 or (request.content_length and not search_post):
        abort(413)
    if search_post and (request.mimetype != 'application/x-www-form-urlencoded'
                        or set(request.form) - {'q'} or len(request.form.get('q', '')) > 256):
        abort(400)
    if request.path.startswith(('/cron', '/iframe')):
        abort(404)


@app.after_request
def response_boundary(response):
    response.headers['Content-Security-Policy'] = CSP
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    if request.path == '/proxy/':
        response.headers['Content-Security-Policy'] = "default-src 'none'; sandbox"
        if response.mimetype not in ('image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'):
            response.headers['Content-Disposition'] = 'attachment'
            response.headers['Content-Type'] = 'application/octet-stream'
    elif not request.path.startswith(('/static/', '/utilibre-source/')):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/healthz')
def health():
    return 'ok\n', 200, {'Content-Type': 'text/plain'}


@app.get('/utilibre-source/<path:name>')
def source(name):
    if name not in ('structables-utilibre.tar.gz',):
        abort(404)
    return send_from_directory('/source', name, as_attachment=True)
