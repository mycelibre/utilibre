FROM python:3.14-alpine3.24@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp WIKIMORE_LANGSORT=es,en
WORKDIR /app
COPY os-packages /build/os-packages
RUN apk add --repositories-file /dev/null --no-network \
    /build/os-packages/libcrypto3-3.5.9-r1.apk \
    /build/os-packages/libssl3-3.5.9-r1.apk \
    /build/os-packages/zlib-1.4-r0.apk
COPY wheels /build/wheels
COPY requirements.lock /build/requirements.lock
RUN pip install --no-index --find-links=/build/wheels --require-hashes -r /build/requirements.lock \
    && pip install --no-index --no-deps /build/wheels/wikimore-0.1.27-*.whl \
    && pip check \
    && rm -rf /build /usr/local/lib/python3.14/site-packages/pip* /usr/local/bin/pip*
COPY media.py /usr/local/lib/python3.14/site-packages/wikimore/media.py
COPY leaflet /usr/local/lib/python3.14/site-packages/wikimore/static/vendor/leaflet-1.9.4
COPY wsgi.py /app/wsgi.py
USER 65532:65532
EXPOSE 8109
CMD ["gunicorn", "--bind=0.0.0.0:8109", "--workers=2", "--threads=1", "--timeout=35", "--backlog=16", "--worker-tmp-dir=/tmp", "--access-logfile=/dev/null", "--error-logfile=/dev/null", "wsgi:app"]
