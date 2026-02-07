package dto

type CronJobDTO struct {
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	Schedule           string `json:"schedule"`
	Suspend            bool   `json:"suspend"`
	Active             int32  `json:"active"`
	LastScheduleTime   int64  `json:"lastScheduleTime,omitempty"`
	LastSuccessfulTime int64  `json:"lastSuccessfulTime,omitempty"`
	AgeSec             int64  `json:"ageSec"`
}

type CronJobDetailsDTO struct {
	Summary    CronJobSummaryDTO     `json:"summary"`
	Policy     CronJobPolicyDTO      `json:"policy"`
	ActiveJobs []CronJobJobDTO       `json:"activeJobs,omitempty"`
	RecentJobs []CronJobJobDTO       `json:"recentJobs,omitempty"`
	LinkedJobs CronJobJobsSummaryDTO `json:"linkedJobs"`
	Spec       CronJobSpecDTO        `json:"spec"`
	Metadata   CronJobMetadataDTO    `json:"metadata"`
	YAML       string                `json:"yaml"`
}

type CronJobSummaryDTO struct {
	Name               string `json:"name"`
	Namespace          string `json:"namespace"`
	Schedule           string `json:"schedule"`
	TimeZone           string `json:"timeZone,omitempty"`
	ConcurrencyPolicy  string `json:"concurrencyPolicy,omitempty"`
	Suspend            bool   `json:"suspend"`
	Active             int32  `json:"active"`
	LastScheduleTime   int64  `json:"lastScheduleTime,omitempty"`
	LastSuccessfulTime int64  `json:"lastSuccessfulTime,omitempty"`
	AgeSec             int64  `json:"ageSec"`
}

type CronJobPolicyDTO struct {
	StartingDeadlineSeconds    *int64 `json:"startingDeadlineSeconds,omitempty"`
	SuccessfulJobsHistoryLimit *int32 `json:"successfulJobsHistoryLimit,omitempty"`
	FailedJobsHistoryLimit     *int32 `json:"failedJobsHistoryLimit,omitempty"`
}

type CronJobJobDTO struct {
	Name      string `json:"name"`
	StartTime int64  `json:"startTime,omitempty"`
}

type CronJobJobsSummaryDTO struct {
	Total int32 `json:"total"`
}

type CronJobSpecDTO struct {
	JobTemplate PodTemplateSummaryDTO      `json:"jobTemplate"`
	Scheduling  CronJobSchedulingDTO       `json:"scheduling"`
	Volumes     []VolumeDTO                `json:"volumes,omitempty"`
	Metadata    CronJobTemplateMetadataDTO `json:"metadata"`
}

type CronJobSchedulingDTO struct {
	NodeSelector              map[string]string             `json:"nodeSelector,omitempty"`
	AffinitySummary           string                        `json:"affinitySummary,omitempty"`
	Tolerations               []TolerationDTO               `json:"tolerations,omitempty"`
	TopologySpreadConstraints []TopologySpreadConstraintDTO `json:"topologySpreadConstraints,omitempty"`
}

type CronJobMetadataDTO struct {
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

type CronJobTemplateMetadataDTO struct {
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}
