/* Regression adapted from libexpat PR #1444 (MIT, Expat maintainers).
 * Small synthetic XML only; no file/entity fetches or large allocations. */
#include <expat.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <sys/wait.h>
#include <sys/resource.h>
static int seen;
static void pi(void *unused, const XML_Char *target, const XML_Char *data) {
  (void)unused;
  assert(strcmp(target,"target")==0 && strcmp(data,"data")==0);
  seen++;
}
static int entity(XML_Parser parent,const XML_Char *context,const XML_Char *base,
                  const XML_Char *systemId,const XML_Char *publicId) {
  (void)base;(void)systemId;(void)publicId;
  XML_Parser sub=XML_ExternalEntityParserCreate(parent,context,NULL);assert(sub);
  assert(XML_Parse(sub,"",0,XML_FALSE)==XML_STATUS_OK);
  const char *doc="<?target data?>";
  for(size_t i=0;i<strlen(doc);i++)assert(XML_Parse(sub,doc+i,1,i+1==strlen(doc))==XML_STATUS_OK);
  XML_ParserFree(sub);return XML_STATUS_OK;
}
int main(int argc,char **argv){
  assert(argc==2);int fixed=strcmp(argv[1],"after")==0;
  assert(fixed||strcmp(argv[1],"before")==0);
  assert(strcmp(XML_ExpatVersion(),fixed?"expat_2.10.0":"expat_2.9.0")==0);
  XML_Parser p=XML_ParserCreate(NULL);
  const char *valid="<notice a='fictional'>Guatemala: áéíóú ñ</notice>";
  assert(XML_Parse(p,valid,(int)strlen(valid),XML_TRUE)==XML_STATUS_OK);XML_ParserFree(p);
  p=XML_ParserCreate(NULL);assert(XML_Parse(p,"<notice>",8,XML_TRUE)==XML_STATUS_ERROR);XML_ParserFree(p);
  p=XML_ParserCreate(NULL);assert(XML_ParseBuffer(p,1,XML_TRUE)==XML_STATUS_ERROR);
  assert(XML_GetErrorCode(p)==XML_ERROR_NO_BUFFER);XML_ParserFree(p);
  p=XML_ParserCreate(NULL);assert(XML_GetBuffer(p,16));
  assert(XML_ParseBuffer(p,1000000,XML_TRUE)==XML_STATUS_ERROR);XML_ParserFree(p);
  struct rlimit no_core={0,0};assert(setrlimit(RLIMIT_CORE,&no_core)==0);
  pid_t child=fork();assert(child>=0);
  if(child==0){
    p=XML_ParserCreate(NULL);assert(p);
    XML_SetProcessingInstructionHandler(p,pi);XML_SetExternalEntityRefHandler(p,entity);
    const char *doc="<!DOCTYPE root [<!ENTITY ext SYSTEM 'fictional.invalid'>]><root>&ext;</root>";
    for(size_t i=0;i<strlen(doc);i++)assert(XML_Parse(p,doc+i,1,i+1==strlen(doc))==XML_STATUS_OK);
    assert(seen==1);XML_ParserFree(p);_exit(0);
  }
  int status;assert(waitpid(child,&status,0)==child);
  if(fixed)assert(WIFEXITED(status)&&WEXITSTATUS(status)==0);
  else assert((WIFEXITED(status)&&WEXITSTATUS(status)==0)||(WIFSIGNALED(status)&&WTERMSIG(status)==SIGSEGV));
  printf("EXPAT_NATIVE_PASSED subparser=%s\n",WIFEXITED(status)?"completed":"segfault");return 0;
}
