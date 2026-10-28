// Synthetic, bounded library checks; no sockets, user input or live application.
// FSE regression bytes: upstream compress v1.20.2 fse/fse_test.go,
// TestDecompressCountOverflow (BSD-3-Clause, codec-LICENSE.txt).
package main

import (
 "bytes"
 "encoding/binary"
 "encoding/json"
 "io"
 "os"
 "github.com/klauspost/compress/fse"
 "github.com/klauspost/compress/gzip"
 "github.com/klauspost/compress/s2"
 "github.com/klauspost/compress/zstd"
)

func check(ok bool) { if !ok { panic("normal codec check failed") } }
func fseBounds() (rejected bool, panicked bool) {
 defer func() { if recover()!=nil { panicked=true } }()
 scratch:=&fse.Scratch{DecompressLimit:255}
 _,err:=fse.Decompress([]byte{0x1a,0,0,0,0x90,0xaf,0xfa,0xff,3,0,0x80,0xff,0x7f},scratch)
 check(err==nil)
 _,err=fse.Decompress([]byte{0x1a,0,0xe0,0xff,0x1f,0x0f,0xb1,0x9c,0x5a,0xcf,0x4d,0xe4,0x1d,0x7b,0xab,0x99,0x5e,1,0x51,0xa4,0x73,0xd8,0xb1,0xf3,0x39,0x4b,0x67,0xf6},scratch)
 return err!=nil,false
}
func main() {
 input:=bytes.Repeat([]byte("Fictional fixture / Árbol / 日本語\n"),30)
 var compressed bytes.Buffer
 zw:=gzip.NewWriter(&compressed);_,err:=zw.Write(input);check(err==nil);check(zw.Close()==nil)
 zr,err:=gzip.NewReader(bytes.NewReader(compressed.Bytes()));check(err==nil)
 plain,err:=io.ReadAll(zr);check(err==nil&&bytes.Equal(plain,input));check(zr.Close()==nil)
 enc,err:=zstd.NewWriter(nil,zstd.WithEncoderConcurrency(1));check(err==nil);defer enc.Close()
 dec,err:=zstd.NewReader(nil,zstd.WithDecoderConcurrency(1),zstd.WithDecoderMaxMemory(1<<20));check(err==nil);defer dec.Close()
 plain,err=dec.DecodeAll(enc.EncodeAll(input,nil),nil);check(err==nil&&bytes.Equal(plain,input))
 dict:=s2.MakeDict(input,nil);check(dict!=nil)
 plain,err=dict.Decode(nil,dict.Encode(nil,input));check(err==nil&&bytes.Equal(plain,input))
 empty,err:=dec.DecodeAll(enc.EncodeAll(nil,nil),nil);check(err==nil&&len(empty)==0)
 bad:=append([]byte(nil),compressed.Bytes()...);bad[len(bad)-8]^=1
 broken,err:=gzip.NewReader(bytes.NewReader(bad));check(err==nil);_,err=io.ReadAll(broken);check(err!=nil);broken.Close()
 check(s2.NewDict(nil)==nil)
 var buf [binary.MaxVarintLen64]byte
 rejected:=0
 for _,n:=range []uint64{1<<63,^uint64(0),12687765596934209639} {
  length:=binary.PutUvarint(buf[:],n)
  if s2.NewDict(append(append([]byte{},buf[:length]...),make([]byte,16)...))==nil { rejected++ }
 }
 length:=binary.PutUvarint(buf[:],16);check(s2.NewDict(append(append([]byte{},buf[:length]...),make([]byte,16)...))!=nil)
 fseRejected,panicked:=fseBounds()
 json.NewEncoder(os.Stdout).Encode(map[string]any{"passed":true,"normalChecks":7,"overflowRejected":rejected,"overflowCases":3,"fseRejected":fseRejected,"fsePanicked":panicked})
}
