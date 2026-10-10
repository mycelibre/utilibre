# Native app only, built from the pinned source plus source.patch by build.sh.
# Retain the inspected upstream runtime; do not replace any live LRCLIB service.
FROM ghcr.io/rramiachraf/dumb@sha256:de231df0313999b834b5ccc7cf0b5d426fc6b42bfdd984f7f7c322b3d9db3907
COPY --chown=65532:65532 dumb /dumb
USER 65532:65532
ENV GOMEMLIMIT=160MiB
CMD ["/dumb"]
