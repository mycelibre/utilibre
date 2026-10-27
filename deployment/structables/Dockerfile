FROM python:3.14-alpine3.24@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp
WORKDIR /app
COPY requirements.lock /build/requirements.lock
COPY wheels /build/wheels
RUN pip install --no-index --find-links=/build/wheels --no-cache-dir --require-hashes -r /build/requirements.lock && pip check \
    && rm -rf /build/wheels /usr/local/lib/python3.14/site-packages/pip* /usr/local/bin/pip*
COPY source /app/source
COPY safe_http.py /app/source/src/structables/safe_http.py
COPY wsgi.py /app/wsgi.py
ENV PYTHONPATH=/app/source/src
USER 65532:65532
CMD ["gunicorn", "--bind=0.0.0.0:8002", "--workers=2", "--threads=1", "--timeout=35", "--graceful-timeout=5", "--backlog=16", "--max-requests=200", "--max-requests-jitter=20", "--worker-tmp-dir=/tmp", "--access-logfile=/dev/null", "--error-logfile=/dev/null", "wsgi:app"]
