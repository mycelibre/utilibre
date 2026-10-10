# LiberaForms export formats, 9 October 2026

The installed 4.11.1-p5 browser export component passed CSV, JSON and PDF checks
with two fictional answers. The application image is
`sha256:1796ba695c368e3c439338d551fce576cb0afd9fc58de961dbcb233a4eb8766e`.
Reproduce with `node deployment/pack/check-forms-export-renderer.mjs`.

This is a component-level format check. The checker extracts the installed
static assets from a stopped, network-none container and gives the component
fictional data shaped like its table data after decryption. It does not log in,
read a production form, replace production encryption or test key access.
Earlier encrypted-answer, key-recovery and isolated server-restore tests remain
separate evidence.

Native CSV preserved both names, marked flags, timestamps, a comma, quotes and
a multiline answer when parsed again with Python's CSV reader. Native JSON
preserved the answer values, field labels, flags and ISO timestamps. The native
PDF download reopened using the existing local PDF.js viewer library; both
names, notes and displayed timestamps were readable. These exports omit a
complete form definition, sharing permissions, account settings and history.
They are not demonstrated full-form import archives.

No outside browser request or JavaScript error occurred. Temporary extracted
assets and the stopped fixture container were removed. Fictional downloads and
metadata remain privately under
`/opt/utilibre/reports/forms-renderer-VNgrSS/`.

Configuration review confirmed `ENABLE_UPLOADS=False`, remote storage disabled,
zero attachment size and zero upload allowances. The public EN/ES guide now
states that attachments are disabled here. Upstream's separate attachment
export does not establish that Utilibre offers attachments. No attachment test
or setting change was made, and backup retention is unchanged.
