package dto

type ContainerResourcesDTO struct {
	CPURequest    string `json:"cpuRequest,omitempty"`
	CPULimit      string `json:"cpuLimit,omitempty"`
	MemoryRequest string `json:"memoryRequest,omitempty"`
	MemoryLimit   string `json:"memoryLimit,omitempty"`
}

type TolerationDTO struct {
	Key      string `json:"key,omitempty"`
	Operator string `json:"operator,omitempty"`
	Value    string `json:"value,omitempty"`
	Effect   string `json:"effect,omitempty"`
	Seconds  *int64 `json:"seconds,omitempty"`
}

type TopologySpreadConstraintDTO struct {
	MaxSkew           int32  `json:"maxSkew"`
	TopologyKey       string `json:"topologyKey,omitempty"`
	WhenUnsatisfiable string `json:"whenUnsatisfiable,omitempty"`
	LabelSelector     string `json:"labelSelector,omitempty"`
}

type VolumeDTO struct {
	Name   string `json:"name"`
	Type   string `json:"type,omitempty"`
	Source string `json:"source,omitempty"`
}
