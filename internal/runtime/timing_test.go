package runtime

import (
	"testing"
	"time"
)

func TestWithDerivedTiming_RunningUsesNow(t *testing.T) {
	start := time.Now().UTC().Add(-5 * time.Second)
	a := Activity{
		Status:    ActivityStatusRunning,
		CreatedAt: start,
		StartedAt: start,
	}
	got := WithDerivedTiming(a)
	if got.ExecutionMs < 4900 {
		t.Fatalf("executionMs too small: %d", got.ExecutionMs)
	}
}

func TestWithDerivedTiming_StoppedUsesUpdatedAt(t *testing.T) {
	start := time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	end := start.Add(12 * time.Second)
	a := Activity{
		Status:    ActivityStatusStopped,
		CreatedAt: start,
		UpdatedAt: end,
	}
	got := WithDerivedTiming(a)
	if got.ExecutionMs != 12000 {
		t.Fatalf("want 12000ms, got %d", got.ExecutionMs)
	}
}
