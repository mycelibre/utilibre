/* Compile with the original Debian headers; run with original and patched libs.
 * Synthetic data only. This checks the supported allocator/parser API boundary,
 * not every third-party program that might allocate public structures itself. */
#include <assert.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <libxml/parser.h>
#include <libxml/parserInternals.h>
#include <libxml/entities.h>
#define FIELD(t,n) printf(#t "." #n "=%zu\n", offsetof(t,n))
int main(int argc, char **argv) {
  if (argc > 1 && !strcmp(argv[1], "layout")) {
    FIELD(xmlEntity,_private); FIELD(xmlEntity,type); FIELD(xmlEntity,name);
    FIELD(xmlEntity,children); FIELD(xmlEntity,last); FIELD(xmlEntity,parent);
    FIELD(xmlEntity,next); FIELD(xmlEntity,prev); FIELD(xmlEntity,doc);
    FIELD(xmlEntity,orig); FIELD(xmlEntity,content); FIELD(xmlEntity,length);
    FIELD(xmlEntity,etype); FIELD(xmlEntity,ExternalID); FIELD(xmlEntity,SystemID);
    FIELD(xmlEntity,nexte); FIELD(xmlEntity,URI); FIELD(xmlEntity,owner);
    FIELD(xmlEntity,checked);
    FIELD(xmlParserInput,buf); FIELD(xmlParserInput,filename);
    FIELD(xmlParserInput,directory); FIELD(xmlParserInput,base);
    FIELD(xmlParserInput,cur); FIELD(xmlParserInput,end);
    FIELD(xmlParserInput,length); FIELD(xmlParserInput,line);
    FIELD(xmlParserInput,col); FIELD(xmlParserInput,consumed);
    FIELD(xmlParserInput,free); FIELD(xmlParserInput,encoding);
    FIELD(xmlParserInput,version); FIELD(xmlParserInput,standalone);
    FIELD(xmlParserInput,id);
    return 0;
  }
  const char *sample = "<!DOCTYPE note [<!ENTITY example 'fictional'>]><note>&example;</note>";
  xmlInitParser();
  for (int i=0; i<50; i++) {
    xmlDocPtr document=xmlReadMemory(sample, (int)strlen(sample), "fixture.xml", NULL, XML_PARSE_NONET|XML_PARSE_NOENT);
    assert(document);
    xmlChar *content=xmlNodeGetContent(xmlDocGetRootElement(document));
    assert(!strcmp((char *)content,"fictional"));
    xmlFree(content); xmlFreeDoc(document);
    xmlParserCtxtPtr parser=xmlNewParserCtxt(); assert(parser);
    xmlParserInputPtr input=xmlNewInputStream(parser); assert(input);
    assert(input->line==1); xmlFreeInputStream(input); xmlFreeParserCtxt(parser);
    xmlEntityPtr entity=xmlNewEntity(NULL,BAD_CAST "synthetic",XML_INTERNAL_GENERAL_ENTITY,NULL,NULL,BAD_CAST "example");
    assert(entity && entity->type==XML_ENTITY_DECL && entity->length==7);
    xmlFreeNode((xmlNodePtr)entity);
    parser=xmlCreatePushParserCtxt(NULL,NULL,NULL,0,"fixture.xml"); assert(parser);
    assert(xmlCtxtUseOptions(parser,XML_PARSE_NONET|XML_PARSE_NOENT)==0);
    for(size_t p=0;p<strlen(sample);p++) assert(xmlParseChunk(parser,sample+p,1,0)==0);
    assert(xmlParseChunk(parser,NULL,0,1)==0);
    assert(parser->wellFormed);
    xmlFreeDoc(parser->myDoc); xmlFreeParserCtxt(parser);
  }
  xmlCleanupParser();
  puts("old-header native entity/input allocators and chunked parsing passed");
  return 0;
}
