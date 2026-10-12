// Benign ordinary overlay/alpha checks linked to the exact candidate objects.
#include "libheif/heif_image.h"
#include <cassert>
#include <cstdio>
#include <cstring>
#include <memory>
using namespace heif;
static std::shared_ptr<HeifPixelImage> image(int w,int h,int value,bool alpha){
 auto im=std::make_shared<HeifPixelImage>();im->create(w,h,heif_colorspace_RGB,heif_chroma_444);
 for(auto channel:{heif_channel_R,heif_channel_G,heif_channel_B,heif_channel_Alpha}){
  if(channel==heif_channel_Alpha&&!alpha)continue;
  assert(im->add_plane(channel,w,h,8));int stride=0;auto* p=im->get_plane(channel,&stride);assert(p&&stride>=w);
  for(int y=0;y<h;y++)memset(p+y*stride,channel==heif_channel_Alpha?128:value,w);
 }
 return im;
}
int main(){
 for(bool alpha:{false,true}){
  auto dest=image(16,12,20,false),overlay=image(6,4,200,alpha);
  assert(dest->overlay(overlay,2,3).error_code==heif_error_Ok);
  for(auto channel:{heif_channel_R,heif_channel_G,heif_channel_B}){
   int stride=0;const auto* p=dest->get_plane(channel,&stride);
   for(int y=0;y<12;y++)for(int x=0;x<16;x++){
    const int expected=x>=2&&x<8&&y>=3&&y<7?(alpha?(200*128+20*127)/255:200):20;
    assert(p[y*stride+x]==expected);
   }
  }
 }
 puts("Native ordinary overlay and alpha compositing passed; no malformed/exploit input.");
}
