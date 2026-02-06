package kube

import (
	"context"
	"encoding/json"
	"sort"
	"strconv"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/yaml"

	"kview/internal/cluster"
)

type DeploymentDetailsDTO struct {
	Summary  DeploymentSummaryDTO  `json:"summary"`
	Conditions []DeploymentConditionDTO `json:"conditions"`
	Rollout   DeploymentRolloutDTO `json:"rollout"`
	ReplicaSets []DeploymentReplicaSetDTO `json:"replicaSets"`
	Pods     []DeploymentPodDTO    `json:"pods"`
	Spec     DeploymentSpecDTO     `json:"spec"`
	YAML     string               `json:"yaml"`
}

type DeploymentSummaryDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Strategy  string `json:"strategy"`
	Selector  string `json:"selector"`
	Desired   int32  `json:"desired"`
	Current   int32  `json:"current"`
	Ready     int32  `json:"ready"`
	Available int32  `json:"available"`
	UpToDate  int32  `json:"upToDate"`
	AgeSec    int64  `json:"ageSec"`
}

type DeploymentConditionDTO struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	Reason             string `json:"reason,omitempty"`
	Message            string `json:"message,omitempty"`
	LastTransitionTime int64  `json:"lastTransitionTime,omitempty"`
}

type DeploymentRolloutDTO struct {
	CurrentRevision        string   `json:"currentRevision,omitempty"`
	ObservedGeneration     int64    `json:"observedGeneration"`
	Generation             int64    `json:"generation"`
	ProgressDeadlineExceeded bool   `json:"progressDeadlineExceeded"`
	LastRolloutStart       int64    `json:"lastRolloutStart,omitempty"`
	LastRolloutComplete    int64    `json:"lastRolloutComplete,omitempty"`
	InProgress             bool     `json:"inProgress"`
	Warnings               []string `json:"warnings,omitempty"`
	MissingReplicas        int32    `json:"missingReplicas"`
	UnavailableReplicas    int32    `json:"unavailableReplicas"`
}

type DeploymentReplicaSetDTO struct {
	Name          string `json:"name"`
	Revision      int32  `json:"revision"`
	Desired       int32  `json:"desired"`
	Current       int32  `json:"current"`
	Ready         int32  `json:"ready"`
	AgeSec        int64  `json:"ageSec"`
	Status        string `json:"status"`
	IsActive      bool   `json:"isActive"`
	UnhealthyPods bool   `json:"unhealthyPods"`
}

type DeploymentPodDTO struct {
	Name     string `json:"name"`
	Phase    string `json:"phase"`
	Ready    string `json:"ready"`
	Restarts int32  `json:"restarts"`
	Node     string `json:"node,omitempty"`
	AgeSec   int64  `json:"ageSec"`
}

type DeploymentSpecDTO struct {
	PodTemplate   PodTemplateSummaryDTO       `json:"podTemplate"`
	Scheduling    DeploymentSchedulingDTO     `json:"scheduling"`
	Volumes       []VolumeDTO                 `json:"volumes,omitempty"`
	Metadata      DeploymentMetadataDTO       `json:"metadata"`
}

type PodTemplateSummaryDTO struct {
	Containers     []ContainerSummaryDTO `json:"containers,omitempty"`
	InitContainers []ContainerSummaryDTO `json:"initContainers,omitempty"`
	ImagePullSecrets []string            `json:"imagePullSecrets,omitempty"`
}

type ContainerSummaryDTO struct {
	Name          string `json:"name"`
	Image         string `json:"image,omitempty"`
	CPURequest    string `json:"cpuRequest,omitempty"`
	CPULimit      string `json:"cpuLimit,omitempty"`
	MemoryRequest string `json:"memoryRequest,omitempty"`
	MemoryLimit   string `json:"memoryLimit,omitempty"`
}

type DeploymentSchedulingDTO struct {
	NodeSelector             map[string]string             `json:"nodeSelector,omitempty"`
	AffinitySummary          string                        `json:"affinitySummary,omitempty"`
	Tolerations              []TolerationDTO               `json:"tolerations,omitempty"`
	TopologySpreadConstraints []TopologySpreadConstraintDTO `json:"topologySpreadConstraints,omitempty"`
}

type DeploymentMetadataDTO struct {
	Labels      map[string]string `json:"labels,omitempty"`
	Annotations map[string]string `json:"annotations,omitempty"`
}

func GetDeploymentDetails(ctx context.Context, c *cluster.Clients, namespace, name string) (*DeploymentDetailsDTO, error) {
	dep, err := c.Clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	// YAML
	depCopy := dep.DeepCopy()
	depCopy.ManagedFields = nil
	b, err := json.Marshal(depCopy)
	if err != nil {
		return nil, err
	}
	y, err := yaml.JSONToYAML(b)
	if err != nil {
		return nil, err
	}

	now := time.Now()

	strategy := string(dep.Spec.Strategy.Type)
	if strategy == "" {
		strategy = "RollingUpdate"
	}

	selector := ""
	if dep.Spec.Selector != nil {
		if sel, err := metav1.LabelSelectorAsSelector(dep.Spec.Selector); err == nil {
			selector = sel.String()
		}
	}

	desired := int32(0)
	if dep.Spec.Replicas != nil {
		desired = *dep.Spec.Replicas
	}

	age := int64(0)
	if !dep.CreationTimestamp.IsZero() {
		age = int64(now.Sub(dep.CreationTimestamp.Time).Seconds())
	}

	summary := DeploymentSummaryDTO{
		Name:      dep.Name,
		Namespace: dep.Namespace,
		Strategy:  strategy,
		Selector:  selector,
		Desired:   desired,
		Current:   dep.Status.Replicas,
		Ready:     dep.Status.ReadyReplicas,
		Available: dep.Status.AvailableReplicas,
		UpToDate:  dep.Status.UpdatedReplicas,
		AgeSec:    age,
	}

	conditions := make([]DeploymentConditionDTO, 0, len(dep.Status.Conditions))
	var progressingCond *appsv1.DeploymentCondition
	var availableCond *appsv1.DeploymentCondition
	var failedCond *appsv1.DeploymentCondition
	for i := range dep.Status.Conditions {
		cond := dep.Status.Conditions[i]
		lt := int64(0)
		if !cond.LastTransitionTime.IsZero() {
			lt = cond.LastTransitionTime.Unix()
		}
		conditions = append(conditions, DeploymentConditionDTO{
			Type:               string(cond.Type),
			Status:             string(cond.Status),
			Reason:             cond.Reason,
			Message:            cond.Message,
			LastTransitionTime: lt,
		})
		switch cond.Type {
		case appsv1.DeploymentProgressing:
			progressingCond = &cond
		case appsv1.DeploymentAvailable:
			availableCond = &cond
		case appsv1.DeploymentReplicaFailure:
			failedCond = &cond
		}
	}

	progressDeadlineExceeded := progressingCond != nil &&
		progressingCond.Status == corev1.ConditionFalse &&
		progressingCond.Reason == "ProgressDeadlineExceeded"

	rolloutStart := conditionUpdateTime(progressingCond)
	rolloutComplete := int64(0)
	if availableCond != nil && availableCond.Status == corev1.ConditionTrue {
		rolloutComplete = conditionUpdateTime(availableCond)
	} else if progressingCond != nil && progressingCond.Reason == "NewReplicaSetAvailable" {
		rolloutComplete = conditionUpdateTime(progressingCond)
	}

	inProgress := desired > 0 &&
		(dep.Status.UpdatedReplicas < desired || dep.Status.ReadyReplicas < desired || dep.Status.Replicas < desired)

	warnings := []string{}
	if progressingCond != nil && progressingCond.Status == corev1.ConditionFalse && progressingCond.Message != "" {
		warnings = append(warnings, progressingCond.Message)
	}
	if failedCond != nil && failedCond.Message != "" {
		warnings = append(warnings, failedCond.Message)
	}

	missingReplicas := desired - dep.Status.UpdatedReplicas
	if missingReplicas < 0 {
		missingReplicas = 0
	}
	unavailableReplicas := desired - dep.Status.AvailableReplicas
	if unavailableReplicas < 0 {
		unavailableReplicas = 0
	}

	rollout := DeploymentRolloutDTO{
		CurrentRevision:          dep.Annotations["deployment.kubernetes.io/revision"],
		ObservedGeneration:       dep.Status.ObservedGeneration,
		Generation:               dep.Generation,
		ProgressDeadlineExceeded: progressDeadlineExceeded,
		LastRolloutStart:         rolloutStart,
		LastRolloutComplete:      rolloutComplete,
		InProgress:               inProgress,
		Warnings:                 warnings,
		MissingReplicas:          missingReplicas,
		UnavailableReplicas:      unavailableReplicas,
	}

	replicaSets, rsNameSet, err := listDeploymentReplicaSets(ctx, c, dep, selector)
	if err != nil {
		return nil, err
	}

	pods, err := listDeploymentPods(ctx, c, namespace, selector, rsNameSet)
	if err != nil {
		return nil, err
	}

	spec := DeploymentSpecDTO{
		PodTemplate: PodTemplateSummaryDTO{
			Containers:       mapContainerSummaries(dep.Spec.Template.Spec.Containers),
			InitContainers:   mapContainerSummaries(dep.Spec.Template.Spec.InitContainers),
			ImagePullSecrets: mapImagePullSecrets(dep.Spec.Template.Spec.ImagePullSecrets),
		},
		Scheduling: DeploymentSchedulingDTO{
			NodeSelector:             dep.Spec.Template.Spec.NodeSelector,
			AffinitySummary:          summarizeAffinity(dep.Spec.Template.Spec.Affinity),
			Tolerations:              mapTolerations(dep.Spec.Template.Spec.Tolerations),
			TopologySpreadConstraints: mapTopologySpread(dep.Spec.Template.Spec.TopologySpreadConstraints),
		},
		Volumes:  mapVolumes(dep.Spec.Template.Spec.Volumes),
		Metadata: DeploymentMetadataDTO{
			Labels:      dep.Spec.Template.Labels,
			Annotations: dep.Spec.Template.Annotations,
		},
	}

	return &DeploymentDetailsDTO{
		Summary:     summary,
		Conditions:  conditions,
		Rollout:     rollout,
		ReplicaSets: replicaSets,
		Pods:        pods,
		Spec:        spec,
		YAML:        string(y),
	}, nil
}

func conditionUpdateTime(cond *appsv1.DeploymentCondition) int64 {
	if cond == nil {
		return 0
	}
	if !cond.LastUpdateTime.IsZero() {
		return cond.LastUpdateTime.Unix()
	}
	if !cond.LastTransitionTime.IsZero() {
		return cond.LastTransitionTime.Unix()
	}
	return 0
}

func mapContainerSummaries(ctns []corev1.Container) []ContainerSummaryDTO {
	if len(ctns) == 0 {
		return nil
	}
	out := make([]ContainerSummaryDTO, 0, len(ctns))
	for _, c := range ctns {
		res := mapContainerResources(c.Resources)
		out = append(out, ContainerSummaryDTO{
			Name:          c.Name,
			Image:         c.Image,
			CPURequest:    res.CPURequest,
			CPULimit:      res.CPULimit,
			MemoryRequest: res.MemoryRequest,
			MemoryLimit:   res.MemoryLimit,
		})
	}
	return out
}

func listDeploymentReplicaSets(ctx context.Context, c *cluster.Clients, dep *appsv1.Deployment, selector string) ([]DeploymentReplicaSetDTO, map[string]struct{}, error) {
	listOpts := metav1.ListOptions{}
	if selector != "" {
		listOpts.LabelSelector = selector
	}
	rss, err := c.Clientset.AppsV1().ReplicaSets(dep.Namespace).List(ctx, listOpts)
	if err != nil {
		return nil, nil, err
	}

	now := time.Now()
	out := make([]DeploymentReplicaSetDTO, 0, len(rss.Items))
	rsNameSet := map[string]struct{}{}

	highestRevision := int32(0)
	for _, rs := range rss.Items {
		if !isReplicaSetOwnedBy(&rs, dep.UID) {
			continue
		}
		rev := parseRevision(rs.Annotations["deployment.kubernetes.io/revision"])
		if rev > highestRevision {
			highestRevision = rev
		}
	}

	for _, rs := range rss.Items {
		if !isReplicaSetOwnedBy(&rs, dep.UID) {
			continue
		}
		rsNameSet[rs.Name] = struct{}{}
		age := int64(0)
		if !rs.CreationTimestamp.IsZero() {
			age = int64(now.Sub(rs.CreationTimestamp.Time).Seconds())
		}
		rev := parseRevision(rs.Annotations["deployment.kubernetes.io/revision"])
		desired := int32(0)
		if rs.Spec.Replicas != nil {
			desired = *rs.Spec.Replicas
		}
		active := desired > 0 || rs.Status.Replicas > 0
		status := "Old"
		if active {
			status = "Active"
		} else if rev == highestRevision {
			status = "ScaledDown"
		}
		unhealthy := rs.Status.Replicas > 0 && rs.Status.ReadyReplicas < rs.Status.Replicas
		out = append(out, DeploymentReplicaSetDTO{
			Name:          rs.Name,
			Revision:      rev,
			Desired:       desired,
			Current:       rs.Status.Replicas,
			Ready:         rs.Status.ReadyReplicas,
			AgeSec:        age,
			Status:        status,
			IsActive:      active && rev == highestRevision,
			UnhealthyPods: unhealthy,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Revision == out[j].Revision {
			return out[i].Name < out[j].Name
		}
		return out[i].Revision > out[j].Revision
	})

	return out, rsNameSet, nil
}

func listDeploymentPods(ctx context.Context, c *cluster.Clients, namespace, selector string, rsNames map[string]struct{}) ([]DeploymentPodDTO, error) {
	listOpts := metav1.ListOptions{}
	if selector != "" {
		listOpts.LabelSelector = selector
	}
	pods, err := c.Clientset.CoreV1().Pods(namespace).List(ctx, listOpts)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]DeploymentPodDTO, 0, len(pods.Items))
	for _, p := range pods.Items {
		if !isPodOwnedByReplicaSet(&p, rsNames) {
			continue
		}

		var readyCount, totalCount int
		var restarts int32
		for _, cs := range p.Status.ContainerStatuses {
			totalCount++
			if cs.Ready {
				readyCount++
			}
			restarts += cs.RestartCount
		}
		age := int64(0)
		if !p.CreationTimestamp.IsZero() {
			age = int64(now.Sub(p.CreationTimestamp.Time).Seconds())
		}
		out = append(out, DeploymentPodDTO{
			Name:     p.Name,
			Phase:    string(p.Status.Phase),
			Ready:    fmtReady(readyCount, totalCount),
			Restarts: restarts,
			Node:     p.Spec.NodeName,
			AgeSec:   age,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		return out[i].Name < out[j].Name
	})
	return out, nil
}

func isReplicaSetOwnedBy(rs *appsv1.ReplicaSet, uid types.UID) bool {
	for _, ref := range rs.OwnerReferences {
		if ref.UID == uid && ref.Controller != nil && *ref.Controller {
			return true
		}
	}
	return false
}

func isPodOwnedByReplicaSet(pod *corev1.Pod, rsNames map[string]struct{}) bool {
	for _, ref := range pod.OwnerReferences {
		if ref.Kind == "ReplicaSet" {
			if _, ok := rsNames[ref.Name]; ok {
				return true
			}
		}
	}
	return false
}

func parseRevision(val string) int32 {
	if val == "" {
		return 0
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return 0
	}
	return int32(i)
}
