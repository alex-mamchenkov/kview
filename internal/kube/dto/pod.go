package dto

type PodDetailsDTO struct {
	Summary    PodSummaryDTO     `json:"summary"`
	Conditions []PodConditionDTO `json:"conditions"`
	Lifecycle  PodLifecycleDTO   `json:"lifecycle"`
	Containers []PodContainerDTO `json:"containers"`
	Resources  PodResourcesDTO   `json:"resources"`
	YAML       string            `json:"yaml"`
}

type PodSummaryDTO struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace"`
	Node           string `json:"node,omitempty"`
	Phase          string `json:"phase"`
	Ready          string `json:"ready"`
	Restarts       int32  `json:"restarts"`
	MaxRestarts    int32  `json:"maxRestarts"`
	PodIP          string `json:"podIP,omitempty"`
	HostIP         string `json:"hostIP,omitempty"`
	QoSClass       string `json:"qosClass,omitempty"`
	StartTime      int64  `json:"startTime,omitempty"`
	AgeSec         int64  `json:"ageSec"`
	ControllerKind string `json:"controllerKind,omitempty"`
	ControllerName string `json:"controllerName,omitempty"`
	ServiceAccount string `json:"serviceAccount,omitempty"`
}

type PodConditionDTO struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime int64  `json:"lastTransitionTime,omitempty"`
}

type PodLifecycleDTO struct {
	RestartPolicy    string            `json:"restartPolicy,omitempty"`
	PriorityClass    string            `json:"priorityClass,omitempty"`
	PreemptionPolicy string            `json:"preemptionPolicy,omitempty"`
	NodeSelector     map[string]string `json:"nodeSelector,omitempty"`
	AffinitySummary  string            `json:"affinitySummary,omitempty"`
	Tolerations      []TolerationDTO   `json:"tolerations,omitempty"`
}

type PodContainerDTO struct {
	Name                   string                `json:"name"`
	Image                  string                `json:"image,omitempty"`
	ImageID                string                `json:"imageId,omitempty"`
	Ready                  bool                  `json:"ready"`
	State                  string                `json:"state,omitempty"`
	Reason                 string                `json:"reason,omitempty"`
	Message                string                `json:"message,omitempty"`
	StartedAt              int64                 `json:"startedAt,omitempty"`
	FinishedAt             int64                 `json:"finishedAt,omitempty"`
	RestartCount           int32                 `json:"restartCount"`
	LastTerminationReason  string                `json:"lastTerminationReason,omitempty"`
	LastTerminationMessage string                `json:"lastTerminationMessage,omitempty"`
	LastTerminationAt      int64                 `json:"lastTerminationAt,omitempty"`
	Resources              ContainerResourcesDTO `json:"resources"`
	Env                    []EnvVarDTO           `json:"env"`
	Mounts                 []MountDTO            `json:"mounts"`
	Probes                 ContainerProbesDTO    `json:"probes"`
	SecurityContext        ContainerSecurityDTO  `json:"securityContext"`
}

type EnvVarDTO struct {
	Name      string `json:"name"`
	Value     string `json:"value,omitempty"`
	Source    string `json:"source,omitempty"`
	SourceRef string `json:"sourceRef,omitempty"`
	Optional  *bool  `json:"optional,omitempty"`
}

type MountDTO struct {
	Name      string `json:"name"`
	MountPath string `json:"mountPath"`
	ReadOnly  bool   `json:"readOnly"`
	SubPath   string `json:"subPath,omitempty"`
}

type ProbeDTO struct {
	Type                string `json:"type,omitempty"`
	Command             string `json:"command,omitempty"`
	Path                string `json:"path,omitempty"`
	Port                string `json:"port,omitempty"`
	Scheme              string `json:"scheme,omitempty"`
	InitialDelaySeconds int32  `json:"initialDelaySeconds,omitempty"`
	PeriodSeconds       int32  `json:"periodSeconds,omitempty"`
	TimeoutSeconds      int32  `json:"timeoutSeconds,omitempty"`
	FailureThreshold    int32  `json:"failureThreshold,omitempty"`
	SuccessThreshold    int32  `json:"successThreshold,omitempty"`
}

type ContainerProbesDTO struct {
	Liveness  *ProbeDTO `json:"liveness,omitempty"`
	Readiness *ProbeDTO `json:"readiness,omitempty"`
	Startup   *ProbeDTO `json:"startup,omitempty"`
}

type PodResourcesDTO struct {
	Volumes                   []VolumeDTO                   `json:"volumes,omitempty"`
	ImagePullSecrets          []string                      `json:"imagePullSecrets,omitempty"`
	PodSecurityContext        PodSecurityDTO                `json:"podSecurityContext"`
	ContainerSecurityContexts []ContainerSecurityDTO        `json:"containerSecurityContexts,omitempty"`
	DNSPolicy                 string                        `json:"dnsPolicy,omitempty"`
	HostAliases               []HostAliasDTO                `json:"hostAliases,omitempty"`
	TopologySpreadConstraints []TopologySpreadConstraintDTO `json:"topologySpreadConstraints,omitempty"`
}

type PodSecurityDTO struct {
	RunAsUser           *int64      `json:"runAsUser,omitempty"`
	RunAsGroup          *int64      `json:"runAsGroup,omitempty"`
	FSGroup             *int64      `json:"fsGroup,omitempty"`
	FSGroupChangePolicy string      `json:"fsGroupChangePolicy,omitempty"`
	SeccompProfile      string      `json:"seccompProfile,omitempty"`
	SupplementalGroups  []int64     `json:"supplementalGroups,omitempty"`
	Sysctls             []SysctlDTO `json:"sysctls,omitempty"`
}

type SysctlDTO struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type ContainerSecurityDTO struct {
	Name                     string   `json:"name"`
	RunAsUser                *int64   `json:"runAsUser,omitempty"`
	RunAsGroup               *int64   `json:"runAsGroup,omitempty"`
	Privileged               *bool    `json:"privileged,omitempty"`
	ReadOnlyRootFilesystem   *bool    `json:"readOnlyRootFilesystem,omitempty"`
	AllowPrivilegeEscalation *bool    `json:"allowPrivilegeEscalation,omitempty"`
	CapabilitiesAdd          []string `json:"capabilitiesAdd,omitempty"`
	CapabilitiesDrop         []string `json:"capabilitiesDrop,omitempty"`
	SeccompProfile           string   `json:"seccompProfile,omitempty"`
}

type HostAliasDTO struct {
	IP        string   `json:"ip"`
	Hostnames []string `json:"hostnames"`
}
