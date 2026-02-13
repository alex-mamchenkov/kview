package dto

type NamespaceListItemDTO struct {
	Name                   string `json:"name"`
	Phase                  string `json:"phase"`
	AgeSec                 int64  `json:"ageSec"`
	HasUnhealthyConditions bool   `json:"hasUnhealthyConditions"`
}

type NamespaceDetailsDTO struct {
	Summary    NamespaceSummaryDTO    `json:"summary"`
	Metadata   NamespaceMetadataDTO   `json:"metadata"`
	Conditions []NamespaceConditionDTO `json:"conditions"`
	YAML       string                 `json:"yaml"`
}

type NamespaceSummaryDTO struct {
	Name      string `json:"name"`
	Phase     string `json:"phase"`
	CreatedAt int64  `json:"createdAt"`
	AgeSec    int64  `json:"ageSec"`
}

type NamespaceMetadataDTO struct {
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

type NamespaceConditionDTO struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime int64  `json:"lastTransitionTime"`
}

type NamespaceSummaryResourcesDTO struct {
	Counts       NamespaceResourceCounts   `json:"counts"`
	PodHealth    NamespacePodHealth        `json:"podHealth"`
	DeployHealth NamespaceDeploymentHealth `json:"deploymentHealth"`
	Problematic  []ProblematicResource     `json:"problematic"`
	HelmReleases []NamespaceHelmRelease    `json:"helmReleases,omitempty"`
}

type NamespaceResourceCounts struct {
	Pods         int `json:"pods"`
	Deployments  int `json:"deployments"`
	StatefulSets int `json:"statefulSets"`
	DaemonSets   int `json:"daemonSets"`
	Jobs         int `json:"jobs"`
	CronJobs     int `json:"cronJobs"`
	Services     int `json:"services"`
	Ingresses    int `json:"ingresses"`
	PVCs         int `json:"pvcs"`
	ConfigMaps   int `json:"configMaps"`
	Secrets      int `json:"secrets"`
	HelmReleases int `json:"helmReleases"`
}

type NamespacePodHealth struct {
	Running   int `json:"running"`
	Pending   int `json:"pending"`
	Failed    int `json:"failed"`
	Succeeded int `json:"succeeded"`
	Unknown   int `json:"unknown"`
}

type NamespaceDeploymentHealth struct {
	Healthy     int `json:"healthy"`
	Degraded    int `json:"degraded"`
	Progressing int `json:"progressing"`
}

type ProblematicResource struct {
	Kind   string `json:"kind"`
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

type NamespaceHelmRelease struct {
	Name     string `json:"name"`
	Status   string `json:"status"`
	Revision int    `json:"revision"`
}
