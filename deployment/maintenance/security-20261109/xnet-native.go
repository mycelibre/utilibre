// Bounded synthetic regression for GO-2026-6860 / CVE-2026-78661.
// Uses the documented upstream input shape, not a network or application probe.
package main

import (
 "encoding/json"
 "flag"
 "fmt"
 "os"
 "runtime"
 "strings"
 "golang.org/x/net/html"
 "golang.org/x/net/html/atom"
)

func text(n *html.Node) string {
 var b strings.Builder
 var visit func(*html.Node)
 visit = func(p *html.Node) { if p.Type == html.TextNode { b.WriteString(p.Data) }; for c:=p.FirstChild;c!=nil;c=c.NextSibling { visit(c) } }
 visit(n); return b.String()
}
func main() {
 expected:=flag.String("expect", "", "fixed or vulnerable"); flag.Parse()
 if *expected!="fixed" && *expected!="vulnerable" { panic("explicit expected state required") }
 const count=8192
 body:=strings.Repeat("a</x>", count)
 results:=[]map[string]any{}
 for _,kind:=range []string{"document","foster-parent","fragment"} {
  input:=body; if kind=="foster-parent" { input="<table>"+body+"</table>" }
  runtime.GC(); var before,after runtime.MemStats; runtime.ReadMemStats(&before)
  var root *html.Node; var err error
  if kind=="fragment" {
   var nodes []*html.Node
   nodes,err=html.ParseFragment(strings.NewReader(input),&html.Node{Type:html.ElementNode,Data:"div",DataAtom:atom.Div})
   root=&html.Node{Type:html.DocumentNode}; for _,n:=range nodes { root.AppendChild(n) }
  } else { root,err=html.Parse(strings.NewReader(input)) }
  runtime.ReadMemStats(&after)
  if err!=nil || text(root)!=strings.Repeat("a",count) { panic("text preservation failed") }
  allocated:=after.TotalAlloc-before.TotalAlloc
  bounded:=allocated<2*1024*1024
  if (*expected=="fixed")!=bounded { panic(fmt.Sprintf("%s: expected %s, allocated %d",kind,*expected,allocated)) }
  results=append(results,map[string]any{"case":kind,"textPreserved":true,"allocatedBytes":allocated,"boundedAllocation":bounded})
 }
 doc,err:=html.Parse(strings.NewReader("<!doctype html><p>Árbol &amp; useful text</p><table><tr><td>7</td></tr></table>"))
 if err!=nil || text(doc)!="Árbol & useful text7" { panic("benign HTML parsing failed") }
 json.NewEncoder(os.Stdout).Encode(map[string]any{"passed":true,"expected":*expected,"tokens":count,"cases":results,"benignTextPreserved":true,"network":"none"})
}
