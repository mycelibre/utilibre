// Dependency-free deterministic 720p/30fps moving YUV pattern and 48kHz tone.
// Chrome loops these synthetic fixtures; no person's camera or voice is used.
import {openSync,writeSync,closeSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const directory=process.argv[2];
if(!directory)throw Error('Supply a temporary fixture directory');
const width=1280,height=720,frames=120;
const file=openSync(join(directory,'load-video.y4m'),'wx');
try {
  writeSync(file,`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`);
  const pixels=Buffer.alloc(width*height*3/2);
  for(let t=0;t<frames;t++) {
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)
      pixels[y*width+x]=32+(((x+4*t)%192)^((y+2*t)%192));
    for(let y=0;y<height/2;y++)for(let x=0;x<width/2;x++) {
      pixels[width*height+y*width/2+x]=64+(x+3*t)%128;
      pixels[width*height*5/4+y*width/2+x]=64+(y+2*t)%128;
    }
    writeSync(file,'FRAME\n');writeSync(file,pixels);
  }
}finally{closeSync(file)}
const samples=48000*10,wav=Buffer.alloc(44+samples*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
wav.write('data',36);wav.writeUInt32LE(samples*2,40);
for(let i=0;i<samples;i++)wav.writeInt16LE(Math.round(6000*Math.sin(2*Math.PI*440*i/48000)),44+2*i);
writeFileSync(join(directory,'load-audio.wav'),wav,{flag:'wx'});
