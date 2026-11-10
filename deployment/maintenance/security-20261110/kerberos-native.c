/* Ordinary Kerberos/GSS API compatibility; no malformed-message fixture. */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <krb5.h>
#include <gssapi/gssapi.h>
int main(void) {
 krb5_context ctx; krb5_principal p; char *name=NULL; krb5_ccache cache;
 krb5_keyblock key={0}; krb5_enc_data encrypted={0}; krb5_data plain={0}, decoded={0};
 krb5_checksum sum={0}; krb5_boolean valid=0; size_t length=0; int checks=0;
 OM_uint32 major,minor; gss_name_t gn=GSS_C_NO_NAME; gss_buffer_desc in,out=GSS_C_EMPTY_BUFFER;
 assert(krb5_init_context(&ctx)==0);checks++;
 assert(krb5_parse_name(ctx,"fictional@UTILIBRE.TEST",&p)==0);checks++;
 assert(krb5_unparse_name(ctx,p,&name)==0 && strcmp(name,"fictional@UTILIBRE.TEST")==0);checks++;
 krb5_free_unparsed_name(ctx,name);
 assert(krb5_cc_new_unique(ctx,"MEMORY",NULL,&cache)==0);checks++;
 assert(krb5_cc_initialize(ctx,cache,p)==0);checks++;
 krb5_principal saved;assert(krb5_cc_get_principal(ctx,cache,&saved)==0 && krb5_principal_compare(ctx,p,saved));checks++;
 krb5_free_principal(ctx,saved);assert(krb5_cc_destroy(ctx,cache)==0);checks++;
 assert(krb5_c_make_random_key(ctx,ENCTYPE_AES256_CTS_HMAC_SHA1_96,&key)==0);checks++;
 plain.data="Fictional local round trip";plain.length=strlen(plain.data);
 assert(krb5_c_encrypt_length(ctx,key.enctype,plain.length,&length)==0);checks++;
 char cipher[256],clear[256];assert(length<=sizeof(cipher));encrypted.ciphertext.data=cipher;encrypted.ciphertext.length=length;
 assert(krb5_c_encrypt(ctx,&key,42,NULL,&plain,&encrypted)==0);checks++;
 decoded.data=clear;decoded.length=sizeof(clear);
 assert(krb5_c_decrypt(ctx,&key,42,NULL,&encrypted,&decoded)==0 && decoded.length==plain.length && memcmp(clear,plain.data,plain.length)==0);checks++;
 assert(krb5_c_make_checksum(ctx,0,&key,42,&plain,&sum)==0);checks++;
 assert(krb5_c_verify_checksum(ctx,&key,42,&plain,&sum,&valid)==0 && valid);checks++;
 in.value="fictional@UTILIBRE.TEST";in.length=strlen(in.value);
 major=gss_import_name(&minor,&in,GSS_C_NT_USER_NAME,&gn);assert(major==GSS_S_COMPLETE);checks++;
 major=gss_display_name(&minor,gn,&out,NULL);assert(major==GSS_S_COMPLETE && out.length==in.length && memcmp(out.value,in.value,in.length)==0);checks++;
 gss_release_buffer(&minor,&out);gss_release_name(&minor,&gn);
 krb5_free_checksum_contents(ctx,&sum);krb5_free_keyblock_contents(ctx,&key);krb5_free_principal(ctx,p);krb5_free_context(ctx);
 printf("KERBEROS_NATIVE_PASSED checks=%d\n",checks);return 0;
}
