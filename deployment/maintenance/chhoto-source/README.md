# Chhoto exact source-lock inventory

Upstream: https://github.com/SinTan1729/chhoto-url

Revision: `e18a8a0111e94be03145e95c30dcd7f41891633d` (Chhoto URL 7.8.3).
Original path: `backend/Cargo.lock`. Copyright (c) 2023–2026 Sayantan Santra;
MIT license, reproduced in `LICENSE`. Dependency licenses are separate.

The unmodified lock hashes to
`a9a1cef499e5e8edc56efb445210189b4ed664359f369fffcec76e35ab2e0f0d`.
It matches the immutable Git object and the source selected by
`../../chhoto/build.py`; the recorded source patches do not alter this lock.

This tracked manifest makes the existing scheduled Trivy source-lock scan cover
Chhoto. It is evidence of locked build inputs, **not a fabricated runtime package
database or proof of every dependency compiled into the live binary**. The final
image is scratch, and compiled dependency inventory remains incomplete. The
scanner's current source-only mode does not select features or distinguish all
optional/test dependencies. See [the inventory review](../rust-inventory-20261011.md).

When changing the Chhoto source revision, refresh this exact upstream file, its
hash, provenance and native dependency review alongside the application recipe.
Do not edit the copy to hide advisory findings. Do not rebuild/restart the live
application merely to scan the lock.
