// SPDX-License-Identifier: Apache-2.0
// Isolated SDK-contract tests for the existing FerretDB MCP adapter.
package mcp

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func TestUtilibreMCPV1Contract(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	srv := mcp.NewServer(&mcp.Implementation{Name: "Fictional FerretDB check", Version: "test"}, nil)
	newServer(logger, nil).addTools(srv)
	serverTransport, clientTransport := mcp.NewInMemoryTransports()
	ss, err := srv.Connect(ctx, serverTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer ss.Close()
	client := mcp.NewClient(&mcp.Implementation{Name: "Fictional local client", Version: "test"}, nil)
	cs, err := client.Connect(ctx, clientTransport, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer cs.Close()
	tools, err := cs.ListTools(ctx, nil)
	if err != nil || len(tools.Tools) != 3 {
		t.Fatalf("Expected exactly three registered tools: %v", err)
	}
	names := map[string]bool{}
	for _, tool := range tools.Tools {
		names[tool.Name] = true
	}
	for _, name := range []string{"find", "listCollections", "listDatabases"} {
		if !names[name] {
			t.Fatalf("Missing existing tool %s", name)
		}
	}
	// The SDK must reject bad arguments before invoking the nil DB middleware.
	res, err := cs.CallTool(ctx, &mcp.CallToolParams{Name: "find", Arguments: map[string]any{"collection": "fictional", "database": "fictional", "limit": "not-a-number"}})
	if err == nil && (res == nil || !res.IsError) {
		t.Fatal("Malformed input was accepted")
	}
	res, err = cs.CallTool(ctx, &mcp.CallToolParams{Name: "notAnExistingTool", Arguments: map[string]any{}})
	if err == nil && (res == nil || !res.IsError) {
		t.Fatal("Unknown tool was accepted")
	}
}

func TestUtilibreMCPCrossOriginGuard(t *testing.T) {
	srv := mcp.NewServer(&mcp.Implementation{Name: "Fictional guard check", Version: "test"}, nil)
	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return srv }, nil)
	for _, scenario := range []struct{ contentType, origin string }{
		{"text/plain", ""},
		{"application/json", "https://unrelated.example.invalid"},
	} {
		req := httptest.NewRequest(http.MethodPost, "http://localhost/mcp", strings.NewReader(`{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}`))
		req.Header.Set("Content-Type", scenario.contentType)
		req.Header.Set("Accept", "application/json, text/event-stream")
		if scenario.origin != "" {
			req.Header.Set("Origin", scenario.origin)
			req.Header.Set("Sec-Fetch-Site", "cross-site")
		}
		response := httptest.NewRecorder()
		handler.ServeHTTP(response, req)
		if response.Code < 400 || response.Code >= 500 {
			t.Fatalf("Request guard returned %d", response.Code)
		}
	}
}
