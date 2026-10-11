FROM utilibre-linkding:1.47.0-python-security-20261011
USER root
COPY linkding-python-requirements.txt /tmp/utilibre-security-requirements.txt
RUN pip --python /etc/linkding/.venv/bin/python install --no-deps --only-binary=:all: --no-cache-dir --disable-pip-version-check --require-hashes -r /tmp/utilibre-security-requirements.txt \
 && pip --python /etc/linkding/.venv/bin/python check \
 && python -c 'import django,jwt,soupsieve,urllib3; assert (django.get_version(),jwt.__version__,soupsieve.__version__,urllib3.__version__)==("6.0.9","2.15.1","2.9","2.8.0")' \
 && rm /tmp/utilibre-security-requirements.txt
USER 33:33
