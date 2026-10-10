FROM python:3.13-slim@sha256:3dd7cc108ec1493442514f5c2a871af6af0ec31d768ff6e378a93340c3b3db5f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_NO_CACHE=1 UV_PYTHON_DOWNLOADS=never
WORKDIR /app
RUN pip install --no-cache-dir uv==0.9.2
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev --no-group fly --python /usr/local/bin/python
ENV PATH=/app/.venv/bin:$PATH
COPY beaverhabits ./beaverhabits
COPY statics ./statics
COPY healthcheck.py ./
RUN mkdir /app/.user && chown 1000:1000 /app/.user
USER 1000:1000
EXPOSE 8080
CMD ["gunicorn","beaverhabits.main:app","--bind","0.0.0.0:8080","-w","1","-k","uvicorn_worker.UvicornWorker","--max-requests","10000","--log-level","warning","--no-control-socket"]
