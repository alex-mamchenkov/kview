package dataplane

import (
	"testing"
	"time"
)

func TestWorstFreshness_Order(t *testing.T) {
	if got := WorstFreshness(FreshnessClassHot, FreshnessClassWarm, FreshnessClassCold); got != FreshnessClassCold {
		t.Fatalf("expected cold as worst, got %q", got)
	}
	if got := WorstFreshness(FreshnessClassCold, FreshnessClassStale); got != FreshnessClassStale {
		t.Fatalf("expected stale as worst, got %q", got)
	}
	if got := WorstFreshness(FreshnessClassHot, FreshnessClassUnknown); got != FreshnessClassUnknown {
		t.Fatalf("expected unknown as worst, got %q", got)
	}
}

func TestWorstDegradation_Order(t *testing.T) {
	if got := WorstDegradation(DegradationClassNone, DegradationClassMinor); got != DegradationClassMinor {
		t.Fatalf("expected minor as worst, got %q", got)
	}
	if got := WorstDegradation(DegradationClassMinor, DegradationClassSevere); got != DegradationClassSevere {
		t.Fatalf("expected severe as worst, got %q", got)
	}
}

func TestObservedAtFromSnapshots_UsesMostRecent(t *testing.T) {
	now := time.Now().UTC()
	old := now.Add(-time.Minute)
	if got := ObservedAtFromSnapshots(
		SnapshotMetadata{ObservedAt: time.Time{}},
		SnapshotMetadata{ObservedAt: old},
		SnapshotMetadata{ObservedAt: now},
	); !got.Equal(now) {
		t.Fatalf("expected most recent non-zero timestamp")
	}
}

func TestProjectionCoarseState_Behavior(t *testing.T) {
	if got := ProjectionCoarseState(&NormalizedError{Class: NormalizedErrorClassAccessDenied}, 10); got != "denied" {
		t.Fatalf("expected denied, got %q", got)
	}
	if got := ProjectionCoarseState(&NormalizedError{Class: NormalizedErrorClassRateLimited}, 10); got != "degraded" {
		t.Fatalf("expected degraded, got %q", got)
	}
	if got := ProjectionCoarseState(nil, 0); got != "empty" {
		t.Fatalf("expected empty, got %q", got)
	}
	if got := ProjectionCoarseState(nil, 3); got != "ok" {
		t.Fatalf("expected ok, got %q", got)
	}
}

func TestMixedSnapshotProjectionContract_PartialCoverageDoesNotDegradeState(t *testing.T) {
	contract := ProjectionContract{
		Coverage:     CoverageClassPartial,
		Completeness: CompletenessClassInexact,
	}
	meta := contract.Apply(time.Now().UTC(), FreshnessClassHot, DegradationClassNone)
	if meta.Coverage != CoverageClassPartial {
		t.Fatalf("expected partial coverage, got %q", meta.Coverage)
	}
	if meta.Completeness != CompletenessClassInexact {
		t.Fatalf("expected inexact completeness, got %q", meta.Completeness)
	}

	// No runtime error -> coarse state should be ok/empty based only on item count,
	// not on the fact that the projection is partial by design.
	if got := ProjectionCoarseState(nil, 5); got != "ok" {
		t.Fatalf("expected ok despite partial coverage, got %q", got)
	}
	if got := ProjectionCoarseState(nil, 0); got != "empty" {
		t.Fatalf("expected empty despite partial coverage, got %q", got)
	}
}
