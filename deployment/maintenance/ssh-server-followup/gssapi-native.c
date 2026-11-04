/* Native state regression: includes the actual Debian implementation. Synthetic
 * mechanism callbacks isolate authorization/storage; GSS buffer cleanup uses
 * the installed Kerberos library. Real Kerberos/PAM is a separate protocol test.
 */
#include "includes.h"
#include "gss-serv.c"
#include <assert.h>
#include <stdio.h>

ServerOptions options;
static int stored, allowed;
static void fixture_store(ssh_gssapi_client *client) { assert(client->mech); stored++; }
static int fixture_user(ssh_gssapi_client *client, char *user) {
 assert(client->exportedname.length); assert(strcmp(user,"fictional")==0); return allowed;
}
static ssh_gssapi_mech mechanism = { .userok=fixture_user, .storecreds=fixture_store };
void sshlog(const char *file, const char *function, int line, int show,
 LogLevel level, const char *suffix, const char *format, ...) { }
static void setup(void) {
 memset(&gssapi_client,0,sizeof(gssapi_client));
 gssapi_client.mech=&mechanism;
 gssapi_client.exportedname.value=strdup("fictional");gssapi_client.exportedname.length=9;
 gssapi_client.displayname.value=strdup("fictional");gssapi_client.displayname.length=9;
 stored=0;allowed=1;
}
int main(void) {
 struct passwd owner={.pw_name="fictional"};
 options.gss_deleg_creds=1;setup();
 ssh_gssapi_storecreds();
 assert(stored==(FIXED?0:1)); /* Baseline exports despite no authorization. */
 assert(ssh_gssapi_userok("fictional",&owner,0)==1);
 assert(gssapi_client.store.owner==&owner);
 stored=0;ssh_gssapi_storecreds();assert(stored==1);
 options.gss_deleg_creds=0;ssh_gssapi_storecreds();assert(stored==1);
 options.gss_deleg_creds=1;allowed=0;
 assert(ssh_gssapi_userok("fictional",&owner,0)==0);
 assert(!gssapi_client.exportedname.value&&!gssapi_client.displayname.value&&!gssapi_client.store.owner);
 stored=0;ssh_gssapi_storecreds();assert(stored==0);
#if FIXED
 setup();ssh_gssapi_cleanup_global_client();
 assert(!gssapi_client.exportedname.value&&!gssapi_client.displayname.value&&!gssapi_client.mech);
 assert(!gssapi_client.userok&&!gssapi_client.store.owner);
 ssh_gssapi_cleanup_global_client(); /* Idempotent even after a partial attempt. */
 ssh_gssapi_storecreds();assert(stored==0);
#endif
 printf("{\"passed\":true,\"fixed\":%s,\"unauthorizedStoreBlocked\":%s,\"legitimateStore\":true,\"disabledDelegation\":true,\"failedAuthorizationClearsState\":true,\"explicitCleanupTested\":%s}\n",FIXED?"true":"false",FIXED?"true":"false",FIXED?"true":"false");
 return 0;
}
