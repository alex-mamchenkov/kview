package dto

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
