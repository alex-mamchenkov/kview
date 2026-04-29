package server

import (
	"context"
	"fmt"
	"time"

	"github.com/korex-labs/kview/v5/internal/runtime"
)

func (s *Server) startAllContextEnrichmentLoop() {
	if s == nil || s.dp == nil || s.mgr == nil {
		return
	}
	go s.runAllContextEnrichmentLoop(context.Background())
}

func (s *Server) runAllContextEnrichmentLoop(ctx context.Context) {
	nextIndex := 0
	timer := time.NewTimer(time.Second)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
			policy := s.dp.Policy().AllContextEnrichment
			enabled := policy.Enabled || s.anyContextAllContextEnrichmentEnabled()
			if enabled {
				nextIndex = s.runAllContextEnrichmentCycle(ctx, nextIndex, policy.MaxContextsPerCycle)
			}
			interval := 5 * time.Second
			if enabled {
				interval = time.Duration(policy.IntervalSec) * time.Second
				if interval <= 0 {
					interval = 5 * time.Minute
				}
			}
			timer.Reset(interval)
		}
	}
}

func (s *Server) anyContextAllContextEnrichmentEnabled() bool {
	bundle := s.dp.PolicyBundle()
	for contextName := range bundle.ContextOverrides {
		if bundle.EffectivePolicy(contextName).AllContextEnrichment.Enabled {
			return true
		}
	}
	return false
}

func (s *Server) runAllContextEnrichmentCycle(ctx context.Context, startIndex int, maxContexts int) int {
	contexts := s.mgr.ListContexts()
	if len(contexts) == 0 {
		return 0
	}
	if maxContexts <= 0 {
		maxContexts = 1
	}
	if maxContexts > len(contexts) {
		maxContexts = len(contexts)
	}
	if startIndex < 0 || startIndex >= len(contexts) {
		startIndex = 0
	}

	for i := 0; i < maxContexts; i++ {
		idx := (startIndex + i) % len(contexts)
		name := contexts[idx].Name
		if name == "" {
			continue
		}
		warmCtx, cancel := context.WithTimeout(ctx, ctxTimeoutProjection)
		err := s.dp.WarmClusterBackground(warmCtx, name)
		cancel()
		if err != nil && s.rt != nil {
			s.rt.Log(runtime.LogLevelWarn, "dataplane",
				fmt.Sprintf("all-context enrichment skipped %s: %v", name, err))
		}
	}
	return (startIndex + maxContexts) % len(contexts)
}
