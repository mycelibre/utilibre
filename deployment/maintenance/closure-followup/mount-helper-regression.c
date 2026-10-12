/* Synthetic failed-helper regression. No real mount or privilege escalation.
 * Run only in a disposable container without CAP_SYS_ADMIN, with a fixture
 * helper at /sbin/mount.utilibrefixture. The target is a fresh temporary dir. */
#define _GNU_SOURCE
#include <libmount/libmount.h>
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <unistd.h>

int main(int argc, char **argv) {
    assert(argc == 2);
    const int helper_exit = atoi(argv[1]);
    assert(helper_exit == 0 || helper_exit == 1);
    char target[] = "/tmp/utilibre-mount-mode-XXXXXX";
    assert(mkdtemp(target));
    assert(chmod(target, 0755) == 0);
    assert(setenv("UTILIBRE_FIXTURE_HELPER_EXIT", argv[1], 1) == 0);
    struct libmnt_context *ctx = mnt_new_context();
    assert(ctx);
    assert(mnt_context_set_source(ctx, "none") == 0);
    assert(mnt_context_set_target(ctx, target) == 0);
    assert(mnt_context_set_fstype(ctx, "utilibrefixture") == 0);
    assert(mnt_context_set_options(ctx, "X-mount.mode=0700") == 0);
    assert(mnt_context_disable_mtab(ctx, 1) == 0);
    int result = mnt_context_mount(ctx);
    struct stat st;
    assert(stat(target, &st) == 0);
    assert(mnt_context_helper_executed(ctx));
    assert(mnt_context_get_helper_status(ctx) == helper_exit);
    printf("helper=%d result=%d mode=%o\n", helper_exit, result, st.st_mode & 0777);
    const int passed = (st.st_mode & 0777) == (helper_exit ? 0755 : 0700);
    mnt_free_context(ctx);
    assert(rmdir(target) == 0);
    return passed ? 0 : 10;
}
