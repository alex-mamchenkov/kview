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

func TestLiveWorkSnapshot_QueuedAndRunning(t *testing.T) {
	s := newWorkScheduler(1)
	ctx := context.Background()

	unblock := make(chan struct{})
	keyRun := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindPods, Namespace: "ns"}
	go func() {
		_ = s.Run(ctx, WorkPriorityCritical, keyRun, func(runCtx context.Context) error {
			<-unblock
			return nil
		})
	}()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		snap := s.LiveWorkSnapshot(time.Now())
		if len(snap.Running) == 1 && len(snap.Queued) == 0 {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}

	keyWait := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindDeployments, Namespace: "ns"}
	var secondErr error
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		secondErr = s.Run(ctx, WorkPriorityCritical, keyWait, func(runCtx context.Context) error {
			return nil
		})
	}()

	time.Sleep(50 * time.Millisecond)
	snap := s.LiveWorkSnapshot(time.Now())
	if len(snap.Running) != 1 || len(snap.Queued) != 1 {
		t.Fatalf("running=%d queued=%d: running=%+v queued=%+v", len(snap.Running), len(snap.Queued), snap.Running, snap.Queued)
	}
	if snap.Running[0].Kind != string(ResourceKindPods) {
		t.Fatalf("running row: %+v", snap.Running[0])
	}
	if snap.Queued[0].Kind != string(ResourceKindDeployments) {
		t.Fatalf("queued row: %+v", snap.Queued[0])
	}
	if snap.Queued[0].WaitMs <= 0 {
		t.Fatalf("expected positive queue wait on queued row, got %d", snap.Queued[0].WaitMs)
	}
	if snap.Running[0].RunningMs <= 0 {
		t.Fatalf("expected positive running ms, got %d", snap.Running[0].RunningMs)
	}
	close(unblock)
	wg.Wait()
	if secondErr != nil {
		t.Fatal(secondErr)
	}
}

func TestLiveWorkSnapshot_WorkSourceFromContext(t *testing.T) {
	s := newWorkScheduler(1)
	ctx := ContextWithWorkSource(context.Background(), WorkSourceObserver)
	unblock := make(chan struct{})
	key := workKey{Cluster: "c1", Class: WorkClassSnapshot, Kind: ResourceKindNodes, Namespace: ""}
	go func() {
		_ = s.Run(ctx, WorkPriorityLow, key, func(runCtx context.Context) error {
			<-unblock
			return nil
		})
	}()
	time.Sleep(30 * time.Millisecond)
	snap := s.LiveWorkSnapshot(time.Now())
	if len(snap.Running) != 1 {
		t.Fatalf("expected 1 running, got %+v", snap)
	}
	if snap.Running[0].Source != WorkSourceObserver {
		t.Fatalf("source: got %q want %q", snap.Running[0].Source, WorkSourceObserver)
	}
	close(unblock)
}
