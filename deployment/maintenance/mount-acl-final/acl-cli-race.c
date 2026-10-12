/* Test-only deterministic directory substitution during a native utility's
 * readdir traversal. Confined to a caller-created /tmp/acl-cli-* fixture. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <dirent.h>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
static int changed;
static void swap(const char *name) {
 if(changed || !name || strcmp(name,"file")) return;
 const char *root=getenv("ACL_CLI_FIXTURE");
 assert(root && !strncmp(root,"/tmp/acl-cli-",13));
 char tree[512],saved[512],other[512],marker[512];
 assert(snprintf(tree,sizeof(tree),"%s/tree",root)>0);
 assert(snprintf(saved,sizeof(saved),"%s/saved",root)>0);
 assert(snprintf(other,sizeof(other),"%s/other",root)>0);
 assert(snprintf(marker,sizeof(marker),"%s/triggered",root)>0);
 assert(rename(tree,saved)==0 && symlink(other,tree)==0);
 int fd=open(marker,O_WRONLY|O_CREAT|O_EXCL,0600);assert(fd>=0);close(fd);changed=1;
}
struct dirent *readdir(DIR *dir) {
 struct dirent *(*original)(DIR *)=dlsym(RTLD_NEXT,"readdir");assert(original);
 struct dirent *result=original(dir);if(result)swap(result->d_name);return result;
}
struct dirent64 *readdir64(DIR *dir) {
 struct dirent64 *(*original)(DIR *)=dlsym(RTLD_NEXT,"readdir64");assert(original);
 struct dirent64 *result=original(dir);if(result)swap(result->d_name);return result;
}
