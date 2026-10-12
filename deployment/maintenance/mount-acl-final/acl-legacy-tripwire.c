/* Test-only native caller trace. Never load into a production process. */
#include <sys/acl.h>
#include <unistd.h>
static void reached(void) {
 const char text[]="LEGACY_PATHNAME_ACL_ENTRY_REACHED\n";
 (void)write(STDERR_FILENO,text,sizeof(text)-1);
 _exit(91);
}
acl_t acl_get_file(const char *p,acl_type_t t) { (void)p;(void)t;reached();return 0; }
int acl_set_file(const char *p,acl_type_t t,acl_t a) { (void)p;(void)t;(void)a;reached();return -1; }
int acl_extended_file(const char *p) { (void)p;reached();return -1; }
int acl_delete_def_file(const char *p) { (void)p;reached();return -1; }
