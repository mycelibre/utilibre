/* Synthetic unit fixture around the actual upstream function bodies.
 * No X socket, production display, device, network, or real user data. */
#include <assert.h>
#include <stddef.h>
#include <stdio.h>
typedef int Bool;
typedef unsigned long XID;
typedef struct Device { int id; } *DeviceIntPtr;
typedef struct Grab { DeviceIntPtr device, modifierDevice; XID resource; int active; } *GrabPtr;
typedef struct Client { struct Grab grabs[3]; } *ClientPtr;
static struct Client storage[3];
static ClientPtr clients[]={&storage[0], NULL, &storage[2]};
static int currentMaxClients=3;
#define RT_PASSIVEGRAB 1
#define RT_NONE 0
static GrabPtr LookupClientResourceComplex(ClientPtr c,int type,Bool(*fn)(void*,XID,void*),void *data) {
    assert(type==RT_PASSIVEGRAB);
    for(int i=0;i<3;i++)if(c->grabs[i].active&&fn(&c->grabs[i],c->grabs[i].resource,data))return &c->grabs[i];
    return NULL;
}
static void FreeResource(XID id,int type) {
    assert(type==RT_NONE);
    for(int c=0;c<3;c++)for(int i=0;i<3;i++)if(storage[c].grabs[i].resource==id)storage[c].grabs[i].active=0;
}
/* VERIFIED_UPSTREAM_FUNCTIONS */
int main(void) {
    struct Device removed={1},kept={2};
    for(int c=0;c<3;c++)for(int i=0;i<3;i++)storage[c].grabs[i]=(struct Grab){&kept,&kept,(XID)(10*c+i+1),1};
    storage[0].grabs[0].device=&removed;
    storage[0].grabs[1].modifierDevice=&removed;
    storage[2].grabs[0].device=&removed;
    storage[2].grabs[1].modifierDevice=&removed;
    RemovePassiveGrabsForDevice(&removed);
    for(int c=0;c<3;c+=2){assert(!storage[c].grabs[0].active);assert(!storage[c].grabs[1].active);assert(storage[c].grabs[2].active);}
    RemovePassiveGrabsForDevice(&removed);
    assert(storage[0].grabs[2].active&&storage[2].grabs[2].active);
    puts("direct and modifier grabs removed across clients; unrelated grabs preserved; repeated removal safe");
}
