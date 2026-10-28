// Read an ELF Go function table. Never execute the inspected binary.
package main

import (
 "debug/buildinfo"
 "debug/elf"
 "debug/gosym"
 "encoding/json"
 "os"
 "strings"
)

func main() {
 if len(os.Args) != 2 { panic("one ELF input required") }
 f, err := elf.Open(os.Args[1]); if err != nil { panic(err) }; defer f.Close()
 if f.Machine != elf.EM_X86_64 || f.Class != elf.ELFCLASS64 { panic("unsupported executable") }
 pcln, text := f.Section(".gopclntab"), f.Section(".text")
 if pcln == nil || text == nil { panic("missing complete function table") }
 data, err := pcln.Data(); if err != nil { panic(err) }
 table, err := gosym.NewTable(nil, gosym.NewLineTable(data, text.Addr)); if err != nil { panic(err) }
 info, err := buildinfo.ReadFile(os.Args[1]); if err != nil { panic(err) }
 names := []string{}; hasMain, x509 := false, false
 for _, f := range table.Funcs {
  if f.Name == "main.main" { hasMain = true }
  if strings.HasPrefix(f.Name, "crypto/x509.") { x509 = true; names = append(names, f.Name) }
 }
 if !hasMain || len(table.Funcs) < 100 { panic("incomplete executable inventory") }
 if err := json.NewEncoder(os.Stdout).Encode(map[string]any{"go":info.GoVersion,"module":info.Path,"functions":len(table.Funcs),"main":hasMain,"x509":x509,"x509Functions":names}); err != nil { panic(err) }
}
