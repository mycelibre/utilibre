// Read-only evidence for the exact legacy Grist runsc. Not an exploitability
// verdict: an absent package is narrower evidence than a complete sandbox audit.
package main

import (
	"bytes"
	"crypto/sha256"
	"debug/elf"
	"debug/gosym"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

func main() {
	if len(os.Args) != 2 {
		panic("expected path to copied runsc")
	}
	data, err := os.ReadFile(os.Args[1])
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])
	if hash != "2aca288a1bd6b38f904defed9cbbd326d824323fe0b91cb12d808cde22d597d6" {
		panic("unreviewed binary")
	}
	f, err := elf.Open(os.Args[1])
	if err != nil {
		panic(err)
	}
	defer f.Close()
	section := f.Section(".gopclntab")
	if section == nil {
		panic("Go function table missing")
	}
	pcln, err := section.Data()
	if err != nil {
		panic(err)
	}
	text := f.Section(".text")
	if text == nil {
		panic("text section missing")
	}
	table, err := gosym.NewTable(nil, gosym.NewLineTable(pcln, text.Addr))
	if err != nil {
		panic(err)
	}
	if len(table.Funcs) < 10000 {
		panic("unexpectedly incomplete function table")
	}
	packages := []string{"crypto/elliptic", "html/template", "net/netip", "crypto/tls"}
	matches := make(map[string][]string)
	packageTextPresent := make(map[string]bool)
	for _, pkg := range packages {
		packageTextPresent[pkg] = bytes.Contains(data, []byte(pkg))
		matches[pkg] = []string{}
		for _, fn := range table.Funcs {
			if strings.HasPrefix(fn.Name, pkg+".") {
				matches[pkg] = append(matches[pkg], fn.Name)
			}
		}
	}
	result := map[string]interface{}{"sha256": hash, "functionCount": len(table.Funcs), "criticalPackageFunctions": matches, "packageTextPresent": packageTextPresent, "limitation": "Function table and literal package strings only; not a full inlining/call-graph or sandbox-escape audit. No waiver is written."}
	out, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		panic(err)
	}
	fmt.Println(string(out))
}
