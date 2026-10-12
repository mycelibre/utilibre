// Actual GDAL public API, compiled with the deployed 3.6.2 Debian headers.
// Resolve from the unchanged runtime GDAL to avoid introducing compiler libs.
#include <gdal.h>
#include <dlfcn.h>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <initializer_list>
#define LOAD(name) auto p##name = reinterpret_cast<decltype(&name)>(dlsym(lib,#name)); assert(p##name)
int main(int argc,char**argv){
 assert(argc==2||argc==3);void*lib=dlopen("libgdal.so.32",RTLD_NOW|RTLD_GLOBAL);assert(lib);
 LOAD(GDALAllRegister);LOAD(GDALGetDriverByName);LOAD(GDALOpen);LOAD(GDALGetRasterXSize);LOAD(GDALGetRasterYSize);LOAD(GDALGetRasterCount);LOAD(GDALGetRasterBand);LOAD(GDALRasterIO);LOAD(GDALClose);LOAD(GDALGetDatasetDriver);LOAD(GDALGetDriverShortName);
 pGDALAllRegister();assert(pGDALGetDriverByName("HEIF"));
 for(const char*extension:{"heic","avif"}){
  if(argc==3&&strcmp(argv[2],extension))continue;
  char file[256];snprintf(file,sizeof(file),"HEIF:1:%s/fictional.%s",argv[1],extension);auto ds=pGDALOpen(file,GA_ReadOnly);assert(ds);
  assert(pGDALGetRasterXSize(ds)==32&&pGDALGetRasterYSize(ds)==24);assert(pGDALGetRasterCount(ds)==4);
  for(int band=1;band<=4;band++){unsigned char pixels[32*24]={0};assert(pGDALRasterIO(pGDALGetRasterBand(ds,band),GF_Read,0,0,32,24,pixels,32,24,GDT_Byte,0,0)==CE_None);int expected=band==4?128:band*64;for(auto value:pixels)assert(abs(int(value)-expected)<=2);}
  printf("GDAL %s: %s RGBA dimensions/pixels passed\n",pGDALGetDriverShortName(pGDALGetDatasetDriver(ds)),extension);fflush(stdout);pGDALClose(ds);
 }
 // GDAL has process-lifetime registered drivers; do not unload underneath them.
 return 0;
}
