# Private reports and service expectations — updated 9 November 2026

This is an internal operating procedure, not a certification of legal compliance.
Public reporting instructions are at <https://utilibre.org/en/abuse> and
<https://utilibre.org/es/denunciar-abuso>; the acceptable-use and security pages
retain the detailed policies. Spanish
uses voseo. Do not publish report correspondence, private identifiers, keys,
residential addresses or unresolved legal drafting in this repository.

## Intake and access

Use the existing admin@utilibre.org mailbox; it requires no GitHub account.
The configured internal SMTP relay accepted this recipient on 8 October
(EHLO, MAIL FROM, RCPT TO, RSET; no message sent). Private vulnerability
reporting is enabled at https://github.com/mycelibre/utilibre/security/advisories/new .
GitHub is an external provider and requires an account. Do not use public issues
for reports containing vulnerabilities or private records.

The operator handles cases through the existing mailbox or private advisory.
The operator confirmed final-inbox receipt and monitoring on 8 October and
reported no explicit message or mail-backup retention settings. Provider defaults,
delegated access and actual backup deletion were not inspected from this VM.
Do not infer unlimited retention or promise a fixed deletion period/sole-person
access. Those dependent guarantees remain unpublished.

The reporting page uses a visible address and a subject-only `mailto:` link.
It does not fill in the current URL, query, fragment, browser history or page
contents. A reporter sends the relevant Utilibre URL or item identifier and a
short description, with an optional different reply address. Email providers
receive the sender address and message; do not describe this as anonymous.
Do not ask reporters to download, attach or forward suspected material, private
files, passwords or decryption keys. Remove secret-bearing link fragments.

Use the existing mailbox rather than adding a public form endpoint or third-party
CAPTCHA. Public email can still receive spam. Suggested operator setup: a private
label/folder for subjects containing “Utilibre abuse report” or “Denuncia de abuso
en Utilibre”, with ordinary spam filtering and manual checks of the spam folder.
Subject labels organize reports; they are not proof of authenticity or a reason
to ignore reports with other subjects. Do not enable an automatic reply,
forwarding rule, attachment collection or automatic removal based on this page.
This change configures none of those mailbox actions. Replies and case decisions
remain manual; there is no response-time guarantee.

## Notice coverage and release checks

The portal provides a report action in its footer and alongside catalog entries
for services that expose visitor-created content or shared sessions. Both report
pages render without JavaScript, and their report links suppress the referrer.
The existing Opengist footer already points to `/en/abuse`; the portal route makes
that destination usable without an Opengist configuration change.

The November notice candidates cover Chhoto's root page, Yopass's native footer,
PrivateBin's home and paste footer, WBO's home footer and persistent board controls,
Pollaris's common page template, and CryptPad's home footer and editor About menu.
The isolated native template recipe is `deployment/abuse-reporting/prepare-native.py`.
It snapshots public code from the selected installed image, records before/after
hashes and writes an overlay in a separate staging directory. It does not deploy,
read submitted content or modify mounted runtime files. Use release evidence to
distinguish a prepared candidate from a verified live notice. Check template and
browser caches after release, especially Pollaris's persistent Twig cache and
CryptPad's versioned assets.

CryptPad's two reviewed source notices are live: the public home footer and the
native About renderer both show English and Spanish reporting links. Production
checks used the actual versioned assets, whose hashes match the approved patches;
the scoped native restart refreshed the public asset version. Gathio's reviewed
native navigation entry is also live with the explicit bilingual reporting label.
Rallly's five-link footer is live and verified on its native public login layout.
Its supported error query suppresses automatic OIDC initiation during the browser
check; a browser-only request guard also prevents non-GET/HEAD requests. The final
check had no attempted writes, external requests or browser errors. No service
authentication setting changed. The three scoped releases retained the existing
images and runtime configuration; only the reviewed source files or settings and
their native reloads changed. Private before/after receipts and source backups are
under the maintenance run's `abuse-reporting/customization-release.json` and its
per-service evidence directories.

LiberaForms' general footer (including its minimal navigation variant) and native
shared-form footer are live with English and Spanish reporting links. Fictional
native template renders cover all three variants in both document languages;
production checks verify the public home and installed template hashes without
opening a submitted form. The image changes only those two templates. Its public
source archive includes the matching maintained build recipe, whose replay
reproduces the tested templates. The existing database and web containers stayed
in place; no database migration was run. The receipt is in the same maintenance
evidence directory at `late/forms-release.json`.

Catalog coverage does not establish a native notice inside every application.
Rustpad, ByteStash and other shared-document interfaces still
need their own native-surface checks before claiming complete service coverage.
Do not add scripts that inspect shared content or automatically transmit its URL
to make a report button work. Reporting notices add no analytics or third-party
resources; they are ordinary links to the central instructions.

Native-hook inventory and reviewed deployment status on 9 November:

| Service | Existing route or supported hook | Remaining work |
| --- | --- | --- |
| Opengist | `custom.static-links` already includes “Report abuse / Denunciá abusos” pointing to `/en/abuse`. | The new portal route fixes its destination. Keep the native setting. |
| Gathio | Native `static_pages` now contains “Report abuse / Denunciá abusos” pointing to `/en/abuse`. `general.email` remains the existing operator mailbox. | Live and checked in the public navigation at desktop and mobile widths. Only this navigation entry changed; the approved patch records exact before/after hashes. |
| Rallly | Native `footer_links` has five entries: both home links, source, bilingual privacy and bilingual reporting. | Live and checked at desktop and mobile widths. Privacy and reporting destination pages have visible language switches. The exact footer compare-and-update transaction preserved all other instance settings; the historical footer script recognizes the approved schema without writing. |
| LiberaForms | Its maintained general and shared-form footer templates now contain EN/ES report links alongside existing credits. | Live. Native template fixtures and the public home passed desktop/mobile checks; matching source remains available through the existing AGPL source link. No submitted form was opened as a test. |
| PairDrop | Supported `CUSTOM_BUTTON_*` settings provide one custom action, currently the Utilibre return link. | Reusing it for reporting needs an explicit choice about preserving return navigation; there is no second custom-action slot established by this review. |
| Rustpad | A prepared `Footer.tsx` candidate retains both home and data-note links, adds EN/ES reporting and wraps at narrow widths. | Prepared and tested; **not deployed**. Typechecking, production build and 1440/390 browser fixtures pass. The candidate preserves the native backend bytes and runtime configuration. Recreating Rustpad discards active in-memory pads, so its current runtime remains untouched. |
| ByteStash and Penpot | No operator-report link or suitable extra-link setting was established in the inspected native configuration. | Keep portal reporting available and inspect their shared-view surfaces before choosing a source adaptation. An upstream support link is not a report to this operator. |

PrivateBin's canonical updater regenerates its template from
`deployment/utilibre/privatebin-discovery/homepage-template.patch`. The report
notice is included in that maintained patch and its pinned policy hash; it is
not only an image overlay. Replaying the recorded, verified 2.1.1 source produces
the exact tested notice template. `deployment/abuse-reporting/inputs.json` also
records exact before/after template and patch hashes for the native overlays;
unknown source bytes stop preparation rather than receiving a guessed patch.
The separate `native-hooks.json` records Gathio's exact configuration hashes and
Rallly's exact before/after footer values. `prepare-hooks.py` validates those
current settings and writes reviewable candidates only; it does not update
live configuration or the Rallly database.
The finite `release-customizations.mjs` helper uses the existing exclusive release
lock, exact source/setting preconditions and scoped rollback gates to activate the
reviewed CryptPad, Gathio and Rallly changes. Browser checks use actual deployed
assets, with no response replacement, account creation or shared-content access.
The additional Forms/Rustpad source and patch hashes are recorded in
`late-inputs.json`; `prepare-late.py` accepts only the approved before/after
source bytes. Their maintained builders are `liberaforms-privacy.py` and
`deployment/rustpad/apply-patches.py`. Prepared Rustpad files and images do not
establish a live report link; the portal remains its available reporting route.

## Triage and record

Create one restricted case note alongside the existing private operations
records, or keep the same fields in the private mail thread. No new application
is needed. Fields: case identifier; received time; reporter's preferred contact;
service and minimal item identifier; allegation and evidence reference; immediate
risk; service classification and applicable duties; responsible operator;
action/reason/scope/time; acknowledgment and decision dates; notification or
redress route; follow-up and correspondence-retention review. Keep decryption
fragments, credentials and copied private contents out of the case summary.
Retain only information needed for handling the case under the verified mailbox
policy once established; do not invent a destruction deadline.

1. Acknowledge usable reports privately when a contact is provided. Do not reject
   an obvious problem merely because an informal report lacks formal fields.
2. Identify the service and item without opening secret-bearing links. Ask for
   the identifier without its decryption fragment when that suffices. Do not
   ask for passwords, API keys or decryption keys.
3. Verify the allegation and available controls. No automatic removal just
   because a complaint arrives. Preserve narrowly necessary private evidence;
   do not create a public archive of reported material.
4. Assess urgency and applicable law with qualified help where needed. Formal
   illegality notices and informal abuse reports are different inputs. Classify
   the service before assuming online-platform-specific obligations.
5. Use native item/account controls where warranted. Record reasons and scope;
   notify the reporter and affected user where applicable and feasible without
   revealing another person's data. Include a way to request reconsideration.
6. Escalate incidents involving active compromise through the security process.
   Restrict only the affected item/source/service when justified. Never treat
   receipt of a rights-holder assertion as proof or an unconditional shutdown
   instruction. Restore access when review finds an error.

## Service-specific action limits

- PrivateBin: retain only the paste ID, not the full decryption/deletion link.
  The creator's native deletion link and configured expiry operate on ciphertext;
  ordinary decryption needs the key and any selected password. Backups are separate.
- Yopass: the one-time retrieval or expiry removes active ciphertext access.
  Native deletion is identifier-based; confirm the exact item before acting.
- PairDrop: encrypted WebRTC transfers can use a direct connection or the
  configured Utilibre TURN relay. WebSocket file fallback is disabled in
  `deployment/community/compose.yaml`; consult the current RTC/TURN configuration
  and transfer checks for the available relay modes. Neither signaling nor relay
  operation provides an operator file-deletion workflow. Do not claim to erase
  an in-flight transmission or copies already held by recipients. Network-abuse
  controls are separate from recipient copies.
- hat.sh: local browser file encryption/decryption. Utilibre has no uploaded
  file identifier or server copy to remove. Never promise operator deletion.
- ntfy: messages are readable by the service, topics unrestricted, cache in RAM
  with one-hour expiry. Attachments and external push relays are not configured.
  A restart would affect all subscribers and is not an item-deletion procedure.
- Proxied public content: inspect the relevant bounded cache and source controls.
  Do not remove useful caching wholesale or promise deletion at the source.
- Accounts/shared documents: distinguish suspension, removal from one drive,
  ownership deletion, collaborator access and recipient copies. Use the native
  service's permissions; do not erase other users' records as a test.

## Acknowledgment templates

EN: We received your report about [service/item reference] on [date]. We will
review it and may ask for more information. Receipt does not itself establish
that the content is unlawful or require automatic removal. Please do not send
passwords, API keys, decryption keys or unnecessary personal information.

ES: Recibimos tu informe sobre [servicio/referencia] el [fecha]. Vamos a revisarlo
y podemos pedirte más información. Recibirlo no demuestra por sí solo que el
contenido sea ilegal ni exige retirarlo automáticamente. No enviés contraseñas,
claves de API, claves de descifrado ni datos personales innecesarios.

## Decision templates

EN: We reviewed [minimal reference]. Our decision is [action/no action], applying
to [scope/duration], because [specific factual and rule/legal basis]. [State
whether automation contributed, if applicable.] You can request reconsideration
by replying with relevant information. [Add applicable complaint/redress options
and any legally required statement of reasons.] We cannot retract copies held
by recipients or promise immediate removal from existing backups.

ES: Revisamos [referencia mínima]. Decidimos [medida/sin medida], con alcance
[alcance/duración], por [hechos y fundamento normativo o legal concretos].
[Indicá si intervino un proceso automatizado, cuando corresponda.] Podés pedir
que reconsideremos la decisión respondiendo con información pertinente.
[Agregá los recursos aplicables y la motivación exigida legalmente.] No podemos
retirar copias de destinatarios ni prometer borrado inmediato de respaldos existentes.

These templates are internal; fill and review them privately for each case.
Do not publish bracketed fields as policy or send them automatically.

## Unresolved legal facts and review

Confirm the actual operator, country of establishment, service model, and relevant
audience. Hetzner infrastructure in Germany does not by itself establish the
operator in Germany or prove a § 5 DDG obligation. Assess provider-identification
requirements separately from GDPR controller/representative duties and applicable
DSA contact/representative duties. Complete required notices with verified information.

Guatemala is the current working understanding from the operator's addendum,
not a verified legal identity or published address. No entity, residence,
representative, choice of law or provider-identification notice is invented.
A working abuse contact does not depend on first publishing an Impressum.
No assertion of automatic German establishment, DSA Article 16 certification,
or guaranteed enforceability of a liability clause was found in the repository
copy reviewed for this change; those supplied draft assertions are rejected.

Legal/process review must account for DSA Article 16's identification exceptions
(including notices about offences under Articles 3–7 of Directive 2011/93/EU),
acknowledgment when contact information is available, decisions and redress
information, and applicable Article 17 reasons to affected recipients. Applicability
and service classification remain questions, not a blanket finding that every
local tool or relay is an online platform. Primary text:
https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng .

The public good-faith research commitment is limited to Utilibre-controlled
systems and actions, accepts deployment-relevant upstream vulnerabilities, and
does not authorize third-party testing or grant immunity from other parties.
Specific hosting-contract restrictions have not been independently reviewed;
no broader promise or new legal exemption is published.
