/* Fictional FITS fixtures; no network or production data. */
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "fitsio.h"

static int string_case(long size,int fixed) {
 fitsfile *f=NULL; int status=0,anynull=0;
 char format[32];snprintf(format,sizeof(format),"%ldA",size);
 char *type[]={"FICTIONAL"},*form[]={fixed?format:"1PA"};
 unsigned char *data=calloc(size+1,1);char *result=calloc(size+1,1),*results[]={result},*strings[]={(char*)data};
 assert(data&&result);memset(data,'A',size);
 fits_create_file(&f,"!/tmp/fictional-variable.fits",&status);
 fits_create_img(f,BYTE_IMG,0,NULL,&status);
 fits_create_tbl(f,BINARY_TBL,1,1,type,form,NULL,NULL,&status);
 if(fixed)fits_write_col_str(f,1,1,1,1,strings,&status);
 else fits_write_col_byt(f,1,1,1,size,data,&status);
 fits_close_file(f,&status);if(status){fprintf(stderr,"Fixture creation: size=%ld fixed=%d status=%d\n",size,fixed,status);fits_report_error(stderr,status);abort();}
 fits_open_file(&f,"/tmp/fictional-variable.fits",READONLY,&status);fits_movabs_hdu(f,2,NULL,&status);assert(status==0);
 fits_read_col_str(f,1,1,1,1,NULL,results,&anynull,&status);
 if(!status&&!(strlen(result)==(size_t)size&&memcmp(result,data,size)==0)) {
  fprintf(stderr,"Fictional string mismatch: requested=%ld returned=%zu\n",size,strlen(result));abort();
 }
 int resultStatus=status;status=0;fits_close_file(f,&status);assert(status==0);free(data);free(result);return resultStatus;
}
int main(int argc,char **argv) {
 assert(argc==2);
 if(!strcmp(argv[1],"oversized")) {
  int status=string_case(28801,0);
  printf("{\"passed\":true,\"oversizedRejected\":%s,\"status\":%d}\n",status==READ_ERROR?"true":"false",status);return 0;
 }
 assert(!strcmp(argv[1],"normal"));
 long sizes[]={1,16,127,1024,2048,28799};
 for(size_t i=0;i<sizeof(sizes)/sizeof(sizes[0]);i++)assert(string_case(sizes[i],sizes[i]==28799)==0);
 fitsfile *f=NULL;int status=0,anynull=0;long axes[]={3,2};short data[]={1,2,3,4,5,6},out[6]={0};
 fits_create_file(&f,"!/tmp/fictional-image.fits",&status);fits_create_img(f,SHORT_IMG,2,axes,&status);
 fits_write_img(f,TSHORT,1,6,data,&status);fits_close_file(f,&status);assert(status==0);
 fits_open_file(&f,"/tmp/fictional-image.fits",READONLY,&status);fits_read_img(f,TSHORT,1,6,NULL,out,&anynull,&status);fits_close_file(f,&status);assert(status==0&&!memcmp(out,data,sizeof(data)));
 /* Exercise the installed GDAL consumer against the actual FITS driver. */
 void *g=dlopen("libgdal.so.32",RTLD_NOW);assert(g);
 void (*reg)(void)=dlsym(g,"GDALAllRegister");void *(*open)(const char*,int)=dlsym(g,"GDALOpen");
 int (*width)(void*)=dlsym(g,"GDALGetRasterXSize"),(*height)(void*)=dlsym(g,"GDALGetRasterYSize");
 void *(*band)(void*,int)=dlsym(g,"GDALGetRasterBand");
 int (*read)(void*,int,int,int,int,int,void*,int,int,int,int,int)=dlsym(g,"GDALRasterIO");
 void (*close)(void*)=dlsym(g,"GDALClose");assert(reg&&open&&width&&height&&band&&read&&close);reg();
 void *d=open("/tmp/fictional-image.fits",0);assert(d&&width(d)==3&&height(d)==2);memset(out,0,sizeof(out));
 /* GDAL FITS IReadBlock maps FITS's bottom-left origin to top-left rows. */
 short raster[]={4,5,6,1,2,3};
 assert(read(band(d,1),0,0,0,3,2,out,3,2,3,0,0)==0);assert(!memcmp(out,raster,sizeof(raster)));close(d);
 printf("{\"passed\":true,\"normalChecks\":8,\"fixedWidthBoundaryAccepted\":28799,\"gdalFitsConsumer\":true}\n");return 0;
}
