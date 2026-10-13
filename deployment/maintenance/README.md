# Security maintenance procedures

The directories here group native repairs by affected component or advisory.
Their names record the release history; a `-final` or `-followup` suffix does
not mean that the files are unused. Release scripts and source recipes can be
shared by several running applications. Keep their paths stable for systemd,
review scripts, source archives and rollback records.

Start with the current [work queue](../../docs/work-queue.md) and
[update procedure](../../docs/updates.md). Each repair directory's README
describes its exact version, native checks, release receipts and rollback.
The daily scanner is `security-review.mjs`; the upstream review is
`../../scripts/review-upstream-maintenance.mjs`. A scanner finding remains open
until its exact running payload has a reviewed disposition. Keep earlier
receipts as dated evidence even after a newer release replaces the image.

For a new upstream release, check whether it contains the local repair, repeat
the relevant native and application checks, and retire a patch only after the
replacement passes. See [source adaptations](../../docs/source-patches.md).
