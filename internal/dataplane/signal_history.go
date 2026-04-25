package dataplane

import (
	"sort"
	"strings"
	"time"
)

type signalHistoryRecord struct {
	FirstSeenAt int64  `json:"firstSeenAt"`
	LastSeenAt  int64  `json:"lastSeenAt"`
	SeenCount   uint64 `json:"seenCount,omitempty"`
}

func (m *manager) ensureSignalHistory(clusterName string) {
	if clusterName == "" {
		return
	}
	m.signalHistoryMu.RLock()
	_, ok := m.signalHistory[clusterName]
	m.signalHistoryMu.RUnlock()
	if ok {
		return
	}
	loaded := map[string]signalHistoryRecord{}
	if sp := m.currentPersistence(); sp != nil {
		if hist, err := sp.LoadSignalHistory(clusterName); err == nil && hist != nil {
			loaded = hist
		}
	}
	m.signalHistoryMu.Lock()
	if _, ok := m.signalHistory[clusterName]; !ok {
		m.signalHistory[clusterName] = loaded
	}
	m.signalHistoryMu.Unlock()
}

func (m *manager) attachSignalHistory(clusterName string, observedAt time.Time, items ...ClusterDashboardSignal) []ClusterDashboardSignal {
	if len(items) == 0 || clusterName == "" {
		return items
	}
	m.ensureSignalHistory(clusterName)
	observedUnix := observedAt.UTC().Unix()
	changed := map[string]signalHistoryRecord{}

	m.signalHistoryMu.Lock()
	clusterHistory := m.signalHistory[clusterName]
	for i := range items {
		key := signalHistoryIdentity(items[i])
		if key == "" {
			continue
		}
		rec := clusterHistory[key]
		if rec.FirstSeenAt <= 0 {
			rec.FirstSeenAt = observedUnix
		}
		if observedUnix > rec.LastSeenAt {
			rec.LastSeenAt = observedUnix
		}
		rec.SeenCount++
		clusterHistory[key] = rec
		changed[key] = rec
		items[i].HistoryKey = key
		items[i].FirstSeenAt = rec.FirstSeenAt
		items[i].LastSeenAt = rec.LastSeenAt
	}
	m.signalHistoryMu.Unlock()

	if sp := m.currentPersistence(); sp != nil && len(changed) > 0 {
		_ = sp.UpsertSignalHistory(clusterName, changed)
	}
	return items
}

func signalHistoryIdentity(item ClusterDashboardSignal) string {
	if trimmed := strings.TrimSpace(item.HistoryKey); trimmed != "" {
		return trimmed
	}
	parts := []string{
		strings.TrimSpace(item.SignalType),
		strings.TrimSpace(item.Scope),
		strings.TrimSpace(item.ScopeLocation),
		strings.TrimSpace(signalIdentityKind(item)),
		strings.TrimSpace(signalIdentityName(item)),
	}
	filtered := parts[:0]
	for _, part := range parts {
		if part != "" {
			filtered = append(filtered, part)
		}
	}
	return strings.Join(filtered, "|")
}

func signalIdentityKind(item ClusterDashboardSignal) string {
	if item.ResourceKind != "" {
		return item.ResourceKind
	}
	return item.Kind
}

func signalIdentityName(item ClusterDashboardSignal) string {
	if item.ResourceName != "" {
		return item.ResourceName
	}
	if item.Name != "" {
		return item.Name
	}
	return item.Namespace
}

func sortDashboardSignalsForItems(items []ClusterDashboardSignal, sortBy string) {
	sortBy = strings.TrimSpace(sortBy)
	if sortBy == "" || sortBy == "priority" || len(items) <= 1 {
		return
	}
	sort.Slice(items, func(i, j int) bool {
		switch sortBy {
		case "discovered_desc":
			if items[i].FirstSeenAt != items[j].FirstSeenAt {
				return items[i].FirstSeenAt > items[j].FirstSeenAt
			}
		case "discovered_asc":
			if items[i].FirstSeenAt != items[j].FirstSeenAt {
				return items[i].FirstSeenAt < items[j].FirstSeenAt
			}
		case "last_seen_desc":
			if items[i].LastSeenAt != items[j].LastSeenAt {
				return items[i].LastSeenAt > items[j].LastSeenAt
			}
		case "last_seen_asc":
			if items[i].LastSeenAt != items[j].LastSeenAt {
				return items[i].LastSeenAt < items[j].LastSeenAt
			}
		default:
			return dashboardSignalLess(items[i], items[j])
		}
		return dashboardSignalLess(items[i], items[j])
	})
}

func dashboardSignalLess(a, b ClusterDashboardSignal) bool {
	if sa, sb := dashboardSignalSeverityPriority(a.Severity), dashboardSignalSeverityPriority(b.Severity); sa != sb {
		return sa < sb
	}
	if pa, pb := dashboardSignalPriority(a), dashboardSignalPriority(b); pa != pb {
		return pa < pb
	}
	if ka, kb := dashboardSignalKindPriority(a.Kind), dashboardSignalKindPriority(b.Kind); ka != kb {
		return ka < kb
	}
	if a.Score != b.Score {
		return a.Score > b.Score
	}
	if a.Namespace != b.Namespace {
		return a.Namespace < b.Namespace
	}
	if a.Kind != b.Kind {
		return a.Kind < b.Kind
	}
	return a.Name < b.Name
}
