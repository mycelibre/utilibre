/* Fictional regular-file inputs only. No block devices, mounts or privileges. */
#include <blkid/blkid.h>
#include <assert.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

static unsigned char data[128 * 512];
static void le32(unsigned char *p, uint32_t v) {
    for (unsigned i=0;i<4;i++) p[i]=(unsigned char)(v>>(8*i));
}
static void entry(unsigned sector,unsigned slot,unsigned kind,uint32_t offset,uint32_t length) {
    unsigned char *p=data+sector*512+446+slot*16;
    p[4]=(unsigned char)kind;le32(p+8,offset);le32(p+12,length);
    data[sector*512+510]=0x55;data[sector*512+511]=0xaa;
}
static void check(const char *path, int expected_count, long long expected_start) {
    int fd=open(path,O_WRONLY|O_TRUNC);assert(fd>=0);
    assert(write(fd,data,sizeof(data))==(ssize_t)sizeof(data));assert(close(fd)==0);
    blkid_probe p=blkid_new_probe_from_filename(path);assert(p);
    assert(blkid_probe_enable_superblocks(p,0)==0);
    assert(blkid_probe_enable_partitions(p,1)==0);
    int rc=blkid_do_fullprobe(p);assert(rc==0||rc==1);
    blkid_partlist list=blkid_probe_get_partitions(p);int found=0;
    if(list)for(int i=0;i<blkid_partlist_numof_partitions(list);i++) {
        blkid_partition part=blkid_partlist_get_partition(list,i);
        if(!blkid_partition_is_extended(part)) {
            found++;assert(blkid_partition_get_start(part)==expected_start);
            assert(blkid_partition_get_size(part)==8);
        }
    }
    assert(found==expected_count);blkid_free_probe(p);
}
int main(int argc,char **argv) {
    assert(argc==2&&(!strcmp(argv[1],"before")||!strcmp(argv[1],"after")));
    const int fixed=!strcmp(argv[1],"after");
    char path[]="/tmp/utilibre-blkid-XXXXXX";int fd=mkstemp(path);assert(fd>=0);close(fd);
    for(unsigned slot=0;slot<4;slot++)for(unsigned kind=0;kind<3;kind++) {
        memset(data,0,sizeof(data));entry(0,0,5,2,100);
        entry(2,slot,0x83,kind==0?1:kind==1?UINT32_MAX-1:110,8);
        const int valid=kind==0||(!fixed&&slot<2);
        check(path,valid?1:0,kind==0?3:kind==1?0:112);
    }
    memset(data,0,sizeof(data));entry(0,0,0x83,1,8);check(path,1,1);
    memset(data,0,sizeof(data));check(path,0,0);
    assert(unlink(path)==0);puts("BLKID_14_NATIVE_CASES_PASSED");return 0;
}
