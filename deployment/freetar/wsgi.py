"""Small deployment boundary around Freetar's native Flask application."""
import logging
import os

import waitress
from flask import abort, request, send_from_directory
from freetar.backend import app

logging.disable(logging.CRITICAL)


@app.before_request
def request_limit():
    if request.method not in ('GET', 'HEAD'):
        abort(405)
    if len(request.full_path) > 1536 or len(request.args.get('search_term', '')) > 256:
        abort(414)


@app.after_request
def privacy_headers(response):
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
        "script-src 'self' 'unsafe-inline'; connect-src 'none'; frame-src 'none'; "
        "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
    )
    if not request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'no-store'
    return response


@app.get('/healthz')
def health():
    return 'ok\n', 200, {'Content-Type': 'text/plain'}


@app.get('/utilibre-source/freetar-utilibre.tar.gz')
def source():
    return send_from_directory('/source', 'freetar-utilibre.tar.gz', as_attachment=True)


if __name__ == '__main__':
    waitress.serve(app, host='0.0.0.0', port=int(os.getenv('FREETAR_PORT', '22000')),
                   threads=4, channel_timeout=30)
