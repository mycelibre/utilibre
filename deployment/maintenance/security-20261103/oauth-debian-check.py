"""Offline grant regression and consumer checks; synthetic identities only."""
import base64
import json
import sys
from types import SimpleNamespace
from urllib.parse import urlencode

import oauthlib
from oauthlib.oauth1 import Client
from oauthlib.oauth2 import (
    RequestValidator, BearerToken, ClientCredentialsGrant,
    ResourceOwnerPasswordCredentialsGrant, TokenEndpoint,
)

assert oauthlib.__version__ == "3.2.2"
fixed = sys.argv[1] == "fixed"
assert sys.argv[1] in ("baseline", "fixed")
header = {"Authorization": "Basic " + base64.b64encode(b"low:fictional").decode()}


class Validator(RequestValidator):
    def __init__(self, public=False):
        self.saved = []
        self.public = public

    def authenticate_client(self, request, *args, **kwargs):
        request.client = SimpleNamespace(client_id="low")
        return request.headers.get("Authorization") == header["Authorization"]

    def client_authentication_required(self, request, *args, **kwargs):
        return not self.public

    def authenticate_client_id(self, client_id, request, *args, **kwargs):
        request.client = SimpleNamespace(client_id="low")
        return client_id == "low"

    def validate_grant_type(self, client_id, grant_type, client, request, **kwargs):
        return (client_id or client.client_id) in ("low", "high") and grant_type in ("client_credentials", "password")

    def validate_scopes(self, client_id, scopes, client, request, **kwargs):
        return set(scopes or []) <= ({"read", "admin"} if client_id == "high" else {"read"})

    def get_default_scopes(self, *args, **kwargs):
        return ["read"]

    def validate_user(self, username, password, client, request, **kwargs):
        request.user = "fictional"
        return username == "fictional" and password == "fictional"

    def save_bearer_token(self, token, request, *args, **kwargs):
        self.saved.append((request.client.client_id, request.client_id, request.scopes))


checks = 0
for grant in ("client_credentials", "password"):
    v = Validator()
    token = BearerToken(v, expires_in=60)
    endpoint = TokenEndpoint(default_grant_type=grant, default_token_type=token,
                            grant_types={"client_credentials": ClientCredentialsGrant(v),
                                         "password": ResourceOwnerPasswordCredentialsGrant(v)})
    args = {"grant_type": grant, "client_id": "low", "scope": "read"}
    if grant == "password":
        args.update(username="fictional", password="fictional")

    def call(body, headers=header):
        h, b, s = endpoint.create_token_response("https://example.invalid/token", body=urlencode(body), headers=headers)
        assert h["Cache-Control"] == "no-store"
        return json.loads(b), s

    b, s = call(args)
    assert s == 200 and b["scope"] == "read"
    b, s = call({k: x for k, x in args.items() if k != "client_id"})
    assert s == 200 and v.saved[-1][:2] == ("low", "low")
    b, s = call({**args, "scope": "admin"})
    assert s == 400 and b["error"] == "invalid_scope"
    b, s = call(args, {})
    assert s == 401 and b["error"] == "invalid_client"
    saved = len(v.saved)
    b, s = call({**args, "client_id": "high", "scope": "admin"})
    if fixed:
        assert s == 400 and b["error"] == "server_error" and len(v.saved) == saved
    else:
        assert s == 200 and v.saved[-1][:2] == ("low", "high") and "admin" in v.saved[-1][2]
    checks += 5

# Public password clients still work; malformed credentials do not issue tokens.
v = Validator(public=True)
g = ResourceOwnerPasswordCredentialsGrant(v)
from oauthlib.common import Request
for password, expected in (("fictional", 200), ("wrong", 400)):
    request = Request("https://example.invalid/token", http_method="POST",
                      body=urlencode({"grant_type": "password", "client_id": "low", "scope": "read",
                                      "username": "fictional", "password": password}))
    h, b, status = g.create_token_response(request, BearerToken(v, expires_in=60))
    assert status == expected
    checks += 1

# Cloud-init uses this OAuth1 mechanism; no cloud metadata or token requests.
c = Client("fictional-consumer", client_secret="fictional-secret", resource_owner_key="fictional-token",
           resource_owner_secret="fictional-token-secret", signature_method="PLAINTEXT", timestamp="1", nonce="1")
_, headers, _ = c.sign("https://example.invalid/metadata")
assert 'oauth_signature="fictional-secret%26fictional-token-secret"' in headers["Authorization"]
checks += 1
print(json.dumps({"passed": True, "checks": checks, "version": oauthlib.__version__,
                  "identityEscalationReproduced": not fixed, "identityMismatchRejected": fixed,
                  "normalGrantsAndOAuth1Preserved": True, "network": "none"}))
