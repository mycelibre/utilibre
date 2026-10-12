// Small public-API fixture, compiled against the original Debian 1.15.1 headers.
// Original uniformly coloured pixels and alpha only; no malformed file input.
#include <libheif/heif.h>
#include <cassert>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <initializer_list>
static void ok(heif_error e){if(e.code){fprintf(stderr,"HEIF fixture error: %s\n",e.message);abort();}}
int main(int argc,char**argv){
 if(argc==2&&strcmp(argv[1],"codecs")==0){for(auto f:{heif_compression_HEVC,heif_compression_AV1})printf("codec %d encode=%d decode=%d\n",(int)f,heif_have_encoder_for_format(f),heif_have_decoder_for_format(f));return 0;}
 const char* dir=argc==2?argv[1]:"/tmp";
 for(auto format:{heif_compression_HEVC,heif_compression_AV1}){
  assert(heif_have_encoder_for_format(format)&&heif_have_decoder_for_format(format));
  heif_image* image=nullptr;ok(heif_image_create(32,24,heif_colorspace_RGB,heif_chroma_interleaved_RGBA,&image));
  ok(heif_image_add_plane(image,heif_channel_interleaved,32,24,8));int stride=0;auto* p=heif_image_get_plane(image,heif_channel_interleaved,&stride);assert(p&&stride>=128);
  for(int y=0;y<24;y++)for(int x=0;x<32;x++){auto* q=p+y*stride+x*4;q[0]=64;q[1]=128;q[2]=192;q[3]=128;}
  auto* ctx=heif_context_alloc();assert(ctx);heif_encoder* enc=nullptr;ok(heif_context_get_encoder_for_format(ctx,format,&enc));
  heif_encoder_set_logging_level(enc,0);ok(heif_encoder_set_lossless(enc,1));
  if(format==heif_compression_HEVC){ok(heif_encoder_set_parameter_string(enc,"x265:pools","none"));ok(heif_encoder_set_parameter_string(enc,"x265:frame-threads","1"));}
  else ok(heif_encoder_set_parameter_integer(enc,"threads",1));
  heif_image_handle* encoded=nullptr;ok(heif_context_encode_image(ctx,image,enc,nullptr,&encoded));
  char file[256];snprintf(file,sizeof(file),"%s/fictional.%s",dir,format==heif_compression_HEVC?"heic":"avif");ok(heif_context_write_to_file(ctx,file));
  heif_image_handle_release(encoded);heif_encoder_release(enc);heif_context_free(ctx);heif_image_release(image);
  ctx=heif_context_alloc();assert(ctx);ok(heif_context_read_from_file(ctx,file,nullptr));heif_image_handle* handle=nullptr;ok(heif_context_get_primary_image_handle(ctx,&handle));assert(heif_image_handle_get_width(handle)==32&&heif_image_handle_get_height(handle)==24&&heif_image_handle_has_alpha_channel(handle));
  heif_image* decoded=nullptr;ok(heif_decode_image(handle,&decoded,heif_colorspace_RGB,heif_chroma_interleaved_RGBA,nullptr));const auto* q=heif_image_get_plane_readonly(decoded,heif_channel_interleaved,&stride);assert(q);
  for(int y=0;y<24;y++)for(int x=0;x<32;x++){const auto* r=q+y*stride+x*4;assert(abs((int)r[0]-64)<=2&&abs((int)r[1]-128)<=2&&abs((int)r[2]-192)<=2);assert(r[3]==128);}
  heif_image_release(decoded);heif_image_handle_release(handle);heif_context_free(ctx);printf("HEIF fixture %d: dimensions, colours and alpha roundtrip passed\n",(int)format);
 }
 return 0;
}
