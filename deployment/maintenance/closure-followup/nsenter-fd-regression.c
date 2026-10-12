/* Test-only preload shim: redirects cgroup.procs opens to a synthetic file.
 * Never mounted into a released image. No host cgroup is modified. */
#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <stdarg.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <sched.h>
#include <sys/stat.h>

static int redirected(const char *path, int flags, mode_t mode, const char *symbol) {
    int (*real_open)(const char *, int, ...) = dlsym(RTLD_NEXT, symbol);
    if (!real_open) _exit(120);
    if (strncmp(path, "/sys/", 5) == 0 && (flags & O_ACCMODE) != O_RDONLY) {
        const char *fixture = getenv("UTILIBRE_CGROUP_FIXTURE");
        const char *last = strrchr(path, '/');
        if (!fixture || strncmp(fixture, "/tmp/utilibre-cgroup-", 21) != 0 ||
            !last || strcmp(last, "/cgroup.procs") != 0) {
            errno = EACCES;
            return -1;
        }
        return real_open(fixture, flags, mode);
    }
    return real_open(path, flags, mode);
}

int open(const char *path, int flags, ...) {
    mode_t mode = 0;
    if (flags & O_CREAT) { va_list args; va_start(args, flags); mode = va_arg(args, int); va_end(args); }
    return redirected(path, flags, mode, "open");
}
int open64(const char *path, int flags, ...) {
    mode_t mode = 0;
    if (flags & O_CREAT) { va_list args; va_start(args, flags); mode = va_arg(args, int); va_end(args); }
    return redirected(path, flags, mode, "open64");
}

/* nsenter requires a namespace option. Simulate only re-entering this process's
 * existing mount namespace; fail closed for every other namespace/descriptor. */
int setns(int fd, int type) {
    struct stat current, target;
    if (type == CLONE_NEWNS && stat("/proc/self/ns/mnt", &current) == 0 &&
        fstat(fd, &target) == 0 && current.st_dev == target.st_dev &&
        current.st_ino == target.st_ino) return 0;
    errno = EPERM;
    return -1;
}
