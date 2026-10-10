# Isolated candidate over the deployed, retained p5 baseline. This is not an
# approval for public use; the application framework still has unresolved CVEs.
FROM utilibre-simplelogin:4.82.4-p5
USER root
COPY compatible-leaves.txt /tmp/utilibre-compatible-leaves.txt
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --no-deps --require-hashes -r /tmp/utilibre-compatible-leaves.txt \
 && UV_NO_CACHE=1 /usr/bin/uv pip check --python /code/.venv/bin/python
USER 1000:1000
