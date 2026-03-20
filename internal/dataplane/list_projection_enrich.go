package dataplane

import (
	"strconv"
	"strings"

	"kview/internal/kube/dto"
)

const (
	podListHintOK        = "ok"
	podListHintAttention = "attention"
	podListHintProblem   = "problem"

	listRestartNone   = "none"
	listRestartLow    = "low"
	listRestartMedium = "medium"
	listRestartHigh   = "high"

	deployBucketHealthy     = "healthy"
	deployBucketProgressing = "progressing"
	deployBucketDegraded    = "degraded"
	deployBucketUnknown     = "unknown"
)

// ListRestartSeverity maps total pod restarts to a coarse bucket for list APIs (zero → none).
func ListRestartSeverity(restarts int32) string {
	if restarts <= 0 {
		return listRestartNone
	}
	switch {
	case restarts >= 20:
		return listRestartHigh
	case restarts >= 5:
		return listRestartMedium
	default:
		return listRestartLow
	}
}

// EnrichPodListItemsForAPI returns a shallow copy slice with snapshot-derived list hints per row.
func EnrichPodListItemsForAPI(items []dto.PodListItemDTO) []dto.PodListItemDTO {
	if len(items) == 0 {
		return items
	}
	out := make([]dto.PodListItemDTO, len(items))
	for i := range items {
		p := items[i]
		p.RestartSeverity = ListRestartSeverity(p.Restarts)
		p.ListHealthHint = podListHealthHint(p)
		out[i] = p
	}
	return out
}

func podListHealthHint(p dto.PodListItemDTO) string {
	if p.Phase == "Failed" || p.Phase == "Pending" {
		return podListHintProblem
	}
	if p.Restarts >= 10 {
		return podListHintProblem
	}
	if podListNotReady(p.Ready) {
		return podListHintProblem
	}
	if p.Restarts >= 3 {
		return podListHintAttention
	}
	if p.LastEvent != nil && p.LastEvent.Type == "Warning" {
		return podListHintAttention
	}
	return podListHintOK
}

func podListNotReady(ready string) bool {
	parts := strings.Split(ready, "/")
	if len(parts) != 2 {
		return false
	}
	a, e1 := strconv.Atoi(parts[0])
	b, e2 := strconv.Atoi(parts[1])
	if e1 != nil || e2 != nil {
		return false
	}
	return b > 0 && a < b
}

// EnrichDeploymentListItemsForAPI returns a shallow copy with snapshot-derived rollout hints.
func EnrichDeploymentListItemsForAPI(items []dto.DeploymentListItemDTO) []dto.DeploymentListItemDTO {
	if len(items) == 0 {
		return items
	}
	out := make([]dto.DeploymentListItemDTO, len(items))
	for i := range items {
		d := items[i]
		bucket, attention := deploymentListSignals(d)
		d.HealthBucket = bucket
		d.RolloutNeedsAttention = attention
		out[i] = d
	}
	return out
}

func deploymentListSignals(d dto.DeploymentListItemDTO) (bucket string, needsAttention bool) {
	switch d.Status {
	case "Available":
		return deployBucketHealthy, false
	case "Progressing":
		return deployBucketProgressing, false
	case "Paused", "ScaledDown":
		return deployBucketUnknown, false
	}
	if d.UpToDate > 0 && d.Available < d.UpToDate {
		return deployBucketDegraded, true
	}
	if podListNotReady(d.Ready) {
		return deployBucketDegraded, true
	}
	return deployBucketUnknown, false
}
