package storage

import (
	"context"
	"github.com/gin-gonic/gin"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUtilibreAssetCanonicalAuthorization(t *testing.T) {
	gin.SetMode(gin.TestMode)
	store := &LocalStorage{BasePath: t.TempDir()}
	if err := store.Save(context.Background(), "users/7/fictional.txt", strings.NewReader("fictional private attachment")); err != nil {
		t.Fatal(err)
	}
	if err := store.Save(context.Background(), "profiles/7/fictional.txt", strings.NewReader("fictional public profile")); err != nil {
		t.Fatal(err)
	}
	signer := &URLSignerLocal{Secret: []byte("fictional-unit-test-secret-not-a-runtime-key")}
	h := &Handler{storage: store, signer: signer}
	signed, err := signer.Sign("users/7/fictional.txt")
	if err != nil {
		t.Fatal(err)
	}
	cases := []struct {
		path string
		want int
	}{
		{"users/7/fictional.txt", http.StatusForbidden},
		{"profiles/../users/7/fictional.txt", http.StatusForbidden},
		{"profiles/%2e%2e/users/7/fictional.txt", http.StatusForbidden},
		{"profiles/7/fictional.txt", http.StatusOK},
		{signed, http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/assets/"+tc.path, nil)
			c.Params = gin.Params{{Key: "filepath", Value: "/" + strings.Split(tc.path, "?")[0]}}
			h.AssetHandler(c)
			if w.Code != tc.want {
				t.Fatalf("got %d want %d", w.Code, tc.want)
			}
		})
	}
}
