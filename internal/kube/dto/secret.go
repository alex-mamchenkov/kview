package dto

type SecretDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	KeysCount int    `json:"keysCount"`
	Immutable bool   `json:"immutable"`
	AgeSec    int64  `json:"ageSec"`
}

type SecretDetailsDTO struct {
	Summary  SecretSummaryDTO  `json:"summary"`
	KeyNames []string          `json:"keyNames"`
	Metadata SecretMetadataDTO `json:"metadata"`
}

type SecretSummaryDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Type      string `json:"type"`
	Immutable *bool  `json:"immutable,omitempty"`
	KeysCount int    `json:"keysCount"`
	CreatedAt int64  `json:"createdAt,omitempty"`
	AgeSec    int64  `json:"ageSec"`
}

type SecretMetadataDTO struct {
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}
