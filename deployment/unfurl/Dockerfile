FROM python@sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app HOME=/tmp
COPY requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir -r /tmp/requirements.lock && pip check
COPY source /app
COPY gunicorn.conf.py /app/gunicorn.conf.py
WORKDIR /app
USER 65532:65532
EXPOSE 5000
CMD ["gunicorn", "--config", "/app/gunicorn.conf.py", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "1", "--timeout", "15", "--graceful-timeout", "5", "--max-requests", "500", "--max-requests-jitter", "50", "--access-logfile", "/dev/null", "--error-logfile", "/dev/null", "--log-level", "critical", "unfurl.app:app"]
