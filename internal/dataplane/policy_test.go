package dataplane

import (
	"sync"
	"testing"
)

func TestValidateDataplanePolicyDoesNotMutateInputMaps(t *testing.T) {
	in := DataplanePolicy{
		Profile: DataplaneProfileFocused,
		Snapshots: SnapshotPolicy{
			TTLSeconds: map[string]int{
				string(ResourceKindPods): 30,
			},
		},
		NamespaceEnrichment: NamespaceEnrichmentPolicy{
			WarmResourceKinds: []string{string(ResourceKindPods)},
		},
	}

	got := ValidateDataplanePolicy(in)

	if _, ok := in.Snapshots.TTLSeconds[string(ResourceKindNamespaces)]; ok {
		t.Fatalf("ValidateDataplanePolicy mutated input TTL map: %#v", in.Snapshots.TTLSeconds)
	}
	got.Snapshots.TTLSeconds[string(ResourceKindPods)] = 99
	got.NamespaceEnrichment.WarmResourceKinds[0] = string(ResourceKindDeployments)
	if in.Snapshots.TTLSeconds[string(ResourceKindPods)] != 30 {
		t.Fatalf("validated TTL map aliases input map: %#v", in.Snapshots.TTLSeconds)
	}
	if in.NamespaceEnrichment.WarmResourceKinds[0] != string(ResourceKindPods) {
		t.Fatalf("validated warm resource kinds aliases input slice: %#v", in.NamespaceEnrichment.WarmResourceKinds)
	}
}

func TestManagerPolicyReturnsIsolatedCopy(t *testing.T) {
	dm := NewManager(ManagerConfig{})
	m := dm.(*manager)

	policy := m.Policy()
	policy.Snapshots.TTLSeconds[string(ResourceKindPods)] = 999
	policy.NamespaceEnrichment.WarmResourceKinds[0] = string(ResourceKindServices)

	got := m.Policy()
	if got.Snapshots.TTLSeconds[string(ResourceKindPods)] == 999 {
		t.Fatalf("Policy returned map that aliases manager state: %#v", got.Snapshots.TTLSeconds)
	}
	if got.NamespaceEnrichment.WarmResourceKinds[0] == string(ResourceKindServices) {
		t.Fatalf("Policy returned slice that aliases manager state: %#v", got.NamespaceEnrichment.WarmResourceKinds)
	}
}

func TestManagerPolicyConcurrentAccess(t *testing.T) {
	dm := NewManager(ManagerConfig{})
	m := dm.(*manager)

	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 1000; j++ {
				policy := m.Policy()
				policy.Snapshots.TTLSeconds[string(ResourceKindPods)] = 5 + ((i + j) % 120)
				policy.NamespaceEnrichment.WarmResourceKinds = append(policy.NamespaceEnrichment.WarmResourceKinds, string(ResourceKindDeployments))
				m.SetPolicy(policy)
			}
		}(i)
	}
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 1000; j++ {
				policy := m.Policy()
				_ = policy.SnapshotTTL(ResourceKindPods)
			}
		}()
	}
	wg.Wait()
}
