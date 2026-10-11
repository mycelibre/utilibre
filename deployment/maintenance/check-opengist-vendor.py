"""Blank, temporary native Opengist test. No production data or credentials."""
import io
import json
import pathlib
import re
import secrets
import subprocess
import time
import zipfile

import requests

IMAGE = "utilibre-opengist:1.15.2-vendor-security-20261011"
NAME = "maintenance-opengist-vendor-stage"
BASE = "http://127.0.0.1:32796"
HERE = pathlib.Path(__file__).resolve().parent


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True, stderr=subprocess.PIPE).strip()


def csrf(text):
    found = re.search(r'name="_csrf"[^>]*value="([^"]+)"', text)
    if not found:
        found = re.search(r'value="([^"]+)"[^>]*name="_csrf"', text)
    assert found, "Native CSRF field missing"
    return found.group(1)


session = requests.Session()


def request(method, path, **kwargs):
    # Native cookie is secure; this isolated test intentionally uses loopback HTTP.
    for cookie in session.cookies:
        cookie.secure = False
    return session.request(method, BASE + path, timeout=15, **kwargs)


try:
    docker("run", "-d", "--name", NAME, "--network", "bridge", "--read-only",
           "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true",
           "--memory", "512m", "--cpus", "1", "--pids-limit", "128",
           "--log-driver", "none", "--tmpfs", "/tmp:rw,size=32m,mode=1777",
           "--tmpfs", "/opengist:rw,size=96m,uid=1000,gid=1000",
           "-v", str(HERE / "opengist-stage.yml") + ":/config.yml:ro",
           "-p", "127.0.0.1:32796:6157", IMAGE)
    for _ in range(60):
        try:
            if request("GET", "/healthcheck").status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(0.5)
    else:
        raise AssertionError("Native startup failed")
    pw = secrets.token_urlsafe(24)
    page = request("GET", "/-/register")
    response = request("POST", "/-/register", data={"username": "fictional-check",
        "password": pw, "_csrf": csrf(page.text)}, allow_redirects=False)
    assert response.status_code == 302, "Native registration failed"
    page = request("GET", "/-/admin-panel/configuration")
    response = request("PUT", "/-/admin-panel/set-config", data={"key": "disable-gravatar",
        "value": "1", "_csrf": csrf(page.text)})
    assert response.status_code == 200
    page = request("GET", "/-/settings/access-tokens")
    response = request("POST", "/-/settings/access-tokens", data={"name": "Fictional check",
        "scope_gist": "2", "scope_user": "2", "expires_at": "2027-01-01",
        "_csrf": csrf(page.text)}, allow_redirects=False)
    assert response.status_code == 302
    token = re.search(r"og_[A-Za-z0-9_-]+", request("GET", "/-/settings/access-tokens").text)
    assert token, "Native token creation failed"
    headers = {"Authorization": "Bearer " + token.group(0)}

    def api(method, path, body=None, status=200, authenticated=True):
        response = requests.request(method, BASE + "/api" + path, json=body,
                                    headers=headers if authenticated else {}, timeout=15)
        assert response.status_code == status, (method, path, response.status_code)
        return response

    for visibility in ["public", "private"]:
        gist = api("POST", "/gists", {"title": "Fictional library check",
            "visibility": visibility, "files": {"example.txt": {"content": "Fictional one\n"}}}, 201).json()
        ident = gist["id"]
        api("GET", "/gists/" + ident, status=404 if visibility == "private" else 200,
            authenticated=False)
        api("PATCH", "/gists/" + ident, {"files": {"example.txt": {"content": "Fictional two\n"}}})
        assert len(api("GET", "/gists/" + ident + "/commits").json()) >= 2
        archive = request("GET", "/fictional-check/" + ident + "/archive/HEAD")
        assert archive.status_code == 200
        with zipfile.ZipFile(io.BytesIO(archive.content)) as contents:
            name = next(name for name in contents.namelist() if name.endswith("example.txt"))
            assert contents.read(name) == b"Fictional two\n"
        if visibility == "public":
            # Native HTTP Git discovery, not only the application JSON API.
            refs = request("GET", "/fictional-check/" + ident + "/info/refs?service=git-upload-pack",
                           headers={"User-Agent": "git/2.47.3"})
            assert refs.status_code == 200 and b"git-upload-pack" in refs.content, ("Git discovery", refs.status_code)
    request("GET", "/-/logout")
    page = request("GET", "/-/login")
    response = request("POST", "/-/login", data={"username": "fictional-check",
        "password": pw, "_csrf": csrf(page.text)}, allow_redirects=False)
    assert response.status_code == 302
    assert request("GET", "/-/settings").status_code == 200
    print(json.dumps({"image": IMAGE, "imageId": docker("image", "inspect", IMAGE, "--format", "{{.Id}}"),
        "blankDatabase": True, "nativeRegistrationLogin": True, "createEditCommitZip": True,
        "nativeHttpGit": True, "anonymousPrivateDenied": True,
        "limitation": "Loopback native HTTP/API test; production OIDC unchanged and not replayed."}))
finally:
    try:
        docker("rm", "-f", NAME)
    except subprocess.CalledProcessError:
        pass
