// System trust-store loading only; public certificates and no network traffic.
package main

import (
 "bytes"
 "crypto/sha256"
 "crypto/x509"
 "encoding/hex"
 "encoding/json"
 "encoding/pem"
 "os"
 "runtime"
 "time"
)

func main() {
 if len(os.Args)!=3 { panic("state and original public bundle required") }
 state:=os.Args[1]; if state!="before" && state!="after" { panic("unsupported state") }
 data,err:=os.ReadFile(os.Args[2]);if err!=nil { panic(err) }
 revoked:=map[string]bool{
  "8d417db2dd8bf5e3084d1e3f196d583849d81bdd4c00c70b9d39369e96b8c782":true,
  "b7408b4d2be0238ba37004dd34e276c6019bd2f24c9db7d4980f5f6c359a4bcc":true,
  "eabc185c4e82d942b1a5978ba3c0181487d6b3b9974e5c49f72f6d0bd9637150":true,
 }
 pool,err:=x509.SystemCertPool();if err!=nil { panic(err) }
 subjects:=pool.Subjects();if len(subjects)<100 { panic("incomplete system trust store") }
 found,present,normal,verifyDenied:=0,0,0,0
 for len(data)>0 {
  block,rest:=pem.Decode(data);data=rest;if block==nil { break };if block.Type!="CERTIFICATE" {continue}
  c,e:=x509.ParseCertificate(block.Bytes);if e!=nil {panic(e)}
  h:=sha256.Sum256(c.RawSubjectPublicKeyInfo)
  options:=x509.VerifyOptions{Roots:pool,CurrentTime:time.Date(2026,10,28,0,0,0,0,time.UTC),KeyUsages:[]x509.ExtKeyUsage{x509.ExtKeyUsageAny}}
  if revoked[hex.EncodeToString(h[:])] {
   found++;for _,s:=range subjects { if bytes.Equal(s,c.RawSubject) {present++;break} }
   if _,e=c.Verify(options);e!=nil {verifyDenied++}
  }
  if c.Subject.CommonName=="ISRG Root X1" {
   if _,e=c.Verify(options);e!=nil {panic(e)};normal++
  }
 }
 if found!=3 || normal!=1 || (state=="before" && present!=3) || (state=="after" && present!=0) { panic("trust-store boundary mismatch") }
 json.NewEncoder(os.Stdout).Encode(map[string]any{"passed":true,"state":state,"go":runtime.Version(),"systemRoots":len(subjects),"reviewedRemovedRoots":found,"removedRootsStillPresent":present,"ordinaryTrustedRootPassed":normal==1,"reviewedRootsRejectedByVerifier":verifyDenied,"network":false})
}
