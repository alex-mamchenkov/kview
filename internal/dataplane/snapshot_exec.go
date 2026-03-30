package dataplane

import (
	"context"
	"time"

	"kview/internal/cluster"
)

type clusterSnapshotDescriptor[I any] struct {
	kind        ResourceKind
	ttl         time.Duration
	capGroup    string
	capResource string
	capScope    CapabilityScope
	fetch       func(context.Context, *cluster.Clients) ([]I, error)
}

type namespacedSnapshotDescriptor[I any] struct {
	kind        ResourceKind
	ttl         time.Duration
	capGroup    string
	capResource string
	capScope    CapabilityScope
	fetch       func(context.Context, *cluster.Clients, string) ([]I, error)
}

func (p *clusterPlane) snapshotMetaUnknown(now time.Time) SnapshotMetadata {
	return SnapshotMetadata{
		ObservedAt:   now,
		Freshness:    FreshnessClassUnknown,
		Coverage:     CoverageClassUnknown,
		Degradation:  DegradationClassSevere,
		Completeness: CompletenessClassUnknown,
	}
}

func (p *clusterPlane) snapshotMetaCold(now time.Time) SnapshotMetadata {
	return SnapshotMetadata{
		ObservedAt:   now,
		Freshness:    FreshnessClassCold,
		Coverage:     CoverageClassUnknown,
		Degradation:  DegradationClassMinor,
		Completeness: CompletenessClassUnknown,
	}
}

func (p *clusterPlane) snapshotMetaHot(now time.Time) SnapshotMetadata {
	return SnapshotMetadata{
		ObservedAt:   now,
		Freshness:    FreshnessClassHot,
		Coverage:     CoverageClassFull,
		Degradation:  DegradationClassNone,
		Completeness: CompletenessClassComplete,
	}
}

func executeClusterSnapshot[I any](
	p *clusterPlane,
	ctx context.Context,
	sched *workScheduler,
	prio WorkPriority,
	clients ClientsProvider,
	store *snapshotStore[Snapshot[I]],
	desc clusterSnapshotDescriptor[I],
) (Snapshot[I], error) {
	if cached, ok := store.getFresh(desc.ttl); ok {
		return cached, nil
	}

	key := workKey{
		Cluster:   p.name,
		Class:     WorkClassSnapshot,
		Kind:      desc.kind,
		Namespace: "",
	}

	var out Snapshot[I]
	runErr := sched.Run(ctx, prio, key, func(runCtx context.Context) error {
		now := time.Now().UTC()
		if clients == nil {
			out.Err = nil
			out.Meta = p.snapshotMetaUnknown(now)
			return nil
		}

		c, _, err := clients.GetClientsForContext(runCtx, p.name)
		if err != nil {
			n := NormalizeError(err)
			out.Err = &n
			out.Meta = p.snapshotMetaUnknown(now)
			return err
		}

		items, err := desc.fetch(runCtx, c)
		if err != nil {
			n := NormalizeError(err)
			out.Err = &n
			out.Items = nil
			out.Meta = p.snapshotMetaCold(now)
			p.capRegistry.LearnReadResult(p.name, desc.capGroup, desc.capResource, "", "list", desc.capScope, err)
			return err
		}

		out.Err = nil
		out.Items = items
		out.Meta = p.snapshotMetaHot(now)
		p.capRegistry.LearnReadResult(p.name, desc.capGroup, desc.capResource, "", "list", desc.capScope, nil)
		return nil
	})

	setClusterSnapshot(store, out)
	return out, runErr
}

func executeNamespacedSnapshot[I any](
	p *clusterPlane,
	ctx context.Context,
	sched *workScheduler,
	prio WorkPriority,
	clients ClientsProvider,
	namespace string,
	store *namespacedSnapshotStore[Snapshot[I]],
	desc namespacedSnapshotDescriptor[I],
) (Snapshot[I], error) {
	if cached, ok := store.getFresh(namespace, desc.ttl); ok {
		return cached, nil
	}

	key := workKey{
		Cluster:   p.name,
		Class:     WorkClassSnapshot,
		Kind:      desc.kind,
		Namespace: namespace,
	}

	var out Snapshot[I]
	runErr := sched.Run(ctx, prio, key, func(runCtx context.Context) error {
		now := time.Now().UTC()
		if clients == nil {
			out.Err = nil
			out.Meta = p.snapshotMetaUnknown(now)
			return nil
		}

		c, _, err := clients.GetClientsForContext(runCtx, p.name)
		if err != nil {
			n := NormalizeError(err)
			out.Err = &n
			out.Meta = p.snapshotMetaUnknown(now)
			return err
		}

		items, err := desc.fetch(runCtx, c, namespace)
		if err != nil {
			n := NormalizeError(err)
			out.Err = &n
			out.Items = nil
			out.Meta = p.snapshotMetaCold(now)
			p.capRegistry.LearnReadResult(p.name, desc.capGroup, desc.capResource, namespace, "list", desc.capScope, err)
			return err
		}

		out.Err = nil
		out.Items = items
		out.Meta = p.snapshotMetaHot(now)
		p.capRegistry.LearnReadResult(p.name, desc.capGroup, desc.capResource, namespace, "list", desc.capScope, nil)
		return nil
	})

	setNamespacedSnapshot(store, namespace, out)
	return out, runErr
}
