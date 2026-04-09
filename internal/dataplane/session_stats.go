package dataplane

import (
	"encoding/json"
	"sort"
	"sync"
	"time"
)

type dataplaneSessionStats struct {
	mu sync.Mutex

	startedAt time.Time

	requestsTotal  uint64
	freshHits      uint64
	misses         uint64
	fetchAttempts  uint64
	fetchErrors    uint64
	liveBytes      uint64
	hydratedBytes  uint64
	currentBytes   uint64
	currentCells   uint64
	bySource       map[string]*dataplaneSessionSourceStats
	byKind         map[ResourceKind]*dataplaneSessionKindStats
	cacheCellBytes map[dataplaneCacheCellKey]uint64
}

type dataplaneCacheCellKey struct {
	cluster   string
	kind      ResourceKind
	namespace string
}

type dataplaneSessionSourceStats struct {
	requests      uint64
	freshHits     uint64
	misses        uint64
	fetchAttempts uint64
	fetchErrors   uint64
}

type dataplaneSessionKindStats struct {
	requests      uint64
	freshHits     uint64
	misses        uint64
	fetchAttempts uint64
	fetchErrors   uint64
	liveBytes     uint64
	currentBytes  uint64
	currentCells  uint64
	hydratedBytes uint64
}

type DataplaneSessionStatsSnapshot struct {
	StartedAt     time.Time
	RequestsTotal uint64
	FreshHits     uint64
	Misses        uint64
	FetchAttempts uint64
	FetchErrors   uint64
	LiveBytes     uint64
	HydratedBytes uint64
	CurrentBytes  uint64
	CurrentCells  uint64
	BySource      []DataplaneSessionSourceSnapshot
	ByKind        []DataplaneSessionKindSnapshot
}

type DataplaneSessionSourceSnapshot struct {
	Source        string
	Requests      uint64
	FreshHits     uint64
	Misses        uint64
	FetchAttempts uint64
	FetchErrors   uint64
}

type DataplaneSessionKindSnapshot struct {
	Kind          ResourceKind
	Requests      uint64
	FreshHits     uint64
	Misses        uint64
	FetchAttempts uint64
	FetchErrors   uint64
	LiveBytes     uint64
	CurrentBytes  uint64
	CurrentCells  uint64
	HydratedBytes uint64
}

func newDataplaneSessionStats(now time.Time) *dataplaneSessionStats {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	return &dataplaneSessionStats{
		startedAt:      now.UTC(),
		bySource:       make(map[string]*dataplaneSessionSourceStats),
		byKind:         make(map[ResourceKind]*dataplaneSessionKindStats),
		cacheCellBytes: make(map[dataplaneCacheCellKey]uint64),
	}
}

func (st *dataplaneSessionStats) recordRequest(source string, kind ResourceKind, fresh bool) {
	if st == nil {
		return
	}
	source = normalizeDataplaneStatsSource(source)
	st.mu.Lock()
	defer st.mu.Unlock()

	st.requestsTotal++
	src := st.ensureSourceLocked(source)
	src.requests++
	k := st.ensureKindLocked(kind)
	k.requests++
	if fresh {
		st.freshHits++
		src.freshHits++
		k.freshHits++
		return
	}
	st.misses++
	src.misses++
	k.misses++
}

func (st *dataplaneSessionStats) recordFetchAttempt(source string, kind ResourceKind) {
	if st == nil {
		return
	}
	source = normalizeDataplaneStatsSource(source)
	st.mu.Lock()
	defer st.mu.Unlock()
	st.fetchAttempts++
	st.ensureSourceLocked(source).fetchAttempts++
	st.ensureKindLocked(kind).fetchAttempts++
}

func (st *dataplaneSessionStats) recordFetchResult(source string, kind ResourceKind, payloadBytes int, err error) {
	if st == nil {
		return
	}
	source = normalizeDataplaneStatsSource(source)
	st.mu.Lock()
	defer st.mu.Unlock()
	if err != nil {
		st.fetchErrors++
		st.ensureSourceLocked(source).fetchErrors++
		st.ensureKindLocked(kind).fetchErrors++
		return
	}
	if payloadBytes <= 0 {
		return
	}
	st.liveBytes += uint64(payloadBytes)
	st.ensureKindLocked(kind).liveBytes += uint64(payloadBytes)
}

func (st *dataplaneSessionStats) recordHydration(kind ResourceKind, payloadBytes int) {
	if st == nil || payloadBytes <= 0 {
		return
	}
	st.mu.Lock()
	defer st.mu.Unlock()
	st.hydratedBytes += uint64(payloadBytes)
	st.ensureKindLocked(kind).hydratedBytes += uint64(payloadBytes)
}

func (st *dataplaneSessionStats) recordCacheWrite(cluster string, kind ResourceKind, namespace string, payloadBytes int) {
	if st == nil || payloadBytes < 0 {
		return
	}
	key := dataplaneCacheCellKey{cluster: cluster, kind: kind, namespace: namespace}
	newBytes := uint64(payloadBytes)

	st.mu.Lock()
	defer st.mu.Unlock()

	oldBytes, existed := st.cacheCellBytes[key]
	st.cacheCellBytes[key] = newBytes
	if !existed {
		st.currentCells++
		st.ensureKindLocked(kind).currentCells++
	}

	if newBytes >= oldBytes {
		diff := newBytes - oldBytes
		st.currentBytes += diff
		st.ensureKindLocked(kind).currentBytes += diff
		return
	}
	diff := oldBytes - newBytes
	st.currentBytes -= diff
	st.ensureKindLocked(kind).currentBytes -= diff
}

func (st *dataplaneSessionStats) recordCacheDelete(cluster string, kind ResourceKind, namespace string) {
	if st == nil {
		return
	}
	key := dataplaneCacheCellKey{cluster: cluster, kind: kind, namespace: namespace}
	st.mu.Lock()
	defer st.mu.Unlock()
	oldBytes, existed := st.cacheCellBytes[key]
	if !existed {
		return
	}
	delete(st.cacheCellBytes, key)
	st.currentBytes -= oldBytes
	st.currentCells--
	k := st.ensureKindLocked(kind)
	k.currentBytes -= oldBytes
	k.currentCells--
}

func (st *dataplaneSessionStats) snapshot() DataplaneSessionStatsSnapshot {
	if st == nil {
		return DataplaneSessionStatsSnapshot{}
	}
	st.mu.Lock()
	defer st.mu.Unlock()

	out := DataplaneSessionStatsSnapshot{
		StartedAt:     st.startedAt,
		RequestsTotal: st.requestsTotal,
		FreshHits:     st.freshHits,
		Misses:        st.misses,
		FetchAttempts: st.fetchAttempts,
		FetchErrors:   st.fetchErrors,
		LiveBytes:     st.liveBytes,
		HydratedBytes: st.hydratedBytes,
		CurrentBytes:  st.currentBytes,
		CurrentCells:  st.currentCells,
		BySource:      make([]DataplaneSessionSourceSnapshot, 0, len(st.bySource)),
		ByKind:        make([]DataplaneSessionKindSnapshot, 0, len(st.byKind)),
	}

	for source, src := range st.bySource {
		out.BySource = append(out.BySource, DataplaneSessionSourceSnapshot{
			Source:        source,
			Requests:      src.requests,
			FreshHits:     src.freshHits,
			Misses:        src.misses,
			FetchAttempts: src.fetchAttempts,
			FetchErrors:   src.fetchErrors,
		})
	}
	sort.Slice(out.BySource, func(i, j int) bool {
		if out.BySource[i].Requests != out.BySource[j].Requests {
			return out.BySource[i].Requests > out.BySource[j].Requests
		}
		return out.BySource[i].Source < out.BySource[j].Source
	})

	for kind, k := range st.byKind {
		out.ByKind = append(out.ByKind, DataplaneSessionKindSnapshot{
			Kind:          kind,
			Requests:      k.requests,
			FreshHits:     k.freshHits,
			Misses:        k.misses,
			FetchAttempts: k.fetchAttempts,
			FetchErrors:   k.fetchErrors,
			LiveBytes:     k.liveBytes,
			CurrentBytes:  k.currentBytes,
			CurrentCells:  k.currentCells,
			HydratedBytes: k.hydratedBytes,
		})
	}
	sort.Slice(out.ByKind, func(i, j int) bool {
		if out.ByKind[i].FetchAttempts != out.ByKind[j].FetchAttempts {
			return out.ByKind[i].FetchAttempts > out.ByKind[j].FetchAttempts
		}
		return out.ByKind[i].Kind < out.ByKind[j].Kind
	})

	return out
}

func (st *dataplaneSessionStats) ensureSourceLocked(source string) *dataplaneSessionSourceStats {
	src := st.bySource[source]
	if src == nil {
		src = &dataplaneSessionSourceStats{}
		st.bySource[source] = src
	}
	return src
}

func (st *dataplaneSessionStats) ensureKindLocked(kind ResourceKind) *dataplaneSessionKindStats {
	k := st.byKind[kind]
	if k == nil {
		k = &dataplaneSessionKindStats{}
		st.byKind[kind] = k
	}
	return k
}

func normalizeDataplaneStatsSource(source string) string {
	if source == "" {
		return WorkSourceAPI
	}
	return source
}

func estimateSnapshotPayloadBytes(v any) int {
	if v == nil {
		return 0
	}
	payload, err := json.Marshal(v)
	if err != nil {
		return 0
	}
	return len(payload)
}
