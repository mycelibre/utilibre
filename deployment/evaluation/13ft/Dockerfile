FROM python:3.13-slim@sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.lock /build/requirements.lock
RUN pip install --no-cache-dir --requirement /build/requirements.lock
COPY source /upstream
COPY fixture.py /fixture.py
WORKDIR /upstream/app
USER 65534:65534
CMD ["gunicorn", "--bind=0.0.0.0:5000", "--workers=2", "--worker-class=sync", "--threads=1", "--timeout=12", "--graceful-timeout=2", "--backlog=8", "--max-requests=200", "--max-requests-jitter=20", "--error-logfile=-", "--log-level=critical", "--worker-tmp-dir=/tmp", "portable:app"]
