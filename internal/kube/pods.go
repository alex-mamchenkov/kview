package kube

import (
	"context"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

func ListPods(ctx context.Context, c *cluster.Clients, namespace string) ([]dto.PodListItemDTO, error) {
	pods, err := c.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	latestEvents, _ := LatestEventsByObject(ctx, c, namespace, "Pod")

	now := time.Now()
	out := make([]dto.PodListItemDTO, 0, len(pods.Items))
	for _, p := range pods.Items {
		var lastEvent *dto.EventBriefDTO
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

		out = append(out, dto.PodListItemDTO{
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

