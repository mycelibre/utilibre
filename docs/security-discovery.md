# Security contact discovery — 8 October 2026

The live canonical file is https://utilibre.org/.well-known/security.txt . It
returns 200 with `text/plain; charset=utf-8`, names admin@utilibre.org and the
enabled GitHub private-advisory intake, links the live bilingual policy, and
expires 30 September 2027. The build rejects missing contacts, incorrect local
targets and expiry outside the 31–365 day renewal window. Review contact routing
as part of renewal; a valid date alone is insufficient.

Native gateway/static configuration now redirects both the well-known path and
legacy /security.txt to that file. Thirty-seven Nginx containers were tested and
reloaded without restarting their applications. FMD's native gateway includes
the same paths. The operator applied the reviewed Caddy snippet to fourteen
remaining native hosts; verification at 23:29 UTC confirmed every redirect.
Authentik's previously served, expired upstream notice is superseded on this
Utilibre host without modifying the upstream application.

Confirmed discovery hosts (55):

`4get.utilibre.org`, `audio.utilibre.org`, `auth.utilibre.org`, `biblioreads.utilibre.org`, `binternet.utilibre.org`, `bridge.utilibre.org`, `budget.utilibre.org`, `calc.utilibre.org`, `charts.utilibre.org`, `collab.utilibre.org`, `convert.utilibre.org`, `cv.utilibre.org`, `cyberchef.utilibre.org`, `degoog.utilibre.org`, `design.utilibre.org`, `dev.utilibre.org`, `draw.utilibre.org`, `drop.utilibre.org`, `fmd.utilibre.org`, `forms.utilibre.org`, `gothub.utilibre.org`, `gram.utilibre.org`, `hat.utilibre.org`, `lyrics.utilibre.org`, `maps.utilibre.org`, `meet.utilibre.org`, `mindmap.utilibre.org`, `notify.utilibre.org`, `overflow.utilibre.org`, `pad.utilibre.org`, `paint.utilibre.org`, `paste.utilibre.org`, `pdf.utilibre.org`, `plan.utilibre.org`, `poll.utilibre.org`, `pollaris.utilibre.org`, `python.utilibre.org`, `qr.utilibre.org`, `qrtools.utilibre.org`, `redlib.utilibre.org`, `rss.utilibre.org`, `sandbox-pad.utilibre.org`, `scrub.utilibre.org`, `search.utilibre.org`, `secret.utilibre.org`, `status.utilibre.org`, `svg.utilibre.org`, `tenor.utilibre.org`, `tools.utilibre.org`, `translate.utilibre.org`, `tumblr.utilibre.org`, `twitch.utilibre.org`, `wakapi.utilibre.org`, `whiteboard.utilibre.org`, `zip.utilibre.org`.

Most checks used public HTTPS. Search and Binternet were checked through the
actual Caddy edge over hostname-verified TLS because this VM cannot use their
public-address hairpin. This is not a new outside-network availability test.
The native Mumble listener has no HTTPS discovery route. TURN is a native
relay with a separate HTTP ACME endpoint; it is not an HTTP application.
The private Binternet onion gateway is deliberately not redirected to clearnet.
The policy describes operator-controlled scope; a root file alone never implied
automatic discovery on those other transports/hosts.

Public pages /en/security and /es/security describe the same scope in English
and Spanish voseo. The non-GitHub mailbox recipient is configured and SMTP
recipient acceptance was verified without sending a message. The operator
confirms inbox receipt and monitoring, with no explicit mail/backup expiry
settings. Provider defaults, delegated access and actual deletion remain
unverified; no fixed retention or exclusive-access promise is published. Private
advisory reporting was separately confirmed enabled through GitHub.

Evidence: root-only content-review-20261008/security-discovery-live.json and
security-discovery-edge.json, plus production browser checks. Configuration
reference: deployment/utilibre/edge/Caddyfile.security-contact. Do not import
that whole-host snippet into the root site, where it would redirect to itself.
