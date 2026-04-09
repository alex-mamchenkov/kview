package dataplane

import (
	"testing"
	"time"
)

func TestDataplaneSessionStatsTracksRequestsAndCacheBytes(t *testing.T) {
	st := newDataplaneSessionStats(time.Date(2026, 4, 10, 9, 0, 0, 0, time.UTC))

	st.recordRequest(WorkSourceAPI, ResourceKindPods, false)
	st.recordFetchAttempt(WorkSourceAPI, ResourceKindPods)
	st.recordFetchResult(WorkSourceAPI, ResourceKindPods, 512, nil)
	st.recordCacheWrite("ctx", ResourceKindPods, "app", 256)
	st.recordRequest(WorkSourceProjection, ResourceKindPods, true)
	st.recordHydration(ResourceKindPods, 128)

	snap := st.snapshot()
	if snap.RequestsTotal != 2 {
		t.Fatalf("requests total = %d, want 2", snap.RequestsTotal)
	}
	if snap.FreshHits != 1 {
		t.Fatalf("fresh hits = %d, want 1", snap.FreshHits)
	}
	if snap.Misses != 1 {
		t.Fatalf("misses = %d, want 1", snap.Misses)
	}
	if snap.FetchAttempts != 1 {
		t.Fatalf("fetch attempts = %d, want 1", snap.FetchAttempts)
	}
	if snap.LiveBytes != 512 {
		t.Fatalf("live bytes = %d, want 512", snap.LiveBytes)
	}
	if snap.HydratedBytes != 128 {
		t.Fatalf("hydrated bytes = %d, want 128", snap.HydratedBytes)
	}
	if snap.CurrentBytes != 256 || snap.CurrentCells != 1 {
		t.Fatalf("cache = %d bytes / %d cells, want 256 / 1", snap.CurrentBytes, snap.CurrentCells)
	}
	if len(snap.BySource) != 2 {
		t.Fatalf("sources = %d, want 2", len(snap.BySource))
	}
	if len(snap.ByKind) != 1 {
		t.Fatalf("kinds = %d, want 1", len(snap.ByKind))
	}
}

func TestDashboardDataplaneStatsDerivesRatiosAndRunTimes(t *testing.T) {
	now := time.Date(2026, 4, 10, 10, 0, 0, 0, time.UTC)
	session := DataplaneSessionStatsSnapshot{
		StartedAt:     now.Add(-10 * time.Minute),
		RequestsTotal: 20,
		FreshHits:     15,
		Misses:        5,
		FetchAttempts: 6,
		FetchErrors:   1,
		LiveBytes:     1200,
		HydratedBytes: 200,
		CurrentBytes:  800,
		CurrentCells:  4,
	}
	runs := SchedulerRunStatsSnapshot{
		ByPriority: []PriorityRunStats{
			{Priority: WorkPriorityCritical, Runs: 4, Total: 400 * time.Millisecond, Max: 150 * time.Millisecond},
			{Priority: WorkPriorityHigh, Runs: 2, Total: 200 * time.Millisecond, Max: 120 * time.Millisecond},
		},
		Preemptions: 3,
	}

	stats := dashboardDataplaneStatsFromSnapshots(session, runs, now)
	if stats.Requests.HitRatio != 75 {
		t.Fatalf("hit ratio = %v, want 75", stats.Requests.HitRatio)
	}
	if stats.Cache.AvgBytesPerSnapshot != 200 {
		t.Fatalf("avg bytes per snapshot = %d, want 200", stats.Cache.AvgBytesPerSnapshot)
	}
	if stats.Traffic.AvgBytesPerFetch != 200 {
		t.Fatalf("avg bytes per fetch = %d, want 200", stats.Traffic.AvgBytesPerFetch)
	}
	if stats.Execution.Runs != 6 {
		t.Fatalf("runs = %d, want 6", stats.Execution.Runs)
	}
	if stats.Execution.AvgRunMs != 100 {
		t.Fatalf("avg run ms = %d, want 100", stats.Execution.AvgRunMs)
	}
	if stats.Execution.MaxRunMs != 150 {
		t.Fatalf("max run ms = %d, want 150", stats.Execution.MaxRunMs)
	}
	if stats.Execution.Preemptions != 3 {
		t.Fatalf("preemptions = %d, want 3", stats.Execution.Preemptions)
	}
}
