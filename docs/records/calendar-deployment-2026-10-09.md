# Calendar and contacts, 9 October 2026

Calino 0.39.1-p1 (MIT, `20a41e0d7b498e607cf8a5011bb8b14f506eaf79`) is the static browser interface at https://calendar.utilibre.org. Radicale 3.8.3 (GPL-3.0-or-later, `d2ca557a6270b6a3a510572372f794df27cb9b89`) stores CalDAV and CardDAV collections behind `/dav/`. Its native collection interface is `/dav/.web/`. These are one calendar deployment, with no external convenience proxy or new identity system.

## Access and data

Radicale uses native bcrypt htpasswd accounts and owner-only collection rights. An invited calendar account is separate from Utilibre OpenID: CalDAV/CardDAV clients need its username and password. The operator provisions and revokes it in `/opt/utilibre/calendar-private/users`; never commit that file. There is no public registration or account-recovery email workflow. Do not reuse an identity password. Revoking the calendar credential prevents later server requests; it cannot erase copies already synchronized to devices.

The server stores readable events, tasks and contacts in its filesystem. HTTPS protects transport through Cloudflare and Caddy; neither HTTPS nor this deployment provides end-to-end encryption. Calino keeps local calendar/contact data and saved credentials in the browser after tab closure. This release's ordinary saved-credential protection is reversible obfuscation with an application key, not strong encryption. Use a trusted device and a dedicated calendar password. Its native device reset removes browser data, not server collections. Downloads persist until deleted.

Application assets and fonts are local. Browser AI registration/settings were removed through a small source patch. No analytics, runtime writing API or visitor profiling was added. Browser CSP permits same-origin network requests; opening a map or another external link intentionally leaves the site. Native external services that cannot work within that policy must not be described as supported. Service workers are disabled in this build. The application runs on its own origin, so clearing its browser data does not clear other Utilibre tools.

Calino has a local-only mode, but this hosted calendar workflow sends synchronized records to Radicale. Use SERVER and LOCAL explanations together rather than claiming that all calendar data stays on the device.

## Exports and deletion

For the browser workflow, connect to `https://calendar.utilibre.org/dav/`, open Contacts and wait for synchronization before exporting contacts. Settings → Data → Export Calendar → Export .ics downloads loaded events for all or a selected calendar. Export .vcf downloads the loaded contacts. These client exports are not a promised complete historical server backup. Imported/recurring events, attachments, permissions, account settings and local preferences need their own scope checks. The performed check downloaded the fictional event and contact, not every possible event type.

For an independent full collection copy, use Radicale's native web collection interface and its calendar/address-book download. A collection GET also returns iCalendar or vCard. Compatible clients can import those formats; a fictional export was imported into another disposable Radicale collection and its content checked. This does not migrate passwords, ownership, application settings or external attachments. Protect downloaded records as plaintext personal data.

Calino's Delete Local Events removes the selected local working copy; synchronized records can return. Delete All Events From a Calendar removes the selected server calendar's events after confirmation. Radicale's native web interface can delete a collection. Account removal and collection deletion are separate operator actions: revoke the htpasswd entry, agree the exact collections, and use native collection deletion rather than erasing unrelated state. Shared or previously synchronized copies remain on recipients' devices. No real user records were deleted during verification.

## Limits and logs

Radicale: 1 CPU, 256 MiB, 20 concurrent connections, 30-second native timeout, 10 MiB request and 1 MiB resource limits. Calino gateway: 0.5 CPU, 128 MiB, 20 requests/second with burst80, 15-second body timeout. Both use read-only root filesystems, bounded temporary storage/processes and no added capabilities. These ceilings are not measured simultaneous-user capacity.

Radicale warning/error logging remains enabled with password masking; header/body debug logging is off. Gateway access logging is off. Container diagnostics rotate by size, two 5 MiB files per container, not a number of days. Edge/Cloudflare/provider retention remains separately unverified. Static application assets retain a seven-day browser cache; HTML is revalidated. Noindex is an indexing directive and does not secure a collection. Security discovery redirects to the portal's verified contact.

## Build and recovery

`deployment/calendar/Dockerfile.radicale` uses the hash-locked Python requirements. Build Calino from its exact checkout after applying `calino-browser-ai.patch`, using `Dockerfile.calino`; copy the built assets into `/opt/utilibre/calendar-static` while replacing index.html last. Preserve the existing bind-mounted directory inode. The patch also repairs native ICS export when an event carries a UTC timezone identifier: upstream timezone generation otherwise dereferenced an absent VTIMEZONE. The new native regression test passed in both configured timezones (38 tests total). Remove each patch part when upstream supplies the matching behavior and the recorded checks pass.

`backup.py` takes Radicale's native shared filesystem lock before archiving its state. Private configuration and bcrypt credentials are archived separately. `utilibre-calendar-backup.timer` runs daily around04:35UTC with up to five minutes of delay. Backups have no automatic expiry and remain on the same VM; they do not cover physical-server loss. Deleting active records does not alter prior backups.

The final fictional snapshot was extracted into a separate private directory. Twelve resource files matched their original bytes, and the pinned Radicale image passed native `--verify-storage` under `--network none`. Restore only into an empty isolated directory first, verify storage and native read access, then switch a stopped backend to the checked state. Preserve images/configuration for rollback. The test does not establish whole-host recovery time or physical-device synchronization.

## Verification

`check-browser.mjs` used only the disposable fixture account: public connection, displayed event, native ICS and VCF downloads, no JavaScript errors and no external HTTP requests passed. Earlier native editing changed a fictional event and confirmed persistence. Calino needed its contact list to finish synchronization before export.

`check-dav.py` used a normal Python client through the public HTTPS edge. Native collection creation, event/contact writes, collection export/import, anonymous401, cross-account403 and scoped deletion passed. Cloudflare previously rejected non-browser CalDAV with error1010; after the operator's edge change, the same client returned207 and completed these checks. No User-Agent spoofing was used. This checks CalDAV/CardDAV requests, not every Thunderbird, DAVx5 or phone workflow.

Private fictional reports: `/opt/utilibre/reports/new-services-20261009/calino-browser-result.json`, `calendar-public-dav-check.log`, `calendar-restore-result.json`. Credentials and exported personal-data formats remain outside the repository. Fixture cleanup revokes only the two known disposable accounts and removes only their verified fictional collections; backup evidence remains private.

Portal catalog, English/Spanish guide, data-management index and both native status probes were published on9October in portal apps4. Public search/mobile/no-JS/status checks passed. Source archive SHA256 `e64e13de44918e0bc4379c2ff91e0f80f739ffd596da3572204c70771ca58bd1`.
