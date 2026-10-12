/* Native public-API consumer compiled with original 4.7.0 headers. */
#define _GNU_SOURCE
#include <assert.h>
#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <tiffio.h>
int main(int argc,char **argv) {
    TIFFCodec *codecs=TIFFGetConfiguredCODECs();assert(codecs);
    for(TIFFCodec *c=codecs;c->name;c++)printf("codec %u %s\n",c->scheme,c->name);
    _TIFFfree(codecs);
    if(argc==2 && strcmp(argv[1],"codecs")==0)return 0;
    const uint16_t compression[]={COMPRESSION_NONE,COMPRESSION_LZW,COMPRESSION_ADOBE_DEFLATE,COMPRESSION_PACKBITS,COMPRESSION_LZMA,COMPRESSION_ZSTD,COMPRESSION_WEBP,COMPRESSION_JPEG};
    for(size_t n=0;n<sizeof(compression)/sizeof(*compression);n++) {
        uint16_t codec=compression[n];assert(TIFFIsCODECConfigured(codec));
        char path[80];snprintf(path,sizeof(path),"/tmp/fictional-native-%u.tif",codec);
        TIFF *t=TIFFOpen(path,"w");assert(t);
        assert(TIFFSetField(t,TIFFTAG_IMAGEWIDTH,32));assert(TIFFSetField(t,TIFFTAG_IMAGELENGTH,24));
        assert(TIFFSetField(t,TIFFTAG_SAMPLESPERPIXEL,3));assert(TIFFSetField(t,TIFFTAG_BITSPERSAMPLE,8));
        assert(TIFFSetField(t,TIFFTAG_PHOTOMETRIC,PHOTOMETRIC_RGB));assert(TIFFSetField(t,TIFFTAG_PLANARCONFIG,PLANARCONFIG_CONTIG));
        assert(TIFFSetField(t,TIFFTAG_ROWSPERSTRIP,24));assert(TIFFSetField(t,TIFFTAG_COMPRESSION,codec));
        if(codec==COMPRESSION_WEBP)assert(TIFFSetField(t,TIFFTAG_WEBP_LOSSLESS,1));
        if(codec==COMPRESSION_JPEG)assert(TIFFSetField(t,TIFFTAG_JPEGQUALITY,95));
        unsigned char row[96];for(size_t i=0;i<sizeof(row);i++)row[i]=(unsigned char[]){20,64,128}[i%3];
        for(uint32_t y=0;y<24;y++)assert(TIFFWriteScanline(t,row,y,0)>=0);
        TIFFClose(t);t=TIFFOpen(path,"r");assert(t);
        uint32_t w=0,h=0;uint16_t samples=0;
        assert(TIFFGetField(t,TIFFTAG_IMAGEWIDTH,&w));assert(TIFFGetField(t,TIFFTAG_IMAGELENGTH,&h));assert(w==32 && h==24);
        assert(TIFFGetField(t,TIFFTAG_SAMPLESPERPIXEL,&samples));assert(samples==3);
        for(uint32_t y=0;y<24;y++){
            unsigned char result[96];assert(TIFFReadScanline(t,result,y,0)>=0);
            for(size_t i=0;i<sizeof(row);i++)assert(abs((int)result[i]-(int)row[i])<=(codec==COMPRESSION_JPEG?3:0));
        }
        uint64_t (*ratio)(TIFF*)=dlsym(RTLD_DEFAULT,"TIFFGetMaxCompressionRatio");
        if(argc==2 && strcmp(argv[1],"fixed")==0){assert(ratio);if(codec==COMPRESSION_NONE)assert(ratio(t)==1);}
        TIFFClose(t);remove(path);printf("roundtrip %u dimensions and pixels passed\n",codec);
    }
    puts("native TIFF old-header codec roundtrips passed");return 0;
}
