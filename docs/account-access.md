# Accounts and invitations — reviewed October 8, 2026

The existing portal's **Accounts & sign-in** view is the starting point. Each
available invited service has a visible request link beside its launch button.
The email draft names the application and asks whether the requester already
has a Utilibre account. The portal receives no application password and stores
no account requests. Approval remains manual and unrelated to donations.

| Service | Native access | What to tell a visitor |
| --- | --- | --- |
| CV / Reactive Resume, Penpot, Actual, Rallly, Wakapi | Approved Authentik account; app-specific Utilibre/OpenID button | Use an existing Utilibre account. Request access if it has not been approved. App/team/document permissions remain separate. |
| CryptPad | Its own native guest mode and self-registration | Create an account in CryptPad to retain ownership. It is separate from Utilibre login. Keep recovery information and exports. Current allowance: 25 MiB/account, 5 MiB/file. |
| LiberaForms | Native invited creator account and encryption keys | Request creator access; respondents use the published form link without an account. Back up the private encryption key separately from the account password. |
| Galene | Native moderator account; native expiring guest links | Request hosting access only to organize. Guests open the moderator's invitation directly. Four clients total, including the moderator. |
| FMD | Native registration token and device account | Request registration access, configure the Android app with this server, and retain FMD recovery credentials. The server's registration token is reusable, not a single-use Authentik invitation. |
| FreshRSS | Existing native accounts | Sign in; new account requests remain closed. |
| Mumble | Native client and shared access password | A browser/Utilibre account is not a voice client or the room password. |

For approved Utilibre accounts, the existing `deployment/identity/invite-user.py`
creates a native single-use invitation with a 48-hour expiry. It fixes the
approved username/email, requires email verification and an authenticator, and
grants no administrator role. **It sends email:** invoke only for a specifically
approved recipient. No invitations were sent during this review. The local
`check-invitation.py` test captures mail and rolls back its synthetic account;
it checks missing-token rejection, fixed identity, email verification, MFA,
non-admin membership and single use.

Use LiberaForms' own invitation controls and Galene's `/invite` controls rather
than sharing owner passwords. Galene's room guide covers `/unlock`, short guest
invitations, and disconnection when the last moderator leaves. FMD has a native
instance registration token; disclose it privately only to approved users and
plan rotation if it is disclosed. Do not claim per-recipient expiry that FMD's
current configuration does not provide.

Authentik password recovery requires verified email and the existing
authenticator. Lost-MFA cases need administrator review. LiberaForms and FMD
have separate credentials; password resets cannot reconstruct missing document
or device decryption keys. Signing out of Authentik does not necessarily end an
already-issued application session: sign out in each application too.

Portal checks cover visible request links, service-specific subjects, the
correct Galene room URL, closed FreshRSS registration, and English/Spanish
mobile/desktop rendering. They do not establish Android device recovery or
email-provider delivery to every recipient.

## Native additions, 9 October 2026

Donetick and Projects use the existing approved-account OIDC flow with separate application permissions. Donetick creates a separate circle per account; joining requires circle-administrator approval. Projects does not grant administrator rights to new accounts. Both have passed actual public HTTPS/OIDC account and isolation checks and are available through the portal; the separate application permissions remain.

Beaver uses its own operator-provisioned email/password accounts. Public registration, trusted-email bypass and email recovery are disabled; an existing Utilibre identity does not automatically create a Beaver account. Its guide explains native API-token revocation and account deletion. No custom registration or account-merging service was added.

Family Chess needs no account. Its game code allows access, and a vacant player seat can be claimed by anyone holding that code. Browser sessions identify occupied seats; this is not a private invitation or identity system. Actual public two-player/spectator, live-update and mobile checks passed; the portal launch is active.

TRIP additionally requires membership in its native service-specific identity group, alongside existing approval and verified-email checks. No real users have been admitted yet. Ordinary OIDC users receive no administrator role. The tested native administrator account-deletion flow must be paired with removing that service grant; deleting the app account alone would otherwise allow a new empty account at the next sign-in.
