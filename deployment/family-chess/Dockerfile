FROM python:3.13-slim@sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=utilibre_settings
WORKDIR /app
COPY utilibre/requirements.lock /tmp/requirements.lock
RUN pip install --no-cache-dir --require-hashes -r /tmp/requirements.lock
COPY . /app
COPY utilibre/settings.py /app/utilibre_settings.py
RUN mkdir -p /app/logs /data && chown -R 10001:10001 /data && \
    SECRET_KEY=fictional-build-only python manage.py collectstatic --noinput
USER 10001:10001
EXPOSE 8000
CMD ["gunicorn", "family_chess.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--worker-class", "gthread", "--threads", "12", "--timeout", "660", "--graceful-timeout", "30", "--worker-tmp-dir", "/tmp", "--control-socket", "/tmp/gunicorn.ctl", "--log-level", "warning"]
