/* Test-only native hook. It records no visitor data and is never installed. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stddef.h>
#include <string.h>
#include <libxml/entities.h>
static unsigned int duplicates;
xmlEntityPtr xmlNewEntity(xmlDocPtr doc, const xmlChar *name, int type,
                         const xmlChar *external, const xmlChar *system,
                         const xmlChar *content) {
    xmlEntityPtr (*native)(xmlDocPtr,const xmlChar*,int,const xmlChar*,const xmlChar*,const xmlChar*) = dlsym(RTLD_NEXT,"xmlNewEntity");
    if (name && strcmp((const char *)name,"utilibre_reused")==0) duplicates++;
    return native(doc,name,type,external,system,content);
}
unsigned int utilibre_entity_count(void) { return duplicates; }
