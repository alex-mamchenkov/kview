package kube

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

func GetCronJobDetails(ctx context.Context, c *cluster.Clients, namespace, name string) (*dto.CronJobDetailsDTO, error) {
	cronJob, err := c.Clientset.BatchV1().CronJobs(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	cronCopy := cronJob.DeepCopy()
	cronCopy.ManagedFields = nil
	b, err := json.Marshal(cronCopy)
	if err != nil {
		return nil, err
	}
	y, err := yaml.JSONToYAML(b)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	age := int64(0)
	if !cronJob.CreationTimestamp.IsZero() {
		age = int64(now.Sub(cronJob.CreationTimestamp.Time).Seconds())
	}

	suspend := false
	if cronJob.Spec.Suspend != nil {
		suspend = *cronJob.Spec.Suspend
	}

	timeZone := ""
	if cronJob.Spec.TimeZone != nil {
		timeZone = *cronJob.Spec.TimeZone
	}

	summary := dto.CronJobSummaryDTO{
		Name:               cronJob.Name,
		Namespace:          cronJob.Namespace,
		Schedule:           cronJob.Spec.Schedule,
		TimeZone:           timeZone,
		ConcurrencyPolicy:  string(cronJob.Spec.ConcurrencyPolicy),
		Suspend:            suspend,
		Active:             int32(len(cronJob.Status.Active)),
		LastScheduleTime:   timeFrom(cronJob.Status.LastScheduleTime),
		LastSuccessfulTime: timeFrom(cronJob.Status.LastSuccessfulTime),
		AgeSec:             age,
	}

	policy := dto.CronJobPolicyDTO{
		StartingDeadlineSeconds:    cronJob.Spec.StartingDeadlineSeconds,
		SuccessfulJobsHistoryLimit: cronJob.Spec.SuccessfulJobsHistoryLimit,
		FailedJobsHistoryLimit:     cronJob.Spec.FailedJobsHistoryLimit,
	}

	template := cronJob.Spec.JobTemplate.Spec.Template
	spec := dto.CronJobSpecDTO{
		JobTemplate: dto.PodTemplateSummaryDTO{
			Containers:       mapContainerSummaries(template.Spec.Containers),
			InitContainers:   mapContainerSummaries(template.Spec.InitContainers),
			ImagePullSecrets: mapImagePullSecrets(template.Spec.ImagePullSecrets),
		},
		Scheduling: dto.CronJobSchedulingDTO{
			NodeSelector:              template.Spec.NodeSelector,
			AffinitySummary:           summarizeAffinity(template.Spec.Affinity),
			Tolerations:               mapTolerations(template.Spec.Tolerations),
			TopologySpreadConstraints: mapTopologySpread(template.Spec.TopologySpreadConstraints),
		},
		Volumes: mapVolumes(template.Spec.Volumes),
		Metadata: dto.CronJobTemplateMetadataDTO{
			Labels:      template.Labels,
			Annotations: template.Annotations,
		},
	}

	metadata := dto.CronJobMetadataDTO{
		Labels:      cronJob.Labels,
		Annotations: cronJob.Annotations,
	}

	activeJobs := mapActiveJobs(cronJob.Status.Active, nil)
	recentJobs := []dto.CronJobJobDTO{}
	linkedJobs := dto.CronJobJobsSummaryDTO{Total: 0}

	jobList, err := c.Clientset.BatchV1().Jobs(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: fmt.Sprintf("cronjob-name=%s", cronJob.Name),
	})
	if err == nil {
		linkedJobs.Total = int32(len(jobList.Items))
		jobMap := mapJobStartTimes(jobList.Items)
		activeJobs = mapActiveJobs(cronJob.Status.Active, jobMap)
		recentJobs = mapRecentJobs(jobList.Items, 5)
	}

	return &dto.CronJobDetailsDTO{
		Summary:    summary,
		Policy:     policy,
		ActiveJobs: activeJobs,
		RecentJobs: recentJobs,
		LinkedJobs: linkedJobs,
		Spec:       spec,
		Metadata:   metadata,
		YAML:       string(y),
	}, nil
}

func mapActiveJobs(refs []corev1.ObjectReference, starts map[string]int64) []dto.CronJobJobDTO {
	if len(refs) == 0 {
		return nil
	}
	out := make([]dto.CronJobJobDTO, 0, len(refs))
	for _, ref := range refs {
		if ref.Name == "" {
			continue
		}
		item := dto.CronJobJobDTO{Name: ref.Name}
		if starts != nil {
			if start, ok := starts[ref.Name]; ok && start > 0 {
				item.StartTime = start
			}
		}
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out
}

func mapJobStartTimes(items []batchv1.Job) map[string]int64 {
	if len(items) == 0 {
		return nil
	}
	out := make(map[string]int64, len(items))
	for _, job := range items {
		start := timeFrom(job.Status.StartTime)
		if start == 0 && !job.CreationTimestamp.IsZero() {
			start = job.CreationTimestamp.Unix()
		}
		if job.Name != "" {
			out[job.Name] = start
		}
	}
	return out
}

func mapRecentJobs(items []batchv1.Job, limit int) []dto.CronJobJobDTO {
	if len(items) == 0 || limit <= 0 {
		return nil
	}
	type jobTime struct {
		name  string
		start int64
	}
	list := make([]jobTime, 0, len(items))
	for _, job := range items {
		if job.Name == "" {
			continue
		}
		start := timeFrom(job.Status.StartTime)
		if start == 0 && !job.CreationTimestamp.IsZero() {
			start = job.CreationTimestamp.Unix()
		}
		list = append(list, jobTime{name: job.Name, start: start})
	}
	if len(list) == 0 {
		return nil
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].start == list[j].start {
			return list[i].name < list[j].name
		}
		return list[i].start > list[j].start
	})
	if len(list) > limit {
		list = list[:limit]
	}
	out := make([]dto.CronJobJobDTO, 0, len(list))
	for _, item := range list {
		dtoItem := dto.CronJobJobDTO{Name: item.name}
		if item.start > 0 {
			dtoItem.StartTime = item.start
		}
		out = append(out, dtoItem)
	}
	return out
}
