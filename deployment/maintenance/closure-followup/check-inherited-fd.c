/* Test child: report only whether the synthetic cgroup descriptor leaked. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
int main(void) {
    const char *expected = getenv("UTILIBRE_CGROUP_FIXTURE");
    assert(expected);
    for (int fd = 3; fd < 128; ++fd) {
        char path[64], value[4096];
        snprintf(path, sizeof(path), "/proc/self/fd/%d", fd);
        ssize_t count = readlink(path, value, sizeof(value)-1);
        if (count < 0) continue;
        value[count] = 0;
        if (strcmp(value, expected) == 0) { puts("SYNTHETIC_CGROUP_DESCRIPTOR_LEAKED"); return 10; }
    }
    puts("SYNTHETIC_CGROUP_DESCRIPTOR_CLOSED");
    return 0;
}
