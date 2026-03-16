package dataplane

import (
	"errors"
	"testing"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// fakeManagerMinimal provides just enough for NamespaceSummaryProjection tests.
type fakeManagerMinimal struct {
	manager
}

func TestNamespaceSummaryProjection_DeniedSetsStateDenied(t *testing.T) {
	n := NormalizeError(apierrors.NewForbidden(schema.GroupResource{Group: "", Resource: "namespaces"}, "", errors.New("forbidden")))
	if n.Class != NormalizedErrorClassAccessDenied {
		t.Fatalf("expected AccessDenied, got %q", n.Class)
	}
}

