# Local secrets

This directory is ignored except for this file. Generate the stable Anubis
Ed25519 signing key with:

```sh
node scripts/init-secrets.mjs
```

The generator sets this directory to mode `0700` and the key file to mode
`0444`. Docker Compose bind-mounts local secrets without honoring a requested
container-only mode, so the files must be readable by the containers' non-root
users. The non-traversable directory keeps them inaccessible to other host
users. Verify the directory and all file modes before launch. Do not commit, copy into
documentation, or expose the files through the edge VM.
