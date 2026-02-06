package kube

import (
	"context"
	"time"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"kview/internal/cluster"
)

type PodDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Node      string `json:"node,omitempty"`
	Phase     string `json:"phase"`
	Ready     string `json:"ready"`
	Restarts  int32  `json:"restarts"`
	AgeSec    int64  `json:"ageSec"`
	LastEvent *EventBriefDTO `json:"lastEvent,omitempty"`
}

func ListPods(ctx context.Context, c *cluster.Clients, namespace string) ([]PodDTO, error) {
	pods, err := c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	latestEvents, _ := LatestEventsByObject(ctx, c, namespace, "Pod")

	now := time.Now()
	out := make([]PodDTO, 0, len(pods.Items))
	for _, p := range pods.Items {
		var lastEvent *EventBriefDTO
		if ev, ok := latestEvents[p.Name]; ok {
			evCopy := ev
			lastEvent = &evCopy
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

		out = append(out, PodDTO{
			Name:      p.Name,
			Namespace: p.Namespace,
			Node:      p.Spec.NodeName,
			Phase:     string(p.Status.Phase),
			Ready:     fmtReady(readyCount, totalCount),
			Restarts:  restarts,
			AgeSec:    age,
			LastEvent: lastEvent,
		})
	}
	return out, nil
}

func fmtReady(ready, total int) string {
	if total == 0 {
		return "0/0"
	}
	return fmt.Sprintf("%d/%d", ready, total)
}

