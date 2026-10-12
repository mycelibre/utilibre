#define _GNU_SOURCE
#include <sys/acl.h>
#include <acl/libacl.h>
#include <assert.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>

/* Synthetic, unprivileged FD-relative ACL and symlink regression. */
int main(void) {
 assert(getuid()!=0);
 char root[]="/tmp/acl-native-XXXXXX";assert(mkdtemp(root));assert(chdir(root)==0);
 assert(mkdir("original",0700)==0 && mkdir("other",0700)==0);
 int dir=open("original",O_PATH|O_DIRECTORY|O_CLOEXEC);assert(dir>=0);
 int file=openat(dir,"file",O_CREAT|O_RDWR|O_CLOEXEC,0600);assert(file>=0);
 int other=open("other/file",O_CREAT|O_RDWR|O_CLOEXEC,0600);assert(other>=0);
 acl_t value=acl_from_text("u::rw-,u:1:r--,g::---,m::r--,o::---");assert(value);
 assert(rename("original","saved")==0 && symlink("other","original")==0);
 assert(acl_set_file_at(dir,"file",AT_SYMLINK_NOFOLLOW,ACL_TYPE_ACCESS,value)==0);
 acl_t read=acl_get_file_at(dir,"file",AT_SYMLINK_NOFOLLOW,ACL_TYPE_ACCESS);assert(read);
 assert(acl_cmp(read,value)==0);acl_free(read);
 assert(acl_extended_fd(file)==1 && acl_extended_fd(other)==0);
 assert(symlinkat("../other/file",dir,"link")==0);
 errno=0;assert(acl_set_file_at(dir,"link",AT_SYMLINK_NOFOLLOW,ACL_TYPE_ACCESS,value)==-1);
 assert(acl_extended_fd(other)==0);
 read=acl_get_file_at(file,"",AT_EMPTY_PATH,ACL_TYPE_ACCESS);assert(read && acl_cmp(read,value)==0);acl_free(read);
 acl_t def=acl_from_text("u::rwx,g::---,o::---");assert(def);
 assert(acl_set_file_at(dir,"",AT_EMPTY_PATH,ACL_TYPE_DEFAULT,def)==0);
 read=acl_get_file_at(dir,"",AT_EMPTY_PATH,ACL_TYPE_DEFAULT);assert(read && acl_cmp(read,def)==0);acl_free(read);
 assert(acl_delete_def_file_at(dir,"",AT_EMPTY_PATH)==0);
 read=acl_get_file_at(dir,"",AT_EMPTY_PATH,ACL_TYPE_DEFAULT);assert(read && acl_entries(read)==0);acl_free(read);
 acl_free(def);acl_free(value);close(file);close(other);close(dir);
 puts("FD-relative access/default ACL roundtrips, ancestor swap, no-follow symlink rejection and untouched control passed.");
 return 0;
}
