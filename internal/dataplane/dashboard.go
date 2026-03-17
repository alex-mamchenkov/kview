package dataplane

import (
	"context"
	"strings"
)

// ClusterDashboardSummary is a minimal, operator-focused dashboard view.
// It is intentionally small and derived from existing snapshots.
type ClusterDashboardSummary struct {
	Plane      ClusterDashboardPlane      `json:"plane"`
	Namespaces ClusterDashboardNamespaces `json:"namespaces"`
	Nodes      ClusterDashboardNodes      `json:"nodes"`
}

type ClusterDashboardPlane struct {
	Profile             string                     `json:"profile"`
	DiscoveryMode       string                     `json:"discoveryMode"`
	ActivationMode      string                     `json:"activationMode"`
	ProfilesImplemented []string                   `json:"profilesImplemented"`
	DiscoveryImplemented []string                  `json:"discoveryImplemented"`
	Scope               ClusterDashboardPlaneScope `json:"scope"`
}

type ClusterDashboardPlaneScope struct {
	Namespaces    string `json:"namespaces"`
	ResourceKinds string `json:"resourceKinds"`
}

type ClusterDashboardNamespaces struct {
	Total            int    `json:"total"`
	Unhealthy        int    `json:"unhealthy"`
	Freshness        string `json:"freshness"`
	Coverage         string `json:"coverage"`
	Degradation      string `json:"degradation"`
	Completeness     string `json:"completeness"`
	State            string `json:"state"`
	ObserverState    string `json:"observerState"`
}

type ClusterDashboardNodes struct {
	Total        int    `json:"total"`
	Freshness    string `json:"freshness"`
	Coverage     string `json:"coverage"`
	Degradation  string `json:"degradation"`
	Completeness string `json:"completeness"`
	State        string `json:"state"`
	ObserverState string `json:"observerState"`
}

// DashboardSummary builds a minimal dashboard summary from cached snapshots.
func (m *manager) DashboardSummary(ctx context.Context, clusterName string) ClusterDashboardSummary {
	planeAny, _ := m.PlaneForCluster(ctx, clusterName)
	plane := planeAny.(*clusterPlane)

	nsSnap, _ := plane.NamespacesSnapshot(ctx, m.scheduler, m.clients)
	nodesSnap, _ := plane.NodesSnapshot(ctx, m.scheduler, m.clients)

	// Observer states default to not_loaded when observers haven't started yet.
	nsObs := "not_loaded"
	nodeObs := "not_loaded"
	plane.obsMu.Lock()
	if plane.observers != nil {
		if plane.observers.namespacesState != "" {
			nsObs = string(plane.observers.namespacesState)
		}
		if plane.observers.nodesState != "" {
			nodeObs = string(plane.observers.nodesState)
		}
	}
	plane.obsMu.Unlock()

	var nsTotal, nsUnhealthy int
	for _, ns := range nsSnap.Items {
		nsTotal++
		if ns.HasUnhealthyConditions {
			nsUnhealthy++
		}
	}

	nsState := "unknown"
	if nsSnap.Err != nil {
		switch nsSnap.Err.Class {
		case NormalizedErrorClassAccessDenied, NormalizedErrorClassUnauthorized:
			nsState = "denied"
		case NormalizedErrorClassRateLimited, NormalizedErrorClassTimeout, NormalizedErrorClassTransient:
			nsState = "degraded"
		case NormalizedErrorClassProxyFailure, NormalizedErrorClassConnectivity:
			nsState = "partial_proxy"
		default:
			nsState = "degraded"
		}
	} else if nsTotal == 0 {
		nsState = "empty"
	} else {
		nsState = "ok"
	}

	nodeTotal := len(nodesSnap.Items)
	nodeState := "unknown"
	if nodesSnap.Err != nil {
		switch nodesSnap.Err.Class {
		case NormalizedErrorClassAccessDenied, NormalizedErrorClassUnauthorized:
			nodeState = "denied"
		case NormalizedErrorClassRateLimited, NormalizedErrorClassTimeout, NormalizedErrorClassTransient:
			nodeState = "degraded"
		case NormalizedErrorClassProxyFailure, NormalizedErrorClassConnectivity:
			nodeState = "partial_proxy"
		default:
			nodeState = "degraded"
		}
	} else if nodeTotal == 0 {
		nodeState = "empty"
	} else {
		nodeState = "ok"
	}

	scope := plane.Scope()
	namespaceScope := "all_namespaces"
	if len(scope.Namespaces) > 0 {
		namespaceScope = strings.Join(scope.Namespaces, ",")
	}
	resourceScope := "first_wave_defaults"
	if len(scope.ResourceKinds) > 0 {
		resourceScope = strings.Join(scope.ResourceKinds, ",")
	}

	return ClusterDashboardSummary{
		Plane: ClusterDashboardPlane{
			Profile:             string(plane.Profile()),
			DiscoveryMode:       string(plane.DiscoveryMode()),
			ActivationMode:      "lazy_endpoint_driven",
			ProfilesImplemented: []string{string(ProfileFocused)},
			DiscoveryImplemented: []string{string(DiscoveryModeTargeted)},
			Scope: ClusterDashboardPlaneScope{
				Namespaces:    namespaceScope,
				ResourceKinds: resourceScope,
			},
		},
		Namespaces: ClusterDashboardNamespaces{
			Total:        nsTotal,
			Unhealthy:    nsUnhealthy,
			Freshness:    string(nsSnap.Meta.Freshness),
			Coverage:     string(nsSnap.Meta.Coverage),
			Degradation:  string(nsSnap.Meta.Degradation),
			Completeness: string(nsSnap.Meta.Completeness),
			State:        nsState,
			ObserverState: nsObs,
		},
		Nodes: ClusterDashboardNodes{
			Total:        nodeTotal,
			Freshness:    string(nodesSnap.Meta.Freshness),
			Coverage:     string(nodesSnap.Meta.Coverage),
			Degradation:  string(nodesSnap.Meta.Degradation),
			Completeness: string(nodesSnap.Meta.Completeness),
			State:        nodeState,
			ObserverState: nodeObs,
		},
	}
}

