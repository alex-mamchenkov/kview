package persistentvolumeclaims

import (
	"reflect"
	"testing"

	"github.com/korex-labs/kview/v5/internal/kube/dto"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func strPtr(v string) *string { return &v }

func TestMapPVCDataSource(t *testing.T) {
	group := "snapshot.storage.k8s.io"
	got := mapPVCDataSource(&corev1.TypedLocalObjectReference{
		APIGroup: &group,
		Kind:     "VolumeSnapshot",
		Name:     "snap-1",
	})
	want := &dto.PersistentVolumeClaimDataRefDTO{
		APIGroup: "snapshot.storage.k8s.io",
		Kind:     "VolumeSnapshot",
		Name:     "snap-1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mapPVCDataSource() = %#v, want %#v", got, want)
	}
	if got := mapPVCDataSource(nil); got != nil {
		t.Fatalf("nil data source = %#v, want nil", got)
	}
}

func TestMapPVCDataSourceRef(t *testing.T) {
	got := mapPVCDataSourceRef(&corev1.TypedObjectReference{
		APIGroup: strPtr("custom.io"),
		Kind:     "Backup",
		Name:     "backup-1",
	})
	want := &dto.PersistentVolumeClaimDataRefDTO{
		APIGroup: "custom.io",
		Kind:     "Backup",
		Name:     "backup-1",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mapPVCDataSourceRef() = %#v, want %#v", got, want)
	}
	if got := mapPVCDataSourceRef(nil); got != nil {
		t.Fatalf("nil data source ref = %#v, want nil", got)
	}
}

func TestMapLabelSelector(t *testing.T) {
	got := mapLabelSelector(&metav1.LabelSelector{
		MatchLabels: map[string]string{"app": "api"},
		MatchExpressions: []metav1.LabelSelectorRequirement{
			{Key: "tier", Operator: metav1.LabelSelectorOpIn, Values: []string{"backend", "worker"}},
		},
	})
	want := &dto.LabelSelectorDTO{
		MatchLabels: map[string]string{"app": "api"},
		MatchExpressions: []dto.LabelSelectorExpression{
			{Key: "tier", Operator: "In", Values: []string{"backend", "worker"}},
		},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("mapLabelSelector() = %#v, want %#v", got, want)
	}
	if got := mapLabelSelector(&metav1.LabelSelector{}); got != nil {
		t.Fatalf("empty selector = %#v, want nil", got)
	}
}
