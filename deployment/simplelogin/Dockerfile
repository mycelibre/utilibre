FROM simplelogin/app-ci:v4.82.4@sha256:ec9176771cbdc778c161f92c462136836379cc84d8ce5006239db47d8152b4d4
# Upstream venv points at a bundled interpreter below /root. Permit traversal of
# its immutable parent directories so the native app can run as UID1000.
RUN chmod 0711 /root /root/.local /root/.local/share /root/.local/share/uv /root/.local/share/uv/python
# Native debug logging includes account/mail metadata; keep warning/error diagnostics.
RUN sed -i 's/logger.setLevel(logging.DEBUG)/logger.setLevel(logging.WARNING)/' /code/app/log.py
RUN useradd --no-create-home --uid 1000 --shell /usr/sbin/nologin utilibre \
 && python -c "from flanker.addresslib import address; address.parse('fictional@example.invalid')"
COPY port-aware-starttls.patch /tmp/port-aware-starttls.patch
RUN python - <<'PY'
from pathlib import Path
p=Path("/code/app/email_utils.py")
s=p.read_text()
assert "smtp = SMTP(server, 587)\n        smtp.starttls()" in s
s=s.replace("import random\n", "import random\nimport ssl\n").replace("smtp = SMTP(server, 587)\n        smtp.starttls()", "smtp = SMTP(server, config.POSTFIX_PORT)\n        smtp.starttls(context=ssl.create_default_context())")
p.write_text(s)
PY
# Independent HTTP/SMTP transport fixes. Framework publication blocker remains.
# The upstream uv.lock describes the immutable base; this layer has separate pins.
COPY security/transport-requirements.txt /tmp/utilibre-transport-requirements.txt
COPY security/build-constraints.txt /tmp/utilibre-build-constraints.txt
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --require-hashes -r /tmp/utilibre-transport-requirements.txt
# Keep native package metadata consistent with the one changed direct constraint.
RUN python - <<'PYFIX'
from pathlib import Path
p = Path('/code/pyproject.toml')
s = p.read_text()
assert '"gunicorn ~= 20.0.4"' in s
p.write_text(s.replace('"gunicorn ~= 20.0.4"', '"gunicorn == 26.2.0"'))
PYFIX
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --build-constraint /tmp/utilibre-build-constraints.txt /code \
 && UV_NO_CACHE=1 /usr/bin/uv pip check --python /code/.venv/bin/python
# Compatible transitive fixes do not relax the native application constraints.
# The upstream lock still describes the base; exact layer pins are kept here.
COPY security/compatible-leaves.txt /tmp/utilibre-compatible-leaves.txt
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --require-hashes -r /tmp/utilibre-compatible-leaves.txt \
 && UV_NO_CACHE=1 /usr/bin/uv pip check --python /code/.venv/bin/python
# Runtime transport/crypto fixes, independently checked with native fictional data.
# These constraints do not migrate Flask, Jinja, Werkzeug or SQLAlchemy.
COPY security/runtime-requirements.txt /tmp/utilibre-runtime-requirements.txt
COPY security/runtime-build-constraints.txt /tmp/utilibre-runtime-build-constraints.txt
COPY security/apply-runtime-pins.py /tmp/utilibre-apply-runtime-pins.py
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --require-hashes \
      --build-constraint /tmp/utilibre-runtime-build-constraints.txt -r /tmp/utilibre-runtime-requirements.txt \
 && python /tmp/utilibre-apply-runtime-pins.py \
 && UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --build-constraint /tmp/utilibre-build-constraints.txt /code \
 && UV_NO_CACHE=1 /usr/bin/uv pip check --python /code/.venv/bin/python
USER 1000:1000
