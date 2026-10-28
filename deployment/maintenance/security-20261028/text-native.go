// Bounded native regression for GO-2026-6629; all data is synthetic.
package main
import("bytes";"encoding/json";"fmt";"strings";"golang.org/x/text/secure/precis";"golang.org/x/text/transform")
func need(ok bool){if !ok{panic("normal text behavior failed")}}
func stream(src,want []byte,dd,ds int)(panicked,wrong bool){
 defer func(){if recover()!=nil{panicked=true}}()
 tr:=precis.Nickname.NewTransformer();dst:=make([]byte,4096);d,s:=0,0
 for step:=0;step<500;step++{
  d1:=min(len(dst),d+dd);s1:=min(len(src),s+ds)
  nd,ns,e:=tr.Transform(dst[d:d1:d1],src[s:s1:s1],s1==len(src));d+=nd;s+=ns
  if d>len(dst)||s>len(src){return false,true}
  if e==nil&&s==len(src){return false,!bytes.Equal(dst[:d],want)}
  if e==nil||e==transform.ErrShortDst||(e==transform.ErrShortSrc&&s1<len(src)){continue}
  return false,true
 }
 return false,true
}
func expansion()(panicked,wrong bool){defer func(){if recover()!=nil{panicked=true}}();v,e:=precis.Nickname.String("ﷺ");return false,e!=nil||v!="صلى الله عليه وسلم"}
func main(){
 for _,tc:=range[][2]string{{"abc","abc"},{"  hello   world ","hello world"},{"a\u0300cce\u0301nts","àccénts"},{"niño","niño"}}{v,e:=precis.Nickname.String(tc[0]);need(e==nil&&v==tc[1])}
 panics,wrong,cases:=0,0,1
 p,w:=expansion();if p{panics++};if w{wrong++}
 for _,tc:=range[][2]string{{"abcd b","abcd b"},{"a b","a b"},{"ﷺ","صلى الله عليه وسلم"},{"a\u0300cce\u0301nts","àccénts"}}{src:=[]byte(strings.Repeat(tc[0],16));want:=[]byte(strings.Repeat(tc[1],16))
 for _,dd:=range[]int{5,7,13,17,4096}{for _,ds:=range[]int{5,7,13,17,4096}{p,w:=stream(src,want,dd,ds);if p{panics++};if w{wrong++};cases++}}}
 b,_:=json.Marshal(map[string]any{"normalChecks":4,"cases":cases,"panics":panics,"wrongResults":wrong});fmt.Println(string(b))
}
