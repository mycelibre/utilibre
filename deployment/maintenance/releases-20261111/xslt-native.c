/* Ordinary local XSLT transformations. No hostile input or network access. */
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <libxml/parser.h>
#include <libxslt/transform.h>
#include <libxslt/xsltutils.h>
#include <libexslt/exslt.h>

int main(void) {
 const char *xml="<items><item n='2'>niño</item><item n='1'>example</item></items>";
 const char *style="<xsl:stylesheet version='1.0' xmlns:xsl='http://www.w3.org/1999/XSL/Transform'>"
 "<xsl:output method='text' encoding='UTF-8'/><xsl:param name='prefix'/><xsl:template match='/'>"
 "<xsl:value-of select='$prefix'/><xsl:for-each select='items/item'><xsl:sort select='@n' data-type='number'/>"
 "<xsl:value-of select='.'/><xsl:text>;</xsl:text></xsl:for-each></xsl:template></xsl:stylesheet>";
 xmlInitParser(); exsltRegisterAll();
 xmlDocPtr input=xmlReadMemory(xml,strlen(xml),"fictional.xml",NULL,XML_PARSE_NONET);
 xmlDocPtr sheet=xmlReadMemory(style,strlen(style),"fictional.xsl",NULL,XML_PARSE_NONET);
 assert(input && sheet);
 xsltStylesheetPtr parsed=xsltParseStylesheetDoc(sheet);assert(parsed);
 const char *params[]={"prefix","'Fictional: '",NULL};
 xmlDocPtr result=xsltApplyStylesheet(parsed,input,params);assert(result);
 xmlChar *out=NULL;int length=0;
 assert(xsltSaveResultToString(&out,&length,result,parsed)==0);
 const char *expected="Fictional: example;niño;";
 assert(length==(int)strlen(expected) && memcmp(out,expected,length)==0);
 xmlFree(out);xmlFreeDoc(result);xsltFreeStylesheet(parsed);xmlFreeDoc(input);
 xsltCleanupGlobals();xmlCleanupParser();
 puts("XSLT_NATIVE_PASSED parse-transform-sort-parameter-utf8-serialize");
 return 0;
}
