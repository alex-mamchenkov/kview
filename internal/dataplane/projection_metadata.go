package dataplane

import "time"

// ObservedAtFromSnapshots composes an ObservedAt timestamp from multiple snapshot metadata
// by taking the most recent non-zero value.
func ObservedAtFromSnapshots(metas ...SnapshotMetadata) time.Time {
	var out time.Time
	for _, m := range metas {
		if m.ObservedAt.After(out) {
			out = m.ObservedAt
		}
	}
	return out
}

// WorstFreshness picks the worst (most degraded) freshness class using the ordering:
// hot < warm < cold < stale < unknown.
func WorstFreshness(values ...FreshnessClass) FreshnessClass {
	if len(values) == 0 {
		return FreshnessClassUnknown
	}

	order := map[FreshnessClass]int{
		FreshnessClassHot:     0,
		FreshnessClassWarm:    1,
		FreshnessClassCold:    2,
		FreshnessClassStale:   3,
		FreshnessClassUnknown: 4,
	}

	worst := values[0]
	worstOrder := order[worst]
	for _, v := range values[1:] {
		if order[v] > worstOrder {
			worst = v
			worstOrder = order[v]
		}
	}
	return worst
}

func WorstFreshnessFromSnapshots(metas ...SnapshotMetadata) FreshnessClass {
	if len(metas) == 0 {
		return FreshnessClassUnknown
	}
	values := make([]FreshnessClass, 0, len(metas))
	for _, m := range metas {
		values = append(values, m.Freshness)
	}
	return WorstFreshness(values...)
}

// WorstDegradation picks the worst (most degraded) degradation class using the ordering:
// none < minor < severe.
func WorstDegradation(values ...DegradationClass) DegradationClass {
	if len(values) == 0 {
		return DegradationClassNone
	}

	order := map[DegradationClass]int{
		DegradationClassNone:   0,
		DegradationClassMinor:  1,
		DegradationClassSevere: 2,
	}

	worst := values[0]
	worstOrder := order[worst]
	for _, v := range values[1:] {
		if order[v] > worstOrder {
			worst = v
			worstOrder = order[v]
		}
	}
	return worst
}

func WorstDegradationFromSnapshots(metas ...SnapshotMetadata) DegradationClass {
	if len(metas) == 0 {
		return DegradationClassNone
	}
	values := make([]DegradationClass, 0, len(metas))
	for _, m := range metas {
		values = append(values, m.Degradation)
	}
	return WorstDegradation(values...)
}

// FirstNonNilNormalizedError returns the first non-nil normalized error in the provided order.
func FirstNonNilNormalizedError(items ...*NormalizedError) *NormalizedError {
	for _, n := range items {
		if n != nil {
			return n
		}
	}
	return nil
}

// FirstError returns the first non-nil error in the provided order.
func FirstError(items ...error) error {
	for _, err := range items {
		if err != nil {
			return err
		}
	}
	return nil
}
