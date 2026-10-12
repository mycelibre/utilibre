/* Benign native compatibility check. No remote connections or allocation-failure injection. */
#define LDAP_DEPRECATED 1
#include <stdio.h>
#include <ldap.h>
#include <lber.h>
#include <ldif.h>
#include <stdlib.h>
#include <string.h>
#define REQUIRE(x) do { if(!(x)){fprintf(stderr,"Native check failed at line %d\n",__LINE__);return 1;} } while(0)
int main(void) {
  const char *urls[]={"ldap://localhost:1389/dc=example,dc=invalid?cn?sub?(objectClass=*)", "ldaps://localhost:1636/", "ldap://[::1]:1389/", "ldapi://%2Ftmp%2Ffictional-ldap.sock"};
  const char *endpoints[]={"ldap://localhost:1389", "ldaps://localhost:1636", "ldap://[::1]:1389", "ldapi://%2Ftmp%2Ffictional-ldap.sock"};
  for(unsigned i=0;i<4;i++) {
    LDAPURLDesc *u=NULL; REQUIRE(ldap_url_parse(urls[i],&u)==LDAP_URL_SUCCESS); REQUIRE(u&&u->lud_scheme); ldap_free_urldesc(u);
    LDAP *ld=NULL; REQUIRE(ldap_initialize(&ld,endpoints[i])==LDAP_SUCCESS); int version=LDAP_VERSION3; REQUIRE(ldap_set_option(ld,LDAP_OPT_PROTOCOL_VERSION,&version)==LDAP_OPT_SUCCESS); REQUIRE(ldap_unbind_ext_s(ld,NULL,NULL)==LDAP_SUCCESS);
  }
  LDAPURLDesc *bad=NULL; REQUIRE(ldap_url_parse("https://example.invalid/",&bad)!=LDAP_URL_SUCCESS);
  /* ldap_init exercises the changed parsehosts path without opening a socket. */
  LDAP *ld=ldap_init("[::1]:1389 localhost:1389",1389); REQUIRE(ld);
  char *uri=NULL; REQUIRE(ldap_get_option(ld,LDAP_OPT_URI,&uri)==LDAP_OPT_SUCCESS); REQUIRE(uri&&strstr(uri,"::1")&&strstr(uri,"localhost")); ldap_memfree(uri);
  char *tls=NULL; REQUIRE(ldap_get_option(ld,LDAP_OPT_X_TLS_PACKAGE,&tls)==LDAP_OPT_SUCCESS); REQUIRE(tls&&strcmp(tls,"GnuTLS")==0); ldap_memfree(tls);
  REQUIRE(ldap_unbind_ext_s(ld,NULL,NULL)==LDAP_SUCCESS);
  BerElement *encoded=ber_alloc_t(LBER_USE_DER); REQUIRE(encoded); REQUIRE(ber_printf(encoded,"{is}",42,"fictional sample")!=-1);
  struct berval *flat=NULL; REQUIRE(ber_flatten(encoded,&flat)==0); REQUIRE(flat&&flat->bv_len>0);
  BerElement *decoded=ber_init(flat); REQUIRE(decoded); ber_int_t number=0; char *value=NULL; REQUIRE(ber_scanf(decoded,"{ia}",&number,&value)!=LBER_ERROR); REQUIRE(number==42&&strcmp(value,"fictional sample")==0);
  ber_memfree(value); ber_free(decoded,1); ber_bvfree(flat); ber_free(encoded,1);
  FILE *f=fopen("/tmp/utilibre-fictional.ldif","w"); REQUIRE(f); REQUIRE(fputs("dn: dc=example,dc=invalid\nobjectClass: domain\ndc: example\n",f)>0); REQUIRE(fclose(f)==0);
  f=ldif_open_url("file:///tmp/utilibre-fictional.ldif"); REQUIRE(f); char line[128]; REQUIRE(fgets(line,sizeof(line),f)&&strcmp(line,"dn: dc=example,dc=invalid\n")==0); REQUIRE(fclose(f)==0); REQUIRE(remove("/tmp/utilibre-fictional.ldif")==0);
  puts("OPENLDAP_NATIVE_URL_IPV6_OPTIONS_GNUTLS_BER_LDIF_PASSED"); return 0;
}
