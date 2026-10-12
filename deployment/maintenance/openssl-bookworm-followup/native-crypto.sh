#!/bin/sh
# Native OpenSSL CLI/providers, generated ephemeral keys and fictional content.
set -eu
TASK_TMP=$(mktemp -d /tmp/utilibre-openssl-native.XXXXXX)
trap 'rm -r "$TASK_TMP"' EXIT HUP INT TERM
printf '%s\n' 'fictional crypto fixture' > "$TASK_TMP/input"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$TASK_TMP/rsa.pem" 2>/dev/null
openssl pkey -in "$TASK_TMP/rsa.pem" -pubout -out "$TASK_TMP/rsa.pub" 2>/dev/null
openssl dgst -sha256 -sign "$TASK_TMP/rsa.pem" -out "$TASK_TMP/signature" "$TASK_TMP/input"
openssl dgst -sha256 -verify "$TASK_TMP/rsa.pub" -signature "$TASK_TMP/signature" "$TASK_TMP/input" | grep -q 'Verified OK'
printf '%s\n' altered > "$TASK_TMP/altered"
if openssl dgst -sha256 -verify "$TASK_TMP/rsa.pub" -signature "$TASK_TMP/signature" "$TASK_TMP/altered" >/dev/null 2>&1; then exit 1; fi
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$TASK_TMP/ec.pem" 2>/dev/null
openssl pkey -in "$TASK_TMP/ec.pem" -pubout -out "$TASK_TMP/ec.pub" 2>/dev/null
openssl dgst -sha256 -sign "$TASK_TMP/ec.pem" -out "$TASK_TMP/ec-signature" "$TASK_TMP/input"
openssl dgst -sha256 -verify "$TASK_TMP/ec.pub" -signature "$TASK_TMP/ec-signature" "$TASK_TMP/input" | grep -q 'Verified OK'
openssl enc -aes-256-cbc -pbkdf2 -iter 10000 -pass pass:fictional-only -in "$TASK_TMP/input" -out "$TASK_TMP/cipher"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 10000 -pass pass:fictional-only -in "$TASK_TMP/cipher" -out "$TASK_TMP/plain"
cmp "$TASK_TMP/input" "$TASK_TMP/plain"
test "$(openssl rand -hex 16 | wc -c)" -eq 33
openssl list -providers | grep -q default
openssl list -providers -provider legacy | grep -q legacy
printf '%s\n' OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED
