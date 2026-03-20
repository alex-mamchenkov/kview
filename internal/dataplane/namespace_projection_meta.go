package dataplane

// composeNamespaceSummaryProjectionMeta composes the SnapshotMetadata for the existing
// "mixed" namespace summary projection:
//   - Coverage is intentionally partial/inexact because the projection overlays dataplane-owned
//     snapshots on top of a legacy kube summary.
//   - Coarse state is computed separately from runtime errors + item count.
func composeNamespaceSummaryProjectionMeta(metas ...SnapshotMetadata) SnapshotMetadata {
	contract := ProjectionContract{
		Coverage:     CoverageClassPartial,
		Completeness: CompletenessClassInexact,
	}
	return contract.Apply(
		ObservedAtFromSnapshots(metas...),
		WorstFreshnessFromSnapshots(metas...),
		WorstDegradationFromSnapshots(metas...),
	)
}
