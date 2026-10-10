FROM ghcr.io/itskovacs/trip@sha256:97525201a9bffcae86d4aa7468709317c84789bf9ad55b686bdae78605bad91c
COPY utilibre-wheels /tmp/utilibre-wheels
RUN python -m pip install --no-cache-dir --no-index --no-deps --require-hashes --find-links /tmp/utilibre-wheels -r /tmp/utilibre-wheels/requirements.txt && rm -rf /tmp/utilibre-wheels
COPY backend/trip /app/trip
COPY src/dist/trip/browser /app/frontend
USER 1000:1000
ENV PYTHONDONTWRITEBYTECODE=1
CMD ["uvicorn", "trip.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
