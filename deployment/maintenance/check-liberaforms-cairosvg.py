"""Executed only inside the blank, network-isolated stage by the .mjs runner."""
import base64
import io
import json
import os
import secrets

import cairosvg
from bs4 import BeautifulSoup
from PIL import Image
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

from wsgi import app
from liberaforms import db
from liberaforms.models.site import Site
from liberaforms.models.user import User
from liberaforms.models.form import Form
from liberaforms.utils.avatars import create_default_avatar

assert cairosvg.__version__ == "2.9.1"
assert os.environ["DB_NAME"] == "fictional_stage"
assert os.environ["DB_HOST"] == "127.0.0.1"
BASE = "https://forms.example.invalid"
password = secrets.token_urlsafe(24)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public_key = base64.b64encode(key.public_key().public_bytes(
    serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)).decode()

with app.test_request_context(base_url=BASE):
    db.create_all()
    Site().save()
    for username in ["fictional_owner", "fictional_other"]:
        user = User(username=username, email=username + "@example.invalid", password=password,
                    validated_email=True, role="editor")
        user.e2ee_public_key = {"public_key": public_key}
        user.save()
        create_default_avatar(username)
        with Image.open("/app/uploads/media/avatars/" + username + ".png") as image:
            image.load()
            assert image.format == "PNG" and min(image.size) > 0


def token(response):
    assert response.status_code == 200, ("GET", response.status_code)
    return BeautifulSoup(response.data, "html.parser").find("input", {"name": "csrf_token"})["value"]


def login(client, username):
    csrf = token(client.get("/user/login", base_url=BASE))
    result = client.post("/user/login", base_url=BASE, data={"username": username,
        "password": password, "csrf_token": csrf}, headers={"Referer": BASE + "/user/login"})
    assert result.status_code == 302
    with client.session_transaction() as session:
        assert session.get("_user_id"), "Native login must set the session"


with app.test_client() as owner:
    login(owner, "fictional_owner")
    csrf = token(owner.get("/form/new", base_url=BASE))
    response = owner.post("/form/new", base_url=BASE, data={"name": "Fictional CairoSVG check",
        "slug": "fictional-cairo-check", "is_e2ee": "y", "csrf_token": csrf},
        headers={"Referer": BASE + "/form/new"})
    assert response.status_code == 302, ("create form", response.status_code)
    with app.test_request_context(base_url=BASE):
        form = Form.find(slug="fictional-cairo-check")
        assert form is not None and form.is_e2ee, "Required-encryption native form creation"
        ident = form.id
    assert owner.get(f"/form/{ident}/answers", base_url=BASE).status_code == 200

with app.test_client() as other:
    login(other, "fictional_other")
    response = other.get(f"/form/{ident}/answers", base_url=BASE)
    assert response.status_code == 302 and response.headers["Location"] == "/forms"
with app.test_client() as anonymous:
    assert anonymous.get(f"/form/{ident}/answers", base_url=BASE).status_code == 302

svg = b'<svg xmlns="http://www.w3.org/2000/svg" width="32" height="24"><rect width="32" height="24" fill="#1248ac"/></svg>'
png = cairosvg.svg2png(bytestring=svg)
with Image.open(io.BytesIO(png)) as image:
    image.load()
    assert image.format == "PNG" and image.size == (32, 24)
    assert image.convert("RGB").getpixel((15, 10)) == (18, 72, 172)
pdf = cairosvg.svg2pdf(bytestring=svg)
assert pdf.startswith(b"%PDF-") and len(pdf) > 500
print(json.dumps({"cairosvg": "2.9.1", "nativeAvatarPng": True,
    "nativeTwoAccountLogin": True, "nativeRequiredEncryptionFormCreation": True,
    "ownerAnswerPage": True, "otherAndAnonymousDenied": True,
    "svgPngDimensionsAndPixel": True, "svgPdfExport": True,
    "limitations": "Flask native auth/form requests with newly generated public key; not a browser E2EE/key-backup or SMTP test."}))
