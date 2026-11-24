FROM python:3.14-alpine3.24@sha256:bc62fbcb684904b1bb81a6240041bb60e9c1ee19ddeaf17a6b4297e1cc9c95d2
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOME=/tmp
WORKDIR /app
COPY os-packages /build/os-packages
RUN apk add --repositories-file /dev/null --no-network \
    /build/os-packages/libcrypto3-3.5.9-r1.apk \
    /build/os-packages/libssl3-3.5.9-r1.apk \
    /build/os-packages/zlib-1.4-r0.apk
COPY wheels /build/wheels
COPY requirements.lock /build/requirements.lock
RUN pip install --no-index --find-links=/build/wheels --require-hashes -r /build/requirements.lock \
    && pip install --no-index --no-deps /build/wheels/freetar-0.22.0-*.whl \
    && pip check \
    && rm -rf /build /usr/local/lib/python3.14/site-packages/pip* /usr/local/bin/pip*
COPY wsgi.py /app/wsgi.py
USER 65532:65532
EXPOSE 22000
CMD ["python", "/app/wsgi.py"]
