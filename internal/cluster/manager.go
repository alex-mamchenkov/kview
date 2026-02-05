package cluster

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"k8s.io/client-go/discovery"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type ContextInfo struct {
	Name      string `json:"name"`
	Cluster   string `json:"cluster"`
	AuthInfo  string `json:"authInfo"`
	Namespace string `json:"namespace,omitempty"`
}

type Manager struct {
	mu sync.RWMutex

	kubeconfigPath string
	rawConfig      api.Config

	activeContext string

	clients map[string]*Clients
}

type Clients struct {
	RestConfig *rest.Config
	Clientset  *kubernetes.Clientset
	Discovery  discovery.DiscoveryInterface
}

func defaultKubeconfigPath() string {
	if v := os.Getenv("KUBECONFIG"); v != "" {
		// NOTE: if multiple paths separated by ':', clientcmd can handle it,
		// but for simplicity we take the first. You can extend later.
		return v
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kube", "config")
}

func NewManager() (*Manager, error) {
	path := defaultKubeconfigPath()

	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: path}
	cfg, err := loadingRules.Load()
	if err != nil {
		return nil, fmt.Errorf("load kubeconfig: %w", err)
	}

	m := &Manager{
		kubeconfigPath: path,
		rawConfig:      *cfg,
		activeContext:  cfg.CurrentContext,
		clients:        map[string]*Clients{},
	}
	return m, nil
}

func (m *Manager) ListContexts() []ContextInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	out := make([]ContextInfo, 0, len(m.rawConfig.Contexts))
	for name, ctx := range m.rawConfig.Contexts {
		out = append(out, ContextInfo{
			Name:      name,
			Cluster:   ctx.Cluster,
			AuthInfo:  ctx.AuthInfo,
			Namespace: ctx.Namespace,
		})
	}
	return out
}

func (m *Manager) ActiveContext() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeContext
}

func (m *Manager) SetActiveContext(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, ok := m.rawConfig.Contexts[name]; !ok {
		return fmt.Errorf("unknown context: %s", name)
	}
	m.activeContext = name
	return nil
}

func (m *Manager) GetClients(ctx context.Context) (*Clients, string, error) {
	m.mu.RLock()
	active := m.activeContext
	if c, ok := m.clients[active]; ok {
		m.mu.RUnlock()
		return c, active, nil
	}
	m.mu.RUnlock()

	// Build rest.Config for the active context (supports exec plugins => OIDC-friendly)
	overrides := &clientcmd.ConfigOverrides{CurrentContext: active}
	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: m.kubeconfigPath}
	cc := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, overrides)

	restCfg, err := cc.ClientConfig()
	if err != nil {
		return nil, active, fmt.Errorf("build rest config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(restCfg)
	if err != nil {
		return nil, active, fmt.Errorf("new clientset: %w", err)
	}

	disc, err := discovery.NewDiscoveryClientForConfig(restCfg)
	if err != nil {
		return nil, active, fmt.Errorf("new discovery: %w", err)
	}

	clients := &Clients{
		RestConfig: restCfg,
		Clientset:  clientset,
		Discovery:  disc,
	}

	m.mu.Lock()
	m.clients[active] = clients
	m.mu.Unlock()

	return clients, active, nil
}

