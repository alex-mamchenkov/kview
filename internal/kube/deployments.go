package kube

import (
	"context"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
)

type DeploymentDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Ready     string `json:"ready"`
	UpToDate  int32  `json:"upToDate"`
	Available int32  `json:"available"`
	Strategy  string `json:"strategy"`
	AgeSec    int64  `json:"ageSec"`
	LastEvent *EventBriefDTO `json:"lastEvent,omitempty"`
	Status    string `json:"status"`
}

func ListDeployments(ctx context.Context, c *cluster.Clients, namespace string) ([]DeploymentDTO, error) {
	deps, err := c.Clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	latestEvents, _ := LatestEventsByObject(ctx, c, namespace, "Deployment")

	now := time.Now()
	out := make([]DeploymentDTO, 0, len(deps.Items))
	for _, d := range deps.Items {
		var lastEvent *EventBriefDTO
		if ev, ok := latestEvents[d.Name]; ok {
			evCopy := ev
			lastEvent = &evCopy
		}

		desired := int32(0)
		if d.Spec.Replicas != nil {
			desired = *d.Spec.Replicas
		}

		age := int64(0)
		if !d.CreationTimestamp.IsZero() {
			age = int64(now.Sub(d.CreationTimestamp.Time).Seconds())
		}

		strategy := string(d.Spec.Strategy.Type)
		if strategy == "" {
			strategy = "RollingUpdate"
		}

		status := deploymentStatus(d, desired)

		out = append(out, DeploymentDTO{
			Name:      d.Name,
			Namespace: d.Namespace,
			Ready:     fmtReady(int(d.Status.AvailableReplicas), int(desired)),
			UpToDate:  d.Status.UpdatedReplicas,
			Available: d.Status.AvailableReplicas,
			Strategy:  strategy,
			AgeSec:    age,
			LastEvent: lastEvent,
			Status:    status,
		})
	}
	return out, nil
}

func deploymentStatus(d appsv1.Deployment, desired int32) string {
	if d.Spec.Paused {
		return "Paused"
	}
	if desired == 0 {
		return "ScaledDown"
	}

	available := false
	progressing := false
	for _, c := range d.Status.Conditions {
		switch c.Type {
		case appsv1.DeploymentAvailable:
			if c.Status == corev1.ConditionTrue {
				available = true
			}
		case appsv1.DeploymentProgressing:
			if c.Status == corev1.ConditionTrue {
				progressing = true
			}
		}
	}

	if available && d.Status.AvailableReplicas >= desired && desired > 0 {
		return "Available"
	}
	if progressing {
		return "Progressing"
	}
	return "Unknown"
}
