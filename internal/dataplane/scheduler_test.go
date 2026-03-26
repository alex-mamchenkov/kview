package dataplane

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestWorkScheduler_StatsRecordRunDuration(t *testing.T) {
	s := newWorkScheduler(2)
	ctx := context.Background()
	key := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindPods, Namespace: "ns"}

	err := s.Run(ctx, WorkPriorityCritical, key, func(runCtx context.Context) error {
		time.Sleep(20 * time.Millisecond)
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	st := s.StatsSnapshot()
	if len(st.ByPriority) != 1 || st.ByPriority[0].Priority != WorkPriorityCritical {
		t.Fatalf("stats: %+v", st.ByPriority)
	}
	if st.ByPriority[0].Runs != 1 || st.ByPriority[0].Total < 15*time.Millisecond {
		t.Fatalf("expected at least ~20ms total, got %+v", st.ByPriority[0])
	}
	if len(st.ByKind) != 1 || st.ByKind[0].Kind != ResourceKindPods {
		t.Fatalf("by kind: %+v", st.ByKind)
	}
}

func TestWorkScheduler_PreemptsLowerPriority(t *testing.T) {
	s := newWorkScheduler(1)
	ctx := context.Background()

	var lowRunning atomic.Bool
	var lowDone sync.WaitGroup
	lowDone.Add(1)

	keyLow := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindNodes, Namespace: ""}
	go func() {
		_ = s.Run(ctx, WorkPriorityLow, keyLow, func(runCtx context.Context) error {
			lowRunning.Store(true)
			<-runCtx.Done()
			lowDone.Done()
			return runCtx.Err()
		})
	}()

	deadline := time.Now().Add(2 * time.Second)
	for !lowRunning.Load() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if !lowRunning.Load() {
		t.Fatal("low work did not start")
	}

	keyHi := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindNamespaces, Namespace: ""}
	err := s.Run(ctx, WorkPriorityCritical, keyHi, func(runCtx context.Context) error {
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}

	lowDone.Wait()
	if s.StatsSnapshot().Preemptions == 0 {
		t.Fatal("expected at least one preemption")
	}
}
