package dataplane

import "time"

// ProjectionContract declares how complete/complete a projection is logically expected
// to be, independent from runtime failure.
type ProjectionContract struct {
	Coverage     CoverageClass
	Completeness CompletenessClass
}

// Apply assembles the final SnapshotMetadata for a projection contract.
// Note: Coarse state is intentionally computed elsewhere (from runtime error + item count),
// so that "partial by design" never automatically turns into "degraded".
func (c ProjectionContract) Apply(observedAt time.Time, freshness FreshnessClass, degradation DegradationClass) SnapshotMetadata {
	return SnapshotMetadata{
		ObservedAt:   observedAt,
		Freshness:    freshness,
		Coverage:     c.Coverage,
		Degradation:  degradation,
		Completeness: c.Completeness,
	}
}

// ProjectionCoarseState derives the coarse UI state from runtime observation error and
// a meaningful item count for the projection view.
func ProjectionCoarseState(err *NormalizedError, itemsCount int) string {
	return CoarseState(err, itemsCount)
}
