package dataplane

import "time"

// Signal threshold constants replace magic numbers spread across dataplane files.
// Thresholds that map to policy knobs are documented as such; those listed as
// "fixed presentation threshold" are intentionally not policy-controlled.

const (
	// signalRestartMinThreshold is the default minimum restart count for raising
	// a pod restart signal. The runtime value is overridden by
	// policy.Dashboard.RestartElevatedThreshold where available.
	signalRestartMinThreshold int32 = 5

	// signalRestartMedThreshold is the restart count at which severity escalates
	// from medium to high (fixed presentation threshold).
	signalRestartMedThreshold int32 = 20

	// signalPodRestartNoteThreshold is the restart count used in list/row
	// projections to flag a pod as problematic (fixed presentation threshold).
	signalPodRestartNoteThreshold int32 = 10

	signalLongRunningJobDuration    = 6 * time.Hour
	signalCronJobNoSuccessDuration  = 24 * time.Hour
	signalStaleHelmReleaseDuration  = 15 * time.Minute
	signalUnusedResourceAgeDuration = 24 * time.Hour

	// signalPodYoungRestartDuration is the "young pod" window used to emit a
	// pod_young_frequent_restarts signal for pods that have accumulated many
	// restarts in a short lifetime (fixed presentation threshold). Matches the
	// heuristic previously computed client-side in the pod drawer.
	signalPodYoungRestartDuration = 30 * time.Minute

	// signalDeploymentUnavailableDuration is the minimum Available=False
	// duration required to emit a deployment_unavailable signal (fixed
	// presentation threshold). Matches the heuristic previously computed
	// client-side in the deployment drawer.
	signalDeploymentUnavailableDuration = 10 * time.Minute

	// quotaWarnRatio / quotaCritRatio are the quota utilisation thresholds
	// for warning and critical severity, shared by signal detectors and list rows.
	quotaWarnRatio = 0.8
	quotaCritRatio = 0.9

	// derivedNodeElevatedRestartMin / derivedNodeNonRunningMin drive the derived
	// node severity in buildDerivedNodesProjection and related list hints.
	derivedNodeElevatedRestartMin = 3
	derivedNodeNonRunningMin      = 5
)
