package dataplane

import (
	"context"
	"errors"
	"testing"
	"time"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

type persistenceFailingClientsProvider struct{}

func (persistenceFailingClientsProvider) GetClientsForContext(context.Context, string) (*cluster.Clients, string, error) {
	return nil, "", errors.New("cluster unavailable")
}

func TestBoltSnapshotPersistenceRoundTripAndIndexesNames(t *testing.T) {
	store, err := openBoltSnapshotPersistence(t.TempDir() + "/cache.bbolt")
	if err != nil {
		t.Fatalf("open persistence: %v", err)
	}
	defer store.Close()

	observed := time.Now().UTC().Add(-time.Minute)
	snap := PodsSnapshot{
		Items: []dto.PodListItemDTO{{Name: "api-7f", Namespace: "app"}},
		Meta: SnapshotMetadata{
			ObservedAt:   observed,
			Freshness:    FreshnessClassHot,
			Coverage:     CoverageClassFull,
			Degradation:  DegradationClassNone,
			Completeness: CompletenessClassComplete,
		},
	}
	if err := store.Save("ctx", ResourceKindPods, "app", snap); err != nil {
		t.Fatalf("save snapshot: %v", err)
	}

	var got PodsSnapshot
	ok, err := store.Load("ctx", ResourceKindPods, "app", &got)
	if err != nil {
		t.Fatalf("load snapshot: %v", err)
	}
	if !ok || len(got.Items) != 1 || got.Items[0].Name != "api-7f" {
		t.Fatalf("loaded snapshot = ok %v snap %+v", ok, got)
	}

	rows := searchRowsFromSnapshot("ctx", ResourceKindPods, "app", got)
	if len(rows) != 1 || rows[0].Name != "api-7f" || rows[0].Namespace != "app" {
		t.Fatalf("search rows = %+v", rows)
	}

	indexRows, err := store.SearchNamePrefix("api", 10)
	if err != nil {
		t.Fatalf("search index: %v", err)
	}
	if len(indexRows) != 1 || indexRows[0].Kind != string(ResourceKindPods) || indexRows[0].Name != "api-7f" {
		t.Fatalf("index rows = %+v", indexRows)
	}
}

func TestExecuteNamespacedSnapshotUsesPersistedFallbackOnLiveFailure(t *testing.T) {
	store, err := openBoltSnapshotPersistence(t.TempDir() + "/cache.bbolt")
	if err != nil {
		t.Fatalf("open persistence: %v", err)
	}
	defer store.Close()

	observed := time.Now().UTC().Add(-time.Hour)
	persisted := PodsSnapshot{
		Items: []dto.PodListItemDTO{{Name: "stale-pod", Namespace: "app"}},
		Meta: SnapshotMetadata{
			ObservedAt:   observed,
			Freshness:    FreshnessClassHot,
			Coverage:     CoverageClassFull,
			Degradation:  DegradationClassNone,
			Completeness: CompletenessClassComplete,
		},
	}
	if err := store.Save("ctx", ResourceKindPods, "app", persisted); err != nil {
		t.Fatalf("save persisted snapshot: %v", err)
	}

	policy := DefaultDataplanePolicy()
	policy.Persistence.Enabled = true
	plane := newClusterPlane("ctx", ProfileFocused, DiscoveryModeTargeted, ObservationScope{}, func() DataplanePolicy {
		return policy
	}, func() snapshotPersistence {
		return store
	})

	snap, err := plane.PodsSnapshot(context.Background(), newWorkScheduler(1), persistenceFailingClientsProvider{}, "app", WorkPriorityCritical)
	if err == nil {
		t.Fatalf("expected live refresh error")
	}
	if len(snap.Items) != 1 || snap.Items[0].Name != "stale-pod" {
		t.Fatalf("fallback items = %+v", snap.Items)
	}
	if snap.Meta.Freshness != FreshnessClassStale {
		t.Fatalf("fallback freshness = %q", snap.Meta.Freshness)
	}
	if snap.Err == nil || snap.Err.Class != NormalizedErrorClassUnknown {
		t.Fatalf("fallback normalized error = %+v", snap.Err)
	}
}
