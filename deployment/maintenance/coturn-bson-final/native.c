/* Ordinary old-header BSON/driver consumer; never opens a network connection. */
#include <mongoc/mongoc.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(void) {
 mongoc_init();
 assert(strcmp(mongoc_get_version(),"1.30.4")==0);
 bson_t document=BSON_INITIALIZER,child;
 assert(BSON_APPEND_UTF8(&document,"label","Ficción — taller"));
 assert(BSON_APPEND_INT32(&document,"participants",12));
 assert(BSON_APPEND_DOCUMENT_BEGIN(&document,"settings",&child));
 assert(BSON_APPEND_BOOL(&child,"fictional",true));
 assert(bson_append_document_end(&document,&child));
 assert(bson_validate(&document,BSON_VALIDATE_UTF8,NULL));
 size_t length;char *json=bson_as_canonical_extended_json(&document,&length);assert(json&&length>0);
 bson_error_t error;bson_t *restored=bson_new_from_json((const uint8_t*)json,-1,&error);assert(restored);
 assert(bson_equal(&document,restored));bson_destroy(restored);bson_free(json);
 bson_iter_t it;assert(bson_iter_init_find(&it,&document,"participants"));assert(bson_iter_int32(&it)==12);
 mongoc_uri_t *uri=mongoc_uri_new_with_error("mongodb://fictional:example@127.0.0.1:27017/practice?authSource=admin&tls=true&connectTimeoutMS=500",&error);assert(uri);
 assert(mongoc_uri_get_tls(uri));assert(strcmp(mongoc_uri_get_database(uri),"practice")==0);assert(strcmp(mongoc_uri_get_auth_source(uri),"admin")==0);
 mongoc_client_t *client=mongoc_client_new_from_uri(uri);assert(client);
 mongoc_client_set_error_api(client,2);mongoc_client_destroy(client);mongoc_uri_destroy(uri);
 bson_destroy(&document);mongoc_cleanup();puts("Original-header BSON/JSON, UTF-8, typed data, TLS URI and offline client lifecycle passed.");return 0;
}
