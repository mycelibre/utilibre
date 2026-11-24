"""Bounded Wikimedia media transport; never an open URL proxy."""
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

HOSTS = frozenset({'upload.wikimedia.org', 'maps.wikimedia.org', 'thumb.wikimedia.org'})
MAX_BYTES = 16 * 1024 * 1024
MEDIA_TYPES = frozenset({
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
    'image/svg+xml', 'audio/ogg', 'audio/mpeg', 'video/webm',
})


def validate_url(url):
    parts = urlsplit(url)
    if (parts.scheme != 'https' or parts.hostname not in HOSTS
            or parts.port not in (None, 443) or parts.username or parts.password
            or parts.fragment or '\\' in url or any(ord(c) < 32 for c in url)):
        raise ValueError('Unsupported Wikimedia media URL')


class SafeRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class BoundedResponse:
    def __init__(self, response):
        self.response = response
        self.headers = response.headers
        self.remaining = MAX_BYTES
        length = self.headers.get('Content-Length')
        if length and int(length) > MAX_BYTES:
            response.close()
            raise URLError('Media exceeds size limit')
        media_type = self.headers.get('Content-Type', '').split(';', 1)[0].lower()
        if media_type not in MEDIA_TYPES:
            response.close()
            raise URLError('Unsupported media type')

    def read(self, size=-1):
        amount = self.remaining + 1 if size < 0 else min(size, self.remaining + 1)
        data = self.response.read(amount)
        self.remaining -= len(data)
        if self.remaining < 0:
            self.close()
            raise URLError('Media exceeds size limit')
        return data

    def close(self):
        self.response.close()


def open_media(url):
    validate_url(url)
    request = Request(url, headers={'User-Agent': 'Wikimore/0.1.27 (wikimore.utilibre.org)'})
    # Do not inherit ambient proxies or forward visitor headers.
    return BoundedResponse(build_opener(ProxyHandler({}), SafeRedirects()).open(request, timeout=10))
