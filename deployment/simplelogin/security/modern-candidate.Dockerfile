# Investigation only. Native startup fails; never publish this candidate.
FROM utilibre-simplelogin:4.82.4-p4
USER root
COPY modern-candidate.requirements.txt /tmp/utilibre-candidate-requirements.txt
RUN UV_NO_CACHE=1 /usr/bin/uv pip install --python /code/.venv/bin/python --upgrade -r /tmp/utilibre-candidate-requirements.txt
USER 1000:1000
