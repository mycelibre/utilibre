"""Narrow outbound boundary for Structables 0.4.5; not a general proxy."""
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

HOSTS = frozenset({'www.instructables.com', 'cdn.instructables.com', 'content.instructables.com'})
MAX_BYTES = 8 * 1024 * 1024


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise URLError('Upstream redirect refused')


def validate_url(url):
    parts = urlsplit(url)
    if (parts.scheme != 'https' or parts.hostname not in HOSTS
            or parts.port not in (None, 443) or parts.username is not None
            or parts.password is not None or parts.fragment or '\\' in url
            or any(ord(c) < 32 for c in url)):
        raise URLError('Unsupported upstream address')


class BoundedResponse:
    def __init__(self, response):
        self.response = response
        self.headers = response.headers
        self.remaining = MAX_BYTES
        length = self.headers.get('Content-Length')
        if length and int(length) > MAX_BYTES:
            response.close()
            raise URLError('Upstream response too large')

    def read(self, size=-1):
        amount = self.remaining + 1 if size < 0 else min(size, self.remaining + 1)
        data = self.response.read(amount)
        self.remaining -= len(data)
        if self.remaining < 0:
            self.close()
            raise URLError('Upstream response too large')
        return data

    def close(self):
        self.response.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def urlopen(url, timeout=10):
    request = url if isinstance(url, Request) else Request(url)
    validate_url(request.full_url)
    # Do not inherit environment proxies or follow redirects to arbitrary hosts.
    return BoundedResponse(build_opener(ProxyHandler({}), NoRedirects()).open(request, timeout=min(timeout, 10)))
