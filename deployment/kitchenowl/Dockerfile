FROM tombursch/kitchenowl:v0.7.10@sha256:bd821a41b8cb27fd7fcf429acd1fc67e9f889485a2cd1193d68c2d804a8e1bef
# Supported Python dependency updates for current upstream advisories; no app feature changes.
RUN python -m ensurepip \
 && python -m pip install --no-cache-dir --upgrade \
    multidict==6.9.1 urllib3==2.8.0 PyJWT==2.15.0 cryptography==50.0.0 \
    Werkzeug==3.1.9 nltk==3.10.3 litellm==1.93.2 pip==26.2.1
