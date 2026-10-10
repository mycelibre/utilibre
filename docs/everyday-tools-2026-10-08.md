# Everyday-tool queue — verified reuse, 8 October 2026

The portal's existing guide registry now includes seven EN/ES guides (Spanish voseo), using installed applications and their native controls. No new service, authentication layer, export backend, tracking or custom converter was added.

| Queued capability | Native implementation and verification |
| --- | --- |
| Password / word phrase | IT Tools `/token-generator` and `/bip39-generator`. The token generator and OmniTools counterpart needed the separately documented WebCrypto security correction. Native output lengths, regeneration and WebCrypto calls passed. The already-secure BIP39/nanoid path produced fresh 12-word phrases; no phrase is retained. |
| Markdown → HTML / PDF | IT Tools `/markdown-to-html` and BentoPDF `/markdown-to-pdf.html`. Fictional Markdown produced expected HTML. BentoPDF Export PDF invokes browser printing; Chromium's printed PDF reopened with PDF.js and retained expected text. OS print-dialog destination selection was not automated. |
| Share syntax-highlighted code | PrivateBin Source Code format. A five-minute fictional paste was created, opened/decrypted in a separate browser and deleted natively. No second unencrypted paste service is needed for this workflow. |
| Standalone EXIF inspection | Image Scrubber's native pre-edit inspection screen displayed the fictional Artist tag. No export or modification is needed just to inspect. CyberChef Extract EXIF was also tested and is blocked by its existing strict CSP; it is not promoted and CSP is preserved. |
| File type / hash and verify | Two native CyberChef recipe links, containing only operation settings. The file picker recognized the fictional JPEG signature; SHA-256 matched an independent Node hash of exactly the same bytes. No malware or authenticity claim follows from that result. |
| Inspect an Outlook link destination | IT Tools `/safelink-decoder`. The bilingual guide uses native labels and a fictional `.invalid` destination. The live browser check preserved the embedded query and fragment without requesting the wrapper or destination or putting input in the application URL. This extracts an encoded destination; it neither follows redirects nor removes tracking, creates short links or checks destination safety. |
| Basic folded booklet | BentoPDF `/pdf-booklet.html`; eight numbered fictional pages exported as four sides ordered 8/1, 2/7, 6/3, 4/5 on Letter and A4. Native EN/ES guide and deterministic sample included. No file uploads or outside requests observed. Use No rotation: the clockwise option was not applied to the exported PDF. Digital imposition was checked; physical printing/folding was not. Advanced multi-signature binding remains separate. |

Implementation: `portal/src/pages/everyday-guide-data.ts`, imported by the existing `practical-guide-data.ts`. Existing routing, localized guide index and sitemap generation consume the registry automatically. Guides explain what the check means, what it omits, browser/download retention and shared-content implications. Browser checks are `deployment/toolbox/check-everyday-guides.mjs` and `check-password-generators.mjs`; private test results are `/opt/utilibre/reports/content-review-20261008/everyday-guides/result.json`. The synthetic paste was deleted and its private cleanup receipt removed.

The decoder was checked separately in a disposable browser session with the
native input `https://fixture.safelinks.protection.outlook.com.invalid/?url=https%3A%2F%2Fexample.invalid%2F%3Fitem%3D42%23part&data=fictional`.
Its exact output was `https://example.invalid/?item=42#part`; request capture
contained no `.invalid` requests and the app URL remained `/safelink-decoder`
with no query or fragment. Both fictitious hostnames intentionally use `.invalid`.
The installed source's substring wrapper check accepts that fixture; this is
explicitly not an authenticity check. No destination was opened or server
record created. The new guide routes are `/en/guides/outlook-link-destination`
and `/es/guias/destino-enlace-outlook`.

The booklet check, source pin, exact native labels and advanced Bookbinder comparison are recorded in `booklet-workflow-2026-10-08.md`; browser verification is `deployment/toolbox/check-booklet.mjs`.

The whole-registry practical-guide test has an explicit 60-second total budget
because it visits every guide in both languages. This changes the test's
aggregate fixture budget; per-navigation assertion timeouts and product
response expectations remain unchanged.

## Email aliases / temporary email remains a distinct project

Current inspected application configuration uses the existing separate SMTP service for application mail. Acceptance of an operator recipient and application recovery delivery do not establish an alias-management service, reply masking, disposable mailboxes or retention for forwarded mail. No aliasing application is installed on this application VM. No mail-server administration or DNS-management access was found here; the existing identity configuration refers to a separate mail host. Do not change the root domain's MX records or install a second mail relay just to make a catalog card available.

The [official addy.io self-hosting procedure](https://addy.io/self-hosting/) requires mail routing, reachable SMTP, DNS/MX and reverse-DNS setup, plus its web application, data store and mail-processing configuration. The [official SimpleLogin procedure](https://github.com/simple-login/app/blob/master/README.md) likewise integrates an application/database with Postfix and domain DNS, including signing/sender policy. These are operational mail services, not static browser tools.

Before choosing one, confirm a dedicated alias domain or subdomain; administrative control of its DNS and the existing mail server; inbound/outbound SMTP and reverse DNS; how recipient verification, forwarding and masked replies integrate with the existing MTA; abuse/rate limits and bounce handling; actual mail-content/log/queue/backup retention; and ownership of recovery and key backups. Check deliverability only with authorized operator-controlled senders/recipients. Invite-only aliasing is a narrower candidate than anonymous disposable inbox hosting, but remains a proposal, not a deployed feature. No messages or DNS changes were made for this assessment.

General URL shortening, redirect following and dedicated tracking-parameter cleaning remain separate queue items. They were not marked complete by the narrower Outlook wrapper decoder guide. See `service-expansion.md` for the installed native-function review, including DeGoog's internal search-result cleanup and its limits. A new shortener would add hosted mutable state and an abuse-sensitive redirect surface; a network expander would fetch untrusted destinations. No such service or fetch was added.
