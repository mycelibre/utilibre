/* Deterministic synthetic regression. This executable intercepts mount(2),
 * never invokes the kernel mount syscall, and runs without capabilities. */
#define _GNU_SOURCE
#include <libmount/libmount.h>
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/mount.h>
#include <unistd.h>

static struct stat expected;
static int calls, same_inode;
int mount(const char *source, const char *target, const char *type,
          unsigned long flags, const void *data) {
    (void)source; (void)type; (void)flags; (void)data;
    struct stat seen;
    calls++;
    assert(stat(target,&seen)==0);
    same_inode = seen.st_dev==expected.st_dev && seen.st_ino==expected.st_ino;
    errno=EPERM;
    return -1;
}

int main(int argc,char **argv) {
    assert(argc==3);
    const int fixed=!strcmp(argv[1],"fixed");
    const char *mode=argv[2];
    assert(!strcmp(mode,"normal") || !strcmp(mode,"ancestor-swap") ||
           !strcmp(mode,"target-swap") || !strcmp(mode,"ancestor-link") ||
           !strcmp(mode,"target-link") || !strcmp(mode,"unrestricted"));
    assert(getuid()!=0);
    char dir[]="/tmp/mount-regression-XXXXXX";
    assert(mkdtemp(dir));
    char parent[512],target[512],other[512],other_target[512],saved[512];
    assert(snprintf(parent,sizeof(parent),"%s/parent",dir)>0);
    assert(snprintf(target,sizeof(target),"%s/parent/target",dir)>0);
    assert(snprintf(other,sizeof(other),"%s/other",dir)>0);
    assert(snprintf(other_target,sizeof(other_target),"%s/other/target",dir)>0);
    assert(snprintf(saved,sizeof(saved),"%s/saved",dir)>0);
    assert(mkdir(parent,0700)==0 && mkdir(target,0700)==0);
    assert(mkdir(other,0700)==0 && mkdir(other_target,0700)==0);
    assert(stat(target,&expected)==0);
    const int before=strstr(mode,"-link")!=NULL;
    if(!strcmp(mode,"ancestor-link")) {
        assert(rename(parent,saved)==0 && symlink(other,parent)==0);
    } else if(!strcmp(mode,"target-link")) {
        assert(rename(target,saved)==0 && symlink(other_target,target)==0);
    }
    struct libmnt_context *ctx=mnt_new_context();
    struct libmnt_table *tab=mnt_new_table();
    struct libmnt_fs *entry=mnt_new_fs();
    assert(ctx && tab && entry);
    assert(mnt_fs_set_source(entry,"none")==0);
    assert(mnt_fs_set_target(entry,target)==0);
    assert(mnt_fs_set_fstype(entry,"tmpfs")==0);
    assert(mnt_fs_set_options(entry,"users,noauto")==0);
    assert(mnt_table_add_fs(tab,entry)==0);
    assert(mnt_context_set_fstab(ctx,tab)==0);
    assert(mnt_context_set_target(ctx,target)==0);
    assert(mnt_context_disable_helpers(ctx,1)==0);
    assert(mnt_context_disable_mtab(ctx,1)==0);
    if(!strcmp(mode,"unrestricted")) assert(mnt_context_force_unrestricted(ctx)==0);
    int rc=mnt_context_prepare_mount(ctx);
    if(before && fixed) {
        assert(rc<0 && calls==0);
        printf("%s: symlink rejected before mount (rc=%d)\n",mode,rc);
    } else {
        if(rc) fprintf(stderr,"prepare %s=%d (%s)\n",mode,rc,strerror(-rc));
        assert(rc==0);
        if(!strcmp(mode,"ancestor-swap")) {
            assert(rename(parent,saved)==0 && symlink(other,parent)==0);
        } else if(!strcmp(mode,"target-swap")) {
            assert(rename(target,saved)==0 && symlink(other_target,target)==0);
        }
        rc=mnt_context_do_mount(ctx);
        assert(rc==EPERM && calls==1);
        int changed=strcmp(mode,"normal") && strcmp(mode,"unrestricted");
        assert(same_inode==(fixed || !changed));
        printf("%s: intercepted once; original inode=%d; no kernel mount\n",mode,same_inode);
    }
    mnt_free_context(ctx);
    mnt_unref_table(tab);
    mnt_unref_fs(entry);
    return 0;
}
