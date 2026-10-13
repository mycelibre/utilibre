# Wishlist images and claims, 9 October 2026

The native checks use the installed 0.67.1-p2 image
`sha256:14e15c6b3a5ae4d93cf857427ad5d91354dca32cef1d8f15cffce4c8e8046309`.
Reproduce with `node deployment/wishlist/check-image-claims.mjs`.

The test creates two fictional local accounts, a group and a private list in a
fresh, bounded RAM filesystem. Its internal network has no outside route;
the browser reaches only a loopback relay. The explicit fixture subnet is checked
against existing Docker networks and host routes before creation. Production
OIDC, user data, uploaded files and mail are not accessed.

Passed native operations:

- Upload a fictional PNG through the item form. Its unsigned image URL is
  accessible without authentication even though the containing list is private.
- A second group member reserves the item, marks it purchased and removes the
  claim. The member cannot delete the owner's item (HTTP 401).
- Direct owner deletion removes both the item row and its uploaded image
  (the URL then returns 404).
- Deleting a group removes its item record but leaves that uploaded image
  accessible (HTTP 200). The public guide retains its separate image-removal
  warning and names this tested case. No existing uploads were removed.

The checker uses native HTTP actions and read-only SQL assertions against its
isolated database. It closes browser sessions and removes the container/network;
cleanup passed. No outside browser requests occurred. Evidence is
`/opt/utilibre/reports/wishlist-image-claims-8f5dc9d16e/result.json`.

This verifies neither an atomic database/files backup during concurrent writes
nor a bulk user export, which this release does not provide. Backup schedules
and retention remain unchanged.
