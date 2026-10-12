#include <expat.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(void) {
  assert(strcmp(XML_ExpatVersion(), "expat_2.9.0") == 0);
  XML_Parser p = XML_ParserCreate(NULL);
  const char *valid = "<notice a='fictional'>Guatemala: áéíóú ñ</notice>";
  assert(XML_Parse(p, valid, (int)strlen(valid), XML_TRUE) == XML_STATUS_OK);
  XML_ParserFree(p);
  p = XML_ParserCreate(NULL);
  assert(XML_Parse(p, "<notice>", 8, XML_TRUE) == XML_STATUS_ERROR);
  XML_ParserFree(p);
  p = XML_ParserCreate(NULL);
  assert(XML_ParseBuffer(p, 1, XML_TRUE) == XML_STATUS_ERROR);
  assert(XML_GetErrorCode(p) == XML_ERROR_NO_BUFFER);
  XML_ParserFree(p);
  p = XML_ParserCreate(NULL);
  assert(XML_GetBuffer(p, 16));
  /* The fixed API rejects a length beyond its actual allocated buffer. */
  assert(XML_ParseBuffer(p, 1000000, XML_TRUE) == XML_STATUS_ERROR);
  XML_ParserFree(p);
  p = XML_ParserCreate(NULL);
  const unsigned char bad[] = {0xff,0xfe,'<',0,'n',0,'>',0,0,0xd8,'<',0,'/',0,'n',0,'>',0};
  assert(XML_Parse(p,(const char *)bad,sizeof(bad),XML_TRUE)==XML_STATUS_ERROR);
  XML_ParserFree(p);
  puts("EXPAT_NATIVE_PASSED");
}
