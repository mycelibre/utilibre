/* Small native UTF-16 API compatibility test for Debian's companion library. */
#define XML_UNICODE
#include <expat.h>
#include <assert.h>
#include <string.h>
#include <stdio.h>
static int seen;
static void start(void *unused,const XML_Char *name,const XML_Char **attributes){
 (void)unused;(void)attributes;assert(name[0]=='n'&&name[1]==0);seen++;
}
int main(void){
 XML_Parser p=XML_ParserCreate(NULL);assert(p);XML_SetStartElementHandler(p,start);
 const char *doc="<n>fictional á ñ</n>";
 assert(XML_Parse(p,doc,(int)strlen(doc),XML_TRUE)==XML_STATUS_OK);assert(seen==1);XML_ParserFree(p);
 p=XML_ParserCreate(NULL);assert(XML_Parse(p,"<n>",3,XML_TRUE)==XML_STATUS_ERROR);XML_ParserFree(p);
 p=XML_ParserCreate(NULL);assert(XML_GetBuffer(p,16));assert(XML_ParseBuffer(p,1000000,XML_TRUE)==XML_STATUS_ERROR);XML_ParserFree(p);
 puts("EXPAT_WIDE_PASSED");return 0;
}
