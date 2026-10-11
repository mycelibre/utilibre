package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/moby/sys/user"
)

// v0.4.1's TestParseGroupFileCapsReads pads with NULs, but NUL is not blank
// space and a 10 MiB single line exceeds the parser's separate 1 MiB line cap.
// Test the actual file-read limit with valid blank lines, without patching the
// production parser or claiming that the upstream's broken fixture passed.
func TestSecurityGroupFileReadBounds(t *testing.T) {
	const capBytes = 10 << 20
	entry := []byte("fixture:x:42:\n")
	for _, size := range []int{100, capBytes, capBytes + 1} {
		path := filepath.Join(t.TempDir(), "group")
		data := append(bytes.Repeat([]byte{'\n'}, size-len(entry)), entry...)
		if err := os.WriteFile(path, data, 0600); err != nil { t.Fatal(err) }
		groups, err := user.ParseGroupFile(path)
		if size > capBytes {
			if err == nil || !strings.Contains(err.Error(), "file exceeds") { t.Fatalf("overflow not rejected: %v", err) }
			continue
		}
		if err != nil { t.Fatal(err) }
		if len(groups) != 1 || groups[0].Gid != 42 || groups[0].Name != "fixture" { t.Fatalf("unexpected groups: %#v", groups) }
	}
}

func TestSecurityGroupRejectsDeviceAndDirectory(t *testing.T) {
	for _, path := range []string{"/dev/zero", t.TempDir()} {
		_, err := user.ParseGroupFile(path)
		if err == nil || !strings.Contains(err.Error(), "not a regular file") { t.Fatalf("nonregular input accepted: %v", err) }
	}
}

func TestSecurityGroupRejectsOversizedLine(t *testing.T) {
	path := filepath.Join(t.TempDir(), "group")
	if err := os.WriteFile(path, bytes.Repeat([]byte{'x'}, 1024*1024+1), 0600); err != nil { t.Fatal(err) }
	_, err := user.ParseGroupFile(path)
	if err == nil || !strings.Contains(err.Error(), "token too long") { t.Fatalf("oversized token accepted: %v", err) }
}

func TestSecurityExecUserPathFailsClosedOnReadOverflow(t *testing.T) {
	root := t.TempDir()
	passwd := filepath.Join(root, "passwd")
	group := filepath.Join(root, "group")
	if err := os.WriteFile(passwd, []byte("fixture:x:10001:10002:Fictional:/fictional:/bin/sh\n"), 0600); err != nil { t.Fatal(err) }
	if err := os.WriteFile(group, []byte("primary:x:10002:fixture\nsupplementary:x:10003:fixture\n"), 0600); err != nil { t.Fatal(err) }
	resolved, err := user.GetExecUserPath("fixture", nil, passwd, group)
	if err != nil { t.Fatal(err) }
	if resolved.Uid != 10001 || resolved.Gid != 10002 || resolved.Home != "/fictional" || len(resolved.Sgids) != 2 { t.Fatalf("wrong identity: %#v", resolved) }
	if err := os.WriteFile(group, bytes.Repeat([]byte{'\n'}, (10<<20)+1), 0600); err != nil { t.Fatal(err) }
	if _, err = user.GetExecUserPath("fixture", nil, passwd, group); err == nil { t.Fatal("group overflow must not return a partial identity") }
	if err := os.WriteFile(group, []byte("primary:x:10002:fixture\n"), 0600); err != nil { t.Fatal(err) }
	if err := os.WriteFile(passwd, bytes.Repeat([]byte{'\n'}, (10<<20)+1), 0600); err != nil { t.Fatal(err) }
	if _, err = user.GetExecUserPath("fixture", nil, passwd, group); err == nil { t.Fatal("passwd overflow must not return a partial identity") }
}
