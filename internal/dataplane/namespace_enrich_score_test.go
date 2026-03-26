package dataplane

import (
	"fmt"
	"net/url"
	"testing"
)

func TestBuildEnrichmentWorkOrder_Priority(t *testing.T) {
	order := []string{"zebra", "apple", "kube-system", "default"}
	hints := NamespaceEnrichHints{
		Focus:    "default",
		Recent:   []string{"kube-system", "apple"},
		Favorite: map[string]struct{}{"zebra": {}},
	}
	got := buildEnrichmentWorkOrder(order, hints)
	if len(got) != 4 {
		t.Fatalf("len %d, want 4: %v", len(got), got)
	}
	if got[0] != "default" {
		t.Fatalf("focus should win first: got %v", got)
	}
	seen := map[string]bool{}
	for _, n := range got {
		seen[n] = true
	}
	for _, want := range []string{"default", "zebra", "kube-system", "apple"} {
		if !seen[want] {
			t.Fatalf("missing %q in %v", want, got)
		}
	}
}

func TestBuildEnrichmentWorkOrder_Cap(t *testing.T) {
	order := make([]string, 50)
	for i := range order {
		order[i] = fmt.Sprintf("ns-%02d", i)
	}
	hints := NamespaceEnrichHints{Favorite: map[string]struct{}{}}
	for _, n := range order {
		hints.Favorite[n] = struct{}{}
	}
	got := buildEnrichmentWorkOrder(order, hints)
	if len(got) != nsEnrichMaxTargets {
		t.Fatalf("len %d, want cap %d", len(got), nsEnrichMaxTargets)
	}
}

func TestParseNamespaceEnrichHints(t *testing.T) {
	q := url.Values{}
	q.Set("enrichFocus", " ns1 ")
	q.Set("enrichRecent", "b,c")
	q.Set("enrichFav", "c,d")
	h := ParseNamespaceEnrichHints(q)
	if h.Focus != "ns1" {
		t.Fatalf("focus %q", h.Focus)
	}
	if len(h.Recent) != 2 || h.Recent[0] != "b" {
		t.Fatalf("recent %+v", h.Recent)
	}
	if _, ok := h.Favorite["c"]; !ok || len(h.Favorite) != 2 {
		t.Fatalf("fav %+v", h.Favorite)
	}
}
