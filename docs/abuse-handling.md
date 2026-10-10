# Private reports and service expectations — 8 October 2026

This is an internal operating procedure, not a certification of legal compliance.
Public EN/ES instructions are on the acceptable-use and security pages. Spanish
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
- PairDrop: this instance signals direct encrypted WebRTC transfers, with no
  TURN or WebSocket file fallback. There is no stored file to remove or recover.
  Network-abuse controls are separate from recipient copies.
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
