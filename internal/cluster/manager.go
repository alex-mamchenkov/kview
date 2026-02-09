package cluster

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/imdario/mergo"
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

	rawConfig api.Config

	activeContext string

	clients map[string]*Clients
}

type Clients struct {
	RestConfig *rest.Config
	Clientset  *kubernetes.Clientset
	Discovery  discovery.DiscoveryInterface
}

func defaultKubeconfigPath() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kube", "config")
}

func kubeconfigLocations() []string {
	envValue := os.Getenv("KUBECONFIG")
	if envValue == "" {
		return []string{defaultKubeconfigPath()}
	}

	sep := string(os.PathListSeparator)
	if strings.Contains(envValue, sep) {
		parts := strings.Split(envValue, sep)
		locations := make([]string, 0, len(parts))
		for _, part := range parts {
			if part == "" {
				continue
			}
			locations = append(locations, part)
		}
		return locations
	}

	return []string{envValue}
}

func expandKubeconfigLocations(locations []string) []string {
	files := []string{}
	for _, location := range locations {
		info, err := os.Stat(location)
		if err != nil {
			if os.IsNotExist(err) {
				log.Printf("kubeconfig: skip location %q: not found", location)
				continue
			}
			log.Printf("kubeconfig: skip location %q: %v", location, err)
			continue
		}

		if info.IsDir() {
			entries, err := os.ReadDir(location)
			if err != nil {
				log.Printf("kubeconfig: skip directory %q: %v", location, err)
				continue
			}
			names := make([]string, 0, len(entries))
			for _, entry := range entries {
				if entry.IsDir() {
					continue
				}
				names = append(names, entry.Name())
			}
			sort.Strings(names)
			for _, name := range names {
				files = append(files, filepath.Join(location, name))
			}
			continue
		}

		files = append(files, location)
	}
	return files
}

func loadMergedKubeconfig() (*api.Config, error) {
	locations := kubeconfigLocations()
	log.Printf("kubeconfig: discovered locations: %v", locations)

	files := expandKubeconfigLocations(locations)
	log.Printf("kubeconfig: files to read: %v", files)

	configs := make([]*api.Config, 0, len(files))
	lastCurrentContext := ""
	for _, filename := range files {
		cfg, err := clientcmd.LoadFromFile(filename)
		if err != nil {
			log.Printf("kubeconfig: skip file %q: %v", filename, err)
			continue
		}
		configs = append(configs, cfg)
		if cfg.CurrentContext != "" {
			lastCurrentContext = cfg.CurrentContext
		}
	}

	merged := api.NewConfig()
	for _, cfg := range configs {
		if err := mergo.Merge(merged, cfg, mergo.WithOverride); err != nil {
			log.Printf("kubeconfig: merge warning: %v", err)
		}
	}
	if lastCurrentContext != "" {
		merged.CurrentContext = lastCurrentContext
	}
	if err := clientcmd.ResolveLocalPaths(merged); err != nil {
		log.Printf("kubeconfig: resolve paths warning: %v", err)
	}

	return merged, nil
}

func NewManager() (*Manager, error) {
	cfg, err := loadMergedKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("load kubeconfig: %w", err)
	}

	m := &Manager{
		rawConfig:     *cfg,
		activeContext: cfg.CurrentContext,
		clients:       map[string]*Clients{},
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
	cc := clientcmd.NewNonInteractiveClientConfig(m.rawConfig, active, overrides, nil)

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
