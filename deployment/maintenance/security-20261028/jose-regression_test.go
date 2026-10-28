package jose_test

import (
 "bytes"
 "crypto/ecdsa"
 "crypto/ed25519"
 "crypto/elliptic"
 "crypto/rand"
 "crypto/rsa"
 "encoding/base64"
 "encoding/json"
 "math/big"
 "os"
 "strings"
 "testing"

 jose "github.com/go-jose/go-jose/v4"
)

// Bounded fixtures demonstrate the missing modulus limit without CPU exhaustion.
func TestUtilibreModulusBoundary(t *testing.T) {
 for _, bits := range []int{2048, 4096, 4097} {
  n := new(big.Int).Lsh(big.NewInt(1), uint(bits-1)); n.Add(n,big.NewInt(1))
  data,_ := json.Marshal(map[string]string{"kty":"RSA","n":base64.RawURLEncoding.EncodeToString(n.Bytes()),"e":"AQAB"})
  var key jose.JSONWebKey; err := json.Unmarshal(data,&key)
  rejected := os.Getenv("UTILIBRE_FIXED") == "1" && bits>4096
  if rejected {if err==nil || !strings.Contains(err.Error(),"modulus too large") {t.Fatalf("expected bounded modulus rejection: %v",err)}} else if err!=nil {t.Fatal(err)}
 }
}
func TestUtilibreNativeRoundTrips(t *testing.T) {
 rsaKey,err:=rsa.GenerateKey(rand.Reader,2048);if err!=nil{t.Fatal(err)}
 ecKey,err:=ecdsa.GenerateKey(elliptic.P256(),rand.Reader);if err!=nil{t.Fatal(err)}
 _,edKey,err:=ed25519.GenerateKey(rand.Reader);if err!=nil{t.Fatal(err)}
 for _,c:=range []struct{name string;key any;pub any;alg jose.SignatureAlgorithm}{
  {"rsa",rsaKey,&rsaKey.PublicKey,jose.RS256},{"ecdsa",ecKey,&ecKey.PublicKey,jose.ES256},{"ed25519",edKey,edKey.Public(),jose.EdDSA},{"hmac",bytes.Repeat([]byte{42},32),bytes.Repeat([]byte{42},32),jose.HS256},
 } {t.Run(c.name,func(t *testing.T){
  data,err:=json.Marshal(jose.JSONWebKey{Key:c.key});if err!=nil{t.Fatal(err)}
  var imported jose.JSONWebKey;if err=json.Unmarshal(data,&imported);err!=nil{t.Fatal(err)}
  signer,err:=jose.NewSigner(jose.SigningKey{Algorithm:c.alg,Key:imported},nil);if err!=nil{t.Fatal(err)}
  signed,err:=signer.Sign([]byte("Fictional Utilibre fixture"));if err!=nil{t.Fatal(err)}
  serial,err:=signed.CompactSerialize();if err!=nil{t.Fatal(err)}
  parsed,err:=jose.ParseSigned(serial,[]jose.SignatureAlgorithm{c.alg});if err!=nil{t.Fatal(err)}
  plain,err:=parsed.Verify(c.pub);if err!=nil || string(plain)!="Fictional Utilibre fixture"{t.Fatalf("round trip: %v",err)}
  parts:=strings.Split(serial,".");parts[1]=base64.RawURLEncoding.EncodeToString([]byte("changed"));bad,err:=jose.ParseSigned(strings.Join(parts,"."),[]jose.SignatureAlgorithm{c.alg});if err!=nil{t.Fatal(err)};if _,err=bad.Verify(c.pub);err==nil{t.Fatal("tampering accepted")}
 })}
 t.Run("jwe",func(t *testing.T){key:=bytes.Repeat([]byte{7},32);e,err:=jose.NewEncrypter(jose.A256GCM,jose.Recipient{Algorithm:jose.DIRECT,Key:key},nil);if err!=nil{t.Fatal(err)};obj,err:=e.Encrypt([]byte("Fictional encrypted fixture"));if err!=nil{t.Fatal(err)};wire,err:=obj.CompactSerialize();if err!=nil{t.Fatal(err)};p,err:=jose.ParseEncrypted(wire,[]jose.KeyAlgorithm{jose.DIRECT},[]jose.ContentEncryption{jose.A256GCM});if err!=nil{t.Fatal(err)};plain,err:=p.Decrypt(key);if err!=nil||string(plain)!="Fictional encrypted fixture"{t.Fatalf("JWE round trip: %v",err)}})
}
