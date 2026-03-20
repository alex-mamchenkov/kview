package dataplane

import (
	"testing"

	"kview/internal/kube/dto"
)

func TestListRestartSeverity(t *testing.T) {
	if ListRestartSeverity(0) != listRestartNone {
		t.Fatalf("0")
	}
	if ListRestartSeverity(4) != listRestartLow {
		t.Fatalf("low")
	}
	if ListRestartSeverity(7) != listRestartMedium {
		t.Fatalf("medium")
	}
	if ListRestartSeverity(25) != listRestartHigh {
		t.Fatalf("high")
	}
}

func TestEnrichPodListItemsForAPI(t *testing.T) {
	out := EnrichPodListItemsForAPI([]dto.PodListItemDTO{
		{Name: "a", Phase: "Running", Ready: "1/1", Restarts: 0},
		{Name: "b", Phase: "Pending", Ready: "0/1", Restarts: 0},
		{Name: "c", Phase: "Running", Ready: "0/1", Restarts: 4},
		{Name: "d", Phase: "Running", Ready: "1/1", Restarts: 4},
	})
	if out[0].ListHealthHint != podListHintOK || out[0].RestartSeverity != listRestartNone {
		t.Fatalf("row0: %+v", out[0])
	}
	if out[1].ListHealthHint != podListHintProblem {
		t.Fatalf("row1: %+v", out[1])
	}
	if out[2].ListHealthHint != podListHintProblem {
		t.Fatalf("row2 not ready: %+v", out[2])
	}
	if out[3].ListHealthHint != podListHintAttention {
		t.Fatalf("row3 restarts only: %+v", out[3])
	}
}

func TestEnrichDeploymentListItemsForAPI(t *testing.T) {
	out := EnrichDeploymentListItemsForAPI([]dto.DeploymentListItemDTO{
		{Status: "Available", Ready: "2/2"},
		{Status: "Progressing", Ready: "1/2", UpToDate: 2, Available: 1},
		{Status: "Unknown", Ready: "0/2", UpToDate: 2, Available: 0},
	})
	if out[0].HealthBucket != deployBucketHealthy || out[0].RolloutNeedsAttention {
		t.Fatalf("row0 %+v", out[0])
	}
	if out[1].HealthBucket != deployBucketProgressing {
		t.Fatalf("row1 bucket %+v", out[1])
	}
	if out[2].HealthBucket != deployBucketDegraded || !out[2].RolloutNeedsAttention {
		t.Fatalf("row2 %+v", out[2])
	}
}
